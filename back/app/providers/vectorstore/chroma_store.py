"""Chroma (embedded, persisted on disk) implementation of `VectorStore`.

The collection name includes the embedding model, so switching embedding
models never mixes vectors of different dimensions: a new collection is
created and re-ingested automatically.
"""

import asyncio
import re
from collections.abc import Sequence
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.domain.models import Chunk, RetrievedChunk


def collection_name_for(embedding_name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", embedding_name).strip("-").lower()
    return f"portfolio-{slug}"[:63]


class ChromaVectorStore:
    def __init__(self, path: Path, collection: str) -> None:
        path.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=str(path), settings=ChromaSettings(anonymized_telemetry=False)
        )
        self._name = collection
        self._collection = self._get_collection()

    def _get_collection(self):
        return self._client.get_or_create_collection(
            name=self._name,
            configuration={"hnsw": {"space": "cosine"}},
            embedding_function=None,  # we always pass our own embeddings
        )

    async def upsert(self, chunks: Sequence[Chunk], embeddings: Sequence[Sequence[float]]) -> None:
        def _do() -> None:
            self._collection.upsert(
                ids=[c.id for c in chunks],
                embeddings=[list(e) for e in embeddings],
                documents=[c.text for c in chunks],
                metadatas=[
                    {
                        "source": c.source,
                        "title": c.title,
                        "section": c.section or "",
                        "language": c.language or "",
                    }
                    for c in chunks
                ],
            )

        await asyncio.to_thread(_do)

    async def search(self, embedding: Sequence[float], k: int) -> list[RetrievedChunk]:
        res = await asyncio.to_thread(
            self._collection.query, query_embeddings=[list(embedding)], n_results=k
        )
        out: list[RetrievedChunk] = []
        for id_, doc, meta, dist in zip(
            res["ids"][0],
            res["documents"][0],
            res["metadatas"][0],
            res["distances"][0],
            strict=True,
        ):
            chunk = Chunk(
                id=id_,
                text=doc,
                source=str(meta.get("source", "")),
                title=str(meta.get("title", "")),
                section=str(meta.get("section") or "") or None,
                language=(str(meta.get("language") or "") or None),  # type: ignore[arg-type]
            )
            # Chroma cosine distance = 1 - cosine similarity.
            out.append(RetrievedChunk(chunk=chunk, score=1.0 - float(dist)))
        return out

    async def count(self) -> int:
        return await asyncio.to_thread(self._collection.count)

    async def reset(self) -> None:
        def _do() -> None:
            self._client.delete_collection(self._name)
            self._collection = self._get_collection()

        await asyncio.to_thread(_do)
