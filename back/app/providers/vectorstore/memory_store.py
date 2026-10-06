"""Dependency-free in-memory `VectorStore` (tests and quick experiments)."""

import math
from collections.abc import Sequence

from app.domain.models import Chunk, RetrievedChunk


def _cosine(a: Sequence[float], b: Sequence[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


class InMemoryVectorStore:
    def __init__(self) -> None:
        self._items: dict[str, tuple[Chunk, list[float]]] = {}

    async def upsert(self, chunks: Sequence[Chunk], embeddings: Sequence[Sequence[float]]) -> None:
        for c, e in zip(chunks, embeddings, strict=True):
            self._items[c.id] = (c, list(e))

    async def search(self, embedding: Sequence[float], k: int) -> list[RetrievedChunk]:
        scored = [RetrievedChunk(c, _cosine(embedding, e)) for c, e in self._items.values()]
        return sorted(scored, key=lambda r: r.score, reverse=True)[:k]

    async def count(self) -> int:
        return len(self._items)

    async def reset(self) -> None:
        self._items.clear()
