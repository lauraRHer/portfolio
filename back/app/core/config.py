"""Application settings, loaded from environment variables / `.env`.

Every provider is selected here, so switching from local Ollama to a hosted
model in production is a configuration change, not a code change.
See docs/guides/cambiar-proveedor-llm.md.
"""

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Literal, get_args
from urllib.parse import parse_qsl

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

#: groq, gemini and openrouter are OpenAI-compatible presets (base URL + their own key).
LLMProviderName = Literal["ollama", "openai", "anthropic", "groq", "gemini", "openrouter"]
EmbeddingProviderName = Literal["ollama", "openai", "gemini"]

#: Per-model options accepted after "?" in a chain entry.
_MODEL_OPTIONS = {"reasoning_effort"}


@dataclass(frozen=True)
class ModelSpec:
    provider: LLMProviderName
    model: str
    options: dict[str, str] = field(default_factory=dict, compare=False, hash=False)

    @property
    def name(self) -> str:
        return f"{self.provider}:{self.model}"


def parse_chain(raw: str) -> list[ModelSpec]:
    """`"groq:openai/gpt-oss-120b?reasoning_effort=low, gemini:gemini-3.5-flash-lite"` → specs.

    Only the first ":" separates provider and model, so model ids with colons
    (`qwen2.5:3b`, `…:free`) work as they are.
    """
    specs = []
    for item in (part.strip() for part in raw.split(",")):
        if not item:
            continue
        ref, _, query = item.partition("?")
        provider, sep, model = (x.strip() for x in ref.partition(":"))
        if not sep or not model or provider not in get_args(LLMProviderName):
            raise ValueError(
                f"Invalid model {item!r}: expected provider:model, "
                f"provider one of {', '.join(get_args(LLMProviderName))}"
            )
        options = dict(parse_qsl(query))
        if unknown := set(options) - _MODEL_OPTIONS:
            raise ValueError(f"Unknown option(s) {sorted(unknown)} in {item!r}")
        specs.append(ModelSpec(provider, model, options))  # type: ignore[arg-type]
    if not specs:
        raise ValueError("Empty model chain")
    return specs


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
    #: Write each visitor question (sanitized, without IP) to the chat log line, to see
    #: what people ask and what the knowledge base is missing.
    log_questions: bool = True
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
    #: Fallback chain "provider:model, provider:model, …" (overrides LLM_PROVIDER/LLM_MODEL).
    #: Tried in order: a model that hits its rate limit or daily quota, fails or
    #: doesn't start answering in time is skipped for a while and the next one answers.
    #: That is what makes free tiers usable in production. See docs/guides/cambiar-proveedor-llm.md.
    llm_chain: str | None = None
    #: Chain for the scope classifier. Empty = LLM_CHAIN (or CLASSIFIER_MODEL if set).
    classifier_chain: str | None = None
    #: The classifier only replies with a label. Reasoning models spend tokens thinking
    #: first and need more (or `?reasoning_effort=none|low` in the chain entry).
    classifier_max_tokens: int = 8
    #: Longest wait for a model's first token before moving on to the next one in the
    #: chain. The last model left is never cut short (LLM_TIMEOUT_SECONDS still bounds it).
    llm_attempt_timeout_seconds: float = 20
    #: How long a model that failed is skipped, by cause of the failure.
    llm_cooldown_rate_limit_seconds: float = 60  # per-minute limit without Retry-After
    llm_cooldown_quota_seconds: float = 3600  # daily quota, invalid key, model removed
    llm_cooldown_error_seconds: float = 30  # server error, network error, timeout

    # --- Embeddings ------------------------------------------------------------
    embedding_provider: EmbeddingProviderName = "ollama"
    embedding_model: str = "nomic-embed-text"
    #: Task prefixes some embedding models need. Unset = automatic: nomic-embed-*
    #: models get "search_query: " / "search_document: ", any other model none.
    embedding_query_prefix: str | None = None
    embedding_document_prefix: str | None = None
    #: Output size for models that support it (gemini-embedding-001: 3072 by default,
    #: 768 keeps the index small with almost the same quality). Unset = model default.
    embedding_dimensions: int | None = None
    #: Upper bound for embedding one question; on failure retrieval uses BM25 only.
    embedding_timeout_seconds: float = 10

    # --- Provider endpoints / keys ---------------------------------------------
    ollama_base_url: str = "http://localhost:11434"
    #: Keep Ollama models loaded between requests (avoids reload latency).
    ollama_keep_alive: int = 1800  # seconds
    openai_api_key: str | None = None
    openai_base_url: str | None = None  # any OpenAI-compatible server (vLLM, Groq, …)
    anthropic_api_key: str | None = None
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None

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

    @model_validator(mode="after")
    def _check_chains(self) -> "Settings":
        # Fail at startup on a typo instead of on the first chat.
        self.answer_models  # noqa: B018
        self.classifier_models  # noqa: B018
        return self

    @property
    def answer_models(self) -> list[ModelSpec]:
        if self.llm_chain:
            return parse_chain(self.llm_chain)
        return [ModelSpec(self.llm_provider, self.llm_model)]

    @property
    def classifier_models(self) -> list[ModelSpec]:
        if self.classifier_chain:
            return parse_chain(self.classifier_chain)
        if self.classifier_model and not self.llm_chain:
            return [ModelSpec(self.llm_provider, self.classifier_model)]
        return self.answer_models

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
