"""Application settings, loaded from environment variables / `.env`.

Every provider is selected here, so switching from local Ollama to a hosted
model in production is a configuration change, not a code change.
See docs/guides/cambiar-proveedor-llm.md.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

LLMProviderName = Literal["ollama", "openai", "anthropic"]
EmbeddingProviderName = Literal["ollama", "openai"]


class Settings(BaseSettings):
    # env_ignore_empty: a variable left empty (e.g. copied from .env.example)
    # falls back to the default below instead of overriding it with "".
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True
    )

    # --- App -----------------------------------------------------------------
    app_name: str = "Portfolio API"
    environment: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:3100"]
    )
    #: Extra origins as a regex. In development, the LAN is allowed by default so the
    #: site can be tested from a phone (http://192.168.x.x:3000). Set "" to disable.
    cors_origin_regex: str | None = None

    # --- Chat LLM ------------------------------------------------------------
    llm_provider: LLMProviderName = "ollama"
    llm_model: str = "qwen2.5:3b"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 400
    #: Optional cheaper/faster model for the scope classifier (defaults to llm_model).
    classifier_model: str | None = None

    # --- Embeddings ------------------------------------------------------------
    embedding_provider: EmbeddingProviderName = "ollama"
    embedding_model: str = "nomic-embed-text"
    #: Task prefixes some embedding models need. Unset = automatic: nomic-embed-*
    #: models get "search_query: " / "search_document: ", any other model none.
    embedding_query_prefix: str | None = None
    embedding_document_prefix: str | None = None

    # --- Provider endpoints / keys ---------------------------------------------
    ollama_base_url: str = "http://localhost:11434"
    #: Keep Ollama models loaded between requests (avoids reload latency).
    ollama_keep_alive: int = 1800  # seconds
    openai_api_key: str | None = None
    openai_base_url: str | None = None  # any OpenAI-compatible server (vLLM, Groq, …)
    anthropic_api_key: str | None = None

    # --- RAG -------------------------------------------------------------------
    knowledge_dir: Path = BASE_DIR / "knowledge"
    chroma_path: Path = BASE_DIR / "data" / "chroma"
    retrieval_top_k: int = 3
    #: Minimum cosine similarity for a chunk to count as relevant.
    retrieval_min_score: float = 0.62
    #: Minimum BM25 score for a keyword match to count as relevant.
    retrieval_lexical_min_score: float = 2.0
    #: Only used when the scope classifier is unavailable (error/timeout/unparseable):
    #: answer anyway if retrieval is this convincing (vector) AND has a strong keyword hit.
    #: Never overrides an explicit OFF_TOPIC: with small embedding models in-scope and
    #: off-topic similarities overlap almost completely (see docs/ARCHITECTURE.md).
    retrieval_override_score: float = 0.68
    #: Follow-ups with at most this many content words ("¿Y antes de eso?") are
    #: retrieved together with the previous user question.
    followup_max_terms: int = 2
    auto_ingest: bool = True

    # --- Guardrails ------------------------------------------------------------
    max_message_chars: int = 500
    max_history_turns: int = 6
    #: Simultaneous chats hitting the models; extra ones wait `chat_queue_seconds`
    #: and then get a canned "busy" reply instead of piling up on the model.
    max_concurrent_chats: int = 2
    chat_queue_seconds: float = 10
    #: Upper bound for one model call (classifier) and for a whole generation.
    llm_timeout_seconds: float = 120
    rate_limit_requests: int = 12
    rate_limit_window_seconds: int = 60

    # --- Public facts used in canned replies -----------------------------------
    contact_email: str = "laurarodrigohernando@gmail.com"

    @property
    def query_prefix(self) -> str:
        if self.embedding_query_prefix is not None:
            return self.embedding_query_prefix
        return "search_query: " if self.embedding_model.startswith("nomic-embed") else ""

    @property
    def document_prefix(self) -> str:
        if self.embedding_document_prefix is not None:
            return self.embedding_document_prefix
        return "search_document: " if self.embedding_model.startswith("nomic-embed") else ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
