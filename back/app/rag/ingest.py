"""Knowledge-base ingestion.

    uv run python -m app.rag.ingest            # ingest if the KB changed
    uv run python -m app.rag.ingest --reset    # force full re-index

The API also calls `ensure_index` on startup when AUTO_INGEST=true. A
fingerprint of the KB is stored next to the index, so edits to
`knowledge/` are picked up automatically on the next start.
"""

import argparse
import asyncio
import logging
from pathlib import Path

from app.domain.ports import EmbeddingProvider, VectorStore

from .knowledge_loader import fingerprint, load_chunks

log = logging.getLogger(__name__)


async def ensure_index(
    *,
    knowledge_dir: Path,
    store: VectorStore,
    embeddings: EmbeddingProvider,
    marker: Path | None,
    force: bool = False,
) -> int:
    """(Re)build the index if empty, forced, or the KB changed. Returns #chunks indexed."""
    chunks = load_chunks(knowledge_dir)
    fp = fingerprint(chunks)
    current = marker.read_text().strip() if marker and marker.exists() else None

    if not force and current == fp and await store.count() == len(chunks):
        log.info("Knowledge index up to date (%d chunks, %s)", len(chunks), fp)
        return 0

    log.info("Indexing %d chunks with %s …", len(chunks), embeddings.name)
    # Embed first: if the provider fails (quota, network), the old index survives.
    vectors = await embeddings.embed_documents([c.text for c in chunks])
    await store.reset()
    await store.upsert(chunks, vectors)
    if marker:
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(fp)
    log.info("Indexed %d chunks (%s)", len(chunks), fp)
    return len(chunks)


async def _main(reset: bool) -> None:
    from app.core.config import get_settings
    from app.core.container import build_container
    from app.core.logging import configure_logging

    settings = get_settings()
    configure_logging(settings.log_level)
    c = build_container(settings)
    n = await ensure_index(
        knowledge_dir=settings.knowledge_dir,
        store=c.store,
        embeddings=c.embeddings,
        marker=c.index_marker,
        force=reset,
    )
    print(f"Done. {n} chunks indexed." if n else "Nothing to do: index up to date.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="force full re-index")
    asyncio.run(_main(parser.parse_args().reset))
