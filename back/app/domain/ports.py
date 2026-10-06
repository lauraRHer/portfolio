"""Ports (interfaces) of the hexagonal architecture.

The RAG pipeline only depends on these protocols. Concrete adapters live in
`app/providers/*` and are chosen at startup from settings, which is what
makes the backend model-agnostic: Ollama locally, OpenAI/Anthropic/any
OpenAI-compatible server in production.
"""

from collections.abc import AsyncIterator, Sequence
from typing import Protocol, runtime_checkable

from .models import Chunk, Message, RetrievedChunk


@runtime_checkable
class LLMProvider(Protocol):
    """A chat model."""

    #: Human-readable id, e.g. "ollama:qwen2.5:3b" (logged and exposed in /health).
    name: str

    async def complete(self, messages: Sequence[Message]) -> str:
        """Return the full answer (used for short calls like classification)."""
        ...

    def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        """Yield the answer token by token."""
        ...


@runtime_checkable
class EmbeddingProvider(Protocol):
    name: str

    async def embed_documents(self, texts: Sequence[str]) -> list[list[float]]: ...

    async def embed_query(self, text: str) -> list[float]: ...


@runtime_checkable
class VectorStore(Protocol):
    async def upsert(
        self, chunks: Sequence[Chunk], embeddings: Sequence[Sequence[float]]
    ) -> None: ...

    async def search(self, embedding: Sequence[float], k: int) -> list[RetrievedChunk]: ...

    async def count(self) -> int: ...

    async def reset(self) -> None: ...
