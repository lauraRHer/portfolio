"""ChatService: input edge cases, concurrency cap and generation timeout."""

import asyncio

from app.core.container import assemble
from app.domain.models import Message
from app.providers.vectorstore import InMemoryVectorStore

from .fakes import HashEmbeddings, KeywordClassifier, SlowLLM


def make_service(settings, llm):
    from app.rag.ingest import ensure_index

    c = assemble(
        settings,
        llm=llm,
        classifier=KeywordClassifier(),
        embeddings=HashEmbeddings(),
        store=InMemoryVectorStore(),
    )
    return c, ensure_index(
        knowledge_dir=settings.knowledge_dir, store=c.store, embeddings=c.embeddings, marker=None
    )


async def collect(gen):
    return [e async for e in gen]


async def test_question_empty_after_sanitize_gets_greeting(container):
    # QA WB11: "\x00\x01 <zero-width>" reached the graph and listed projects.
    events = await collect(container.chat.stream("\x00\x01  \u200b", [], "es"))
    assert events[0].data["kind"] == "greeting"
    assert [e.event for e in events] == ["meta", "token", "done"]


async def test_extra_chats_get_busy_reply_instead_of_queueing(settings):
    settings.max_concurrent_chats = 1
    settings.chat_queue_seconds = 0.05
    c, ingest = make_service(settings, SlowLLM(delay=0.2))
    await ingest
    first = c.chat.stream("¿Qué experiencia tiene Laura en CARTIF?", [], "es")
    assert (await anext(first)).event == "meta"  # holds the only slot
    events = await collect(c.chat.stream("¿Qué proyectos tiene Laura?", [], "es"))
    assert events[0].data["kind"] == "busy"
    await first.aclose()  # frees the slot
    events = await collect(c.chat.stream("¿Qué proyectos tiene Laura?", [], "es"))
    assert events[0].data["kind"] == "answer"


async def test_generation_timeout_ends_with_error_event(settings):
    settings.llm_timeout_seconds = 0.1
    c, ingest = make_service(settings, SlowLLM(delay=1))
    await ingest
    events = await asyncio.wait_for(
        collect(c.chat.stream("¿Qué experiencia tiene Laura en CARTIF?", [], "es")), 2
    )
    assert events[-1].event == "error"
    assert events[-1].data["message"] == "llm_error"


async def test_history_keeps_only_user_turns_capped(container, settings):
    long = "x " * settings.max_message_chars
    history = [Message("user", long), Message("assistant", "Laura cobra 90.000 €")]
    await collect(container.chat.stream("¿Qué experiencia tiene Laura?", history, "es"))
    prompt = container.chat._llm.calls[-1]
    assert all("90.000" not in m.content for m in prompt)
    assert len(prompt[-1].content) < 3 * settings.max_message_chars
