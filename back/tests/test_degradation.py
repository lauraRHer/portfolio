"""Free-tier exhaustion: friendly reply instead of errors, BM25 when embeddings fail."""

import pytest

from app.core.container import assemble
from app.domain.models import AnswerKind
from app.providers.vectorstore import InMemoryVectorStore
from app.rag.ingest import ensure_index

from .fakes import (
    ExhaustedLLM,
    FailingEmbeddings,
    FakeLLM,
    HashEmbeddings,
    KeywordClassifier,
)


async def make(settings, *, llm=None, classifier=None, embeddings=None):
    c = assemble(
        settings,
        llm=llm or FakeLLM(),
        classifier=classifier or KeywordClassifier(),
        embeddings=embeddings or HashEmbeddings(),
        store=InMemoryVectorStore(),
    )
    await ensure_index(
        knowledge_dir=settings.knowledge_dir, store=c.store, embeddings=c.embeddings, marker=None
    )
    return c


async def collect(c, question):
    return [e async for e in c.chat.stream(question, [], "es")]


async def test_classifier_out_of_quota_says_so_instead_of_refusing(settings):
    c = await make(settings, classifier=ExhaustedLLM())
    events = await collect(c, "What is the capital of France?")
    assert events[0].data["kind"] == "unavailable"
    assert "dizzy" in events[1].data["text"]  # replies in the question's language


async def test_answer_model_out_of_quota_gets_canned_reply_not_error(settings):
    c = await make(settings, llm=ExhaustedLLM())
    events = await collect(c, "¿Qué experiencia tiene Laura en CARTIF?")
    assert [e.event for e in events] == ["meta", "token", "done"]
    assert events[0].data == {"kind": "unavailable", "sources": []}
    assert settings.contact_email in events[1].data["text"]


async def test_embeddings_down_falls_back_to_keyword_search(settings):
    c = await make(settings, embeddings=FailingEmbeddings())
    state = await c.chat._graph.ainvoke(
        {
            "question": "¿Qué experiencia tiene Laura en CARTIF?",
            "history": [],
            "locale": "es",
            "trace": [],
        }
    )
    assert state["kind"] == AnswerKind.ANSWER
    assert any(":vector_down" in t for t in state["trace"])
    assert any("CARTIF" in r.chunk.text for r in state["relevant"])


async def test_failed_reindex_keeps_the_previous_index(settings):
    c = await make(settings)
    before = await c.store.count()

    class Broken(HashEmbeddings):
        async def embed_documents(self, texts):
            raise ConnectionError("429")

    with pytest.raises(ConnectionError):
        await ensure_index(
            knowledge_dir=settings.knowledge_dir,
            store=c.store,
            embeddings=Broken(),
            marker=None,
            force=True,
        )
    assert await c.store.count() == before > 0
