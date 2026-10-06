from app.rag.knowledge_loader import fingerprint, load_chunks, parse_markdown, split_sections
from app.rag.lexical import BM25Index

from .conftest import KNOWLEDGE


def test_parse_markdown_frontmatter():
    meta, body = parse_markdown("---\ntitle: T\nsection: core\n---\n## A\ntext")
    assert meta == {"title": "T", "section": "core"}
    assert split_sections(body) == [("A", "text")]


def test_knowledge_base_is_bilingual_and_well_formed():
    chunks = load_chunks(KNOWLEDGE)
    assert chunks, "knowledge base must not be empty"
    assert {c.language for c in chunks} == {"es", "en"}
    assert all(c.section for c in chunks), "every file needs a `section` in its frontmatter"
    assert len({c.id for c in chunks}) == len(chunks), "chunk ids must be unique"


def test_fingerprint_changes_with_content():
    chunks = load_chunks(KNOWLEDGE)
    assert fingerprint(chunks) == fingerprint(chunks)
    assert fingerprint(chunks) != fingerprint(chunks[:-1])


def test_bm25_finds_spanish_keyword_matches():
    index = BM25Index(load_chunks(KNOWLEDGE))
    top_chunk, _ = index.search("¿Dónde estudió?", k=1)[0]
    assert top_chunk.section == "learning"
