"""LangGraph pipeline that decides HOW to answer (not the streaming itself).

    START → guard ─┬─(injection / greeting)───────────────→ END  (refusal | greeting)
                   └─→ classify ─┐
                   └─→ retrieve ─┴→ decide → END  (answer | greeting | refusal | no_info)

`classify` (LLM scope router) and `retrieve` (hybrid search: vectors + BM25,
fused with Reciprocal Rank Fusion) run in parallel. If the embedding provider
fails (e.g. free-tier quota), `retrieve` degrades to BM25 only. `decide` combines both signals:
  - GREETING                                   → canned greeting
  - OFF_TOPIC                                  → refusal
    (unless the guard saw a skill question about Laura, e.g. "¿Laura sabe X?")
  - classifier unavailable and retrieval weak  → refusal, or "I'm out of
    steam today" if no model has quota left (a refusal would blame the visitor)
  - no chunk above the relevance threshold     → "I don't have that info"
  - otherwise                                  → answer prompt for the LLM

The final generation is streamed by ChatService, outside the graph, so
tokens reach the browser as soon as the model produces them.
"""

import asyncio
import logging
import operator
import time
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph

from app.core.config import Settings
from app.domain.models import AnswerKind, Language, Message, RetrievedChunk, Scope
from app.domain.ports import EmbeddingProvider, LLMProvider, LLMUnavailableError, VectorStore

from . import guardrails, prompts
from .lexical import BM25Index, tokenize

log = logging.getLogger(__name__)


class ChatState(TypedDict, total=False):
    # input
    question: str
    history: list[Message]
    locale: Language
    # derived
    language: Language
    scope: Scope | None
    #: The classifier had no model left to call (every quota used up).
    llm_unavailable: bool
    #: Deterministic hint that the question is about Laura (overrides OFF_TOPIC).
    about_laura: bool
    retrieved: list[RetrievedChunk]
    #: Best cosine similarity / BM25 score among hits (fallback signals for `decide`).
    best_vector: float
    best_lexical: float
    # output
    kind: AnswerKind
    relevant: list[RetrievedChunk]
    prompt: list[Message]
    trace: Annotated[list[str], operator.add]  # debug breadcrumbs (parallel-safe)


def parse_scope(raw: str) -> Scope | None:
    upper = raw.strip().upper()
    for scope in (Scope.OFF_TOPIC, Scope.GREETING, Scope.PORTFOLIO):
        if scope.value in upper or scope.value.replace("_", " ") in upper:
            return scope
    return None


def build_chat_graph(
    *,
    settings: Settings,
    classifier: LLMProvider,
    embeddings: EmbeddingProvider,
    store: VectorStore,
    lexical: BM25Index,
):
    async def guard(state: ChatState) -> ChatState:
        language = guardrails.detect_language(state["question"], fallback=state.get("locale", "es"))
        if guardrails.looks_like_injection(state["question"]):
            return {"language": language, "kind": AnswerKind.REFUSAL, "trace": ["guard:injection"]}
        if guardrails.looks_like_roleplay(state["question"]):
            return {"language": language, "kind": AnswerKind.REFUSAL, "trace": ["guard:roleplay"]}
        if guardrails.is_plain_greeting(state["question"]):
            return {"language": language, "kind": AnswerKind.GREETING, "trace": ["guard:greeting"]}
        about = guardrails.is_about_laura(state["question"])
        trace = "guard:ok:about_laura" if about else "guard:ok"
        return {"language": language, "about_laura": about, "trace": [trace]}

    async def classify(state: ChatState) -> ChatState:
        t0 = time.perf_counter()
        try:
            raw = await asyncio.wait_for(
                classifier.complete(
                    prompts.classifier_messages(state["question"], state.get("history", []))
                ),
                timeout=settings.llm_timeout_seconds,
            )
            scope = parse_scope(raw)
        except LLMUnavailableError:
            log.warning("Scope classifier: no model available")
            elapsed = time.perf_counter() - t0
            return {
                "scope": None,
                "llm_unavailable": True,
                "trace": [f"classify:UNAVAILABLE:{elapsed:.1f}s"],
            }
        except Exception:
            log.exception("Scope classifier failed")
            scope = None
        # Unknown scope (model down, timeout or unparseable output) is NOT trusted as
        # in-scope: `decide` will only answer if retrieval is very convincing.
        label = scope.value if scope else "UNKNOWN"
        return {"scope": scope, "trace": [f"classify:{label}:{time.perf_counter() - t0:.1f}s"]}

    async def retrieve(state: ChatState) -> ChatState:
        t0 = time.perf_counter()
        question = state["question"]
        # Short follow-ups ("¿Y antes de eso?") have nothing to search with on their
        # own: search together with the visitor's previous question.
        earlier = prompts.previous_questions(state.get("history", []))
        if earlier and len(tokenize(question)) <= settings.followup_max_terms:
            question = f"{earlier[-1]} {question}"
        k = settings.retrieval_top_k
        vector_down = ""
        try:
            vector = await asyncio.wait_for(
                embeddings.embed_query(question), settings.embedding_timeout_seconds
            )
            vec_hits = await store.search(vector, k=k * 2)
        except Exception:
            # Hosted embeddings have quotas too: keyword search alone still finds
            # most answers (names, technologies, companies) instead of failing.
            log.exception("Vector search failed: using BM25 only")
            vec_hits, vector_down = [], ":vector_down"
        lex_hits = lexical.search(question, k=k * 2)

        # Reciprocal Rank Fusion: robust way to merge rankings with different score scales.
        fused: dict[str, float] = {}
        chunks = {}
        for rank, r in enumerate(vec_hits):
            fused[r.chunk.id] = fused.get(r.chunk.id, 0) + 1 / (60 + rank)
            chunks[r.chunk.id] = r
        for rank, (chunk, _) in enumerate(lex_hits):
            fused[chunk.id] = fused.get(chunk.id, 0) + 1 / (60 + rank)
            chunks.setdefault(chunk.id, RetrievedChunk(chunk, 0.0))

        # A chunk is relevant if either retriever is confident about it.
        vec_score = {r.chunk.id: r.score for r in vec_hits}
        lex_score = {c.id: s for c, s in lex_hits}
        language = state.get("language", "es")
        # A keyword that appears in many chunks (e.g. "LangGraph") has a low IDF; for
        # questions that are clearly about Laura, a weaker keyword match is enough.
        lex_min = settings.retrieval_lexical_min_score
        if state.get("about_laura"):
            lex_min /= 2

        def relevant(cid: str) -> bool:
            return (
                vec_score.get(cid, 0) >= settings.retrieval_min_score
                or lex_score.get(cid, 0) >= lex_min
            )

        ranked = sorted(
            (cid for cid in fused if relevant(cid)),
            # Prefer chunks in the question's language (the KB is duplicated ES/EN).
            key=lambda cid: fused[cid] + (0.002 if chunks[cid].chunk.language == language else 0),
            reverse=True,
        )
        top = [chunks[cid] for cid in ranked[:k]]
        best = vec_hits[0].score if vec_hits else 0.0
        best_lex = lex_hits[0][1] if lex_hits else 0.0
        elapsed = time.perf_counter() - t0
        followup = ":followup" if question != state["question"] else ""
        return {
            "retrieved": top,
            "best_vector": best,
            "best_lexical": best_lex,
            "trace": [
                f"retrieve:best={best:.2f}:hits={len(top)}{followup}{vector_down}:{elapsed:.1f}s"
            ],
        }

    async def decide(state: ChatState) -> ChatState:
        relevant = state.get("retrieved", [])
        scope = state.get("scope")
        about_laura = state.get("about_laura", False)

        if scope == Scope.GREETING:
            return {"kind": AnswerKind.GREETING, "relevant": [], "trace": ["decide:greeting"]}
        # Retrieval scores can't tell "¿Qué es RAG en general?" from a real question
        # (both ~0.7 with small embedding models), so they never override OFF_TOPIC.
        refuse = scope == Scope.OFF_TOPIC and not about_laura
        if scope is None and not about_laura:
            convincing = (
                state.get("best_vector", 0.0) >= settings.retrieval_override_score
                and state.get("best_lexical", 0.0) >= 2 * settings.retrieval_lexical_min_score
            )
            refuse = not convincing
        if refuse and state.get("llm_unavailable"):
            # Not the visitor's fault: the question may be fine, we're just out of quota.
            return {"kind": AnswerKind.UNAVAILABLE, "relevant": [], "trace": ["decide:unavailable"]}
        if refuse:
            return {"kind": AnswerKind.REFUSAL, "relevant": [], "trace": ["decide:refusal"]}
        if not relevant:
            return {"kind": AnswerKind.NO_INFO, "relevant": [], "trace": ["decide:no_info"]}

        prompt = prompts.answer_messages(
            state["question"],
            state.get("history", [])[-settings.max_history_turns :],
            relevant,
            state["language"],
            settings.contact_email,
        )
        return {
            "kind": AnswerKind.ANSWER,
            "relevant": relevant,
            "prompt": prompt,
            "trace": ["decide:answer"],
        }

    def after_guard(state: ChatState) -> list[str] | str:
        return END if state.get("kind") else ["classify", "retrieve"]

    graph = StateGraph(ChatState)
    graph.add_node("guard", guard)
    graph.add_node("classify", classify)
    graph.add_node("retrieve", retrieve)
    graph.add_node("decide", decide)

    graph.add_edge(START, "guard")
    graph.add_conditional_edges("guard", after_guard, ["classify", "retrieve", END])
    graph.add_edge(["classify", "retrieve"], "decide")  # join: waits for both
    graph.add_edge("decide", END)
    return graph.compile()
