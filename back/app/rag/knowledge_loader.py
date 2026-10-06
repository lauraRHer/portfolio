"""Loads `knowledge/<lang>/*.md` and splits it into chunks.

Format (see knowledge/README.md):
    ---
    title: Experience
    section: experience
    ---
    ## Heading      ← every `##` block becomes one chunk
    text...
"""

import hashlib
import re
from pathlib import Path

import yaml

from app.domain.models import Chunk

_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_H2 = re.compile(r"^##\s+(.+)$", re.MULTILINE)


def parse_markdown(text: str) -> tuple[dict, str]:
    match = _FRONTMATTER.match(text)
    if not match:
        return {}, text
    return yaml.safe_load(match.group(1)) or {}, text[match.end() :]


def split_sections(body: str) -> list[tuple[str, str]]:
    """Return (heading, content) pairs for each `##` block."""
    matches = list(_H2.finditer(body))
    sections = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        content = body[m.end() : end].strip()
        if content:
            sections.append((m.group(1).strip(), content))
    return sections


def load_chunks(knowledge_dir: Path) -> list[Chunk]:
    chunks: list[Chunk] = []
    for path in sorted(knowledge_dir.glob("*/*.md")):
        language = path.parent.name if path.parent.name in ("es", "en") else None
        meta, body = parse_markdown(path.read_text(encoding="utf-8"))
        doc_title = str(meta.get("title", path.stem))
        section = meta.get("section") or None
        for i, (heading, content) in enumerate(split_sections(body)):
            chunks.append(
                Chunk(
                    id=f"{language}:{path.stem}:{i}",
                    # Heading is embedded too: it carries most of the meaning.
                    text=f"{doc_title} — {heading}\n{content}",
                    source=path.stem,
                    title=doc_title,
                    section=section,
                    language=language,  # type: ignore[arg-type]
                )
            )
    return chunks


def fingerprint(chunks: list[Chunk]) -> str:
    """Stable hash of the knowledge base, used to detect changes and re-ingest."""
    h = hashlib.sha256()
    for c in chunks:
        h.update(c.id.encode())
        h.update(c.text.encode())
    return h.hexdigest()[:16]
