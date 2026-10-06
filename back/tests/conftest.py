from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.container import assemble
from app.main import create_app
from app.providers.vectorstore import InMemoryVectorStore

from .fakes import FakeLLM, HashEmbeddings, KeywordClassifier

KNOWLEDGE = Path(__file__).resolve().parents[1] / "knowledge"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        environment="test",
        knowledge_dir=KNOWLEDGE,
        auto_ingest=True,
        # Hashed bag-of-words similarities are lower than real embeddings.
        retrieval_min_score=0.2,
        retrieval_override_score=0.9,
        rate_limit_requests=100,
        _env_file=None,  # ignore the developer's .env
    )


@pytest.fixture
def llm() -> FakeLLM:
    return FakeLLM()


@pytest.fixture
def container(settings, llm):
    return assemble(
        settings,
        llm=llm,
        classifier=KeywordClassifier(),
        embeddings=HashEmbeddings(),
        store=InMemoryVectorStore(),
    )


@pytest.fixture
def client(container):
    app = create_app(container=container)
    with TestClient(app) as c:  # runs lifespan → ingestion
        yield c
