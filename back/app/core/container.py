"""Composition root: the only place that knows concrete adapters.

Tests build their own Container with fakes (see tests/conftest.py).
"""

from dataclasses import dataclass
from pathlib import Path

from app.core.config import Settings
from app.domain.ports import EmbeddingProvider, LLMProvider, VectorStore
from app.providers.embeddings import build_embeddings
from app.providers.llm import build_classifier_llm, build_llm
from app.providers.vectorstore import ChromaVectorStore
from app.providers.vectorstore.chroma_store import collection_name_for
from app.rag.graph import build_chat_graph
from app.rag.knowledge_loader import load_chunks
from app.rag.lexical import BM25Index
from app.rag.service import ChatService

from .rate_limit import RateLimiter


@dataclass
class Container:
    settings: Settings
    llm: LLMProvider
    classifier: LLMProvider
    embeddings: EmbeddingProvider
    store: VectorStore
    chat: ChatService
    rate_limiter: RateLimiter
    #: File storing the KB fingerprint (None = never skip ingestion).
    index_marker: Path | None = None


def assemble(
    settings: Settings,
    *,
    llm: LLMProvider,
    classifier: LLMProvider,
    embeddings: EmbeddingProvider,
    store: VectorStore,
    index_marker: Path | None = None,
) -> Container:
    graph = build_chat_graph(
        settings=settings,
        classifier=classifier,
        embeddings=embeddings,
        store=store,
        lexical=BM25Index(load_chunks(settings.knowledge_dir)),
    )
    return Container(
        settings=settings,
        llm=llm,
        classifier=classifier,
        embeddings=embeddings,
        store=store,
        chat=ChatService(settings=settings, graph=graph, llm=llm),
        rate_limiter=RateLimiter(settings.rate_limit_requests, settings.rate_limit_window_seconds),
        index_marker=index_marker,
    )


def build_container(settings: Settings) -> Container:
    embeddings = build_embeddings(settings)
    collection = collection_name_for(embeddings.name)
    return assemble(
        settings,
        llm=build_llm(settings),
        classifier=build_classifier_llm(settings),
        embeddings=embeddings,
        store=ChromaVectorStore(settings.chroma_path, collection),
        index_marker=settings.chroma_path / f"{collection}.fingerprint",
    )
