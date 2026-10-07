"""ChatService: runs the decision graph, then streams the answer as events."""

import asyncio
import logging
import time
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Any

from app.core.config import Settings
from app.domain.models import AnswerKind, Language, Message, RetrievedChunk
from app.domain.ports import LLMProvider, LLMUnavailableError

from . import guardrails

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ChatEvent:
    """One SSE event: `meta` → `token`* → `done` | `error`."""

    event: str
    data: dict[str, Any]


def _sources(chunks: Sequence[RetrievedChunk]) -> list[dict[str, str | None]]:
    seen: set[str] = set()
    out = []
    for r in chunks:
        if r.chunk.source in seen:
            continue
        seen.add(r.chunk.source)
        out.append({"id": r.chunk.source, "title": r.chunk.title, "section": r.chunk.section})
    return out


class ChatService:
    def __init__(self, *, settings: Settings, graph, llm: LLMProvider) -> None:
        self._settings = settings
        self._graph = graph
        self._llm = llm
        # The model is the bottleneck (a local 3B handles one request at a time):
        # cap simultaneous chats instead of letting requests pile up on it.
        self._slots = asyncio.Semaphore(settings.max_concurrent_chats)

    def _canned(self, kind: AnswerKind, language: Language) -> list[ChatEvent]:
        text = guardrails.canned_reply(kind, language, self._settings.contact_email)
        return [
            ChatEvent("meta", {"kind": kind.value, "sources": []}),
            ChatEvent("token", {"text": text}),
            ChatEvent("done", {}),
        ]

    async def stream(
        self, question: str, history: Sequence[Message], locale: Language
    ) -> AsyncIterator[ChatEvent]:
        limit = self._settings.max_message_chars
        question = guardrails.sanitize(question, limit)
        if not question:  # only control/invisible characters
            for event in self._canned(AnswerKind.GREETING, locale):
                yield event
            return
        # Only the visitor's own (sanitized, capped) questions are kept: see
        # prompts.previous_questions for why assistant turns are dropped.
        history = [
            Message("user", text)
            for m in history
            if m.role == "user" and (text := guardrails.sanitize(m.content, limit))
        ]

        try:
            await asyncio.wait_for(self._slots.acquire(), self._settings.chat_queue_seconds)
        except TimeoutError:
            log.warning("chat kind=busy")
            for event in self._canned(AnswerKind.BUSY, locale):
                yield event
            return
        try:
            async for event in self._answer(question, history, locale):
                yield event
        finally:
            self._slots.release()

    async def _answer(
        self, question: str, history: list[Message], locale: Language
    ) -> AsyncIterator[ChatEvent]:
        try:
            state = await self._graph.ainvoke(
                {"question": question, "history": list(history), "locale": locale, "trace": []}
            )
        except Exception:
            log.exception("Chat graph failed")
            yield ChatEvent("error", {"message": "pipeline_error"})
            return

        kind: AnswerKind = state["kind"]
        language: Language = state.get("language", locale)
        if self._settings.log_questions:
            # %r escapes newlines: a question cannot forge extra log lines
            log.info(
                "chat kind=%s lang=%s q=%r trace=%s", kind, language, question, state.get("trace")
            )
        else:
            log.info("chat kind=%s lang=%s trace=%s", kind, language, state.get("trace"))

        if kind != AnswerKind.ANSWER:
            for event in self._canned(kind, language):
                yield event
            return

        t0, first = time.perf_counter(), None
        deadline = t0 + self._settings.llm_timeout_seconds
        tokens = aiter(self._llm.stream(state["prompt"]))
        try:
            while True:
                try:
                    token = await asyncio.wait_for(anext(tokens), deadline - time.perf_counter())
                except StopAsyncIteration:
                    break
                if first is None:
                    first = time.perf_counter() - t0
                    # `meta` waits for the first token: until then the answer could
                    # still turn into the "out of quota" canned reply.
                    sources = _sources(state.get("relevant", []))
                    yield ChatEvent("meta", {"kind": kind.value, "sources": sources})
                yield ChatEvent("token", {"text": token})
        except LLMUnavailableError:
            if first is not None:  # pragma: no cover - fallback only switches before 1st token
                yield ChatEvent("error", {"message": "llm_error"})
                return
            log.warning("chat kind=unavailable (no model left)")
            for event in self._canned(AnswerKind.UNAVAILABLE, language):
                yield event
            return
        except Exception:
            log.exception("LLM streaming failed")
            if first is None:
                yield ChatEvent("meta", {"kind": kind.value, "sources": []})
            yield ChatEvent("error", {"message": "llm_error"})
            return
        if first is None:  # empty answer: keep the protocol (meta always comes first)
            yield ChatEvent("meta", {"kind": kind.value, "sources": []})
        log.info("generation first_token=%.1fs total=%.1fs", first or 0, time.perf_counter() - t0)
        yield ChatEvent("done", {})
