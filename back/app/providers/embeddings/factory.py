"""Adapter: LangChain `Embeddings` → our `EmbeddingProvider` port.

Adds optional task prefixes (e.g. nomic-embed-text expects
"search_query: " / "search_document: ").
"""

from collections.abc import Sequence

from langchain_core.embeddings import Embeddings

from app.core.config import Settings
from app.domain.ports import EmbeddingProvider

from ..llm.factory import OPENAI_COMPATIBLE, ProviderConfigError


class LangChainEmbeddings:
    def __init__(
        self, model: Embeddings, name: str, query_prefix: str = "", doc_prefix: str = ""
    ) -> None:
        self._model = model
        self.name = name
        self._q = query_prefix
        self._d = doc_prefix

    async def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return await self._model.aembed_documents([self._d + t for t in texts])

    async def embed_query(self, text: str) -> list[float]:
        return await self._model.aembed_query(self._q + text)


def build_embeddings(settings: Settings) -> EmbeddingProvider:
    provider = settings.embedding_provider
    if provider == "ollama":
        from langchain_ollama import OllamaEmbeddings

        model: Embeddings = OllamaEmbeddings(
            model=settings.embedding_model,
            base_url=settings.ollama_base_url,
            keep_alive=settings.ollama_keep_alive,
        )
    elif provider in ("openai", "gemini"):
        try:
            from langchain_openai import OpenAIEmbeddings
        except ImportError as e:  # pragma: no cover
            raise ProviderConfigError("Install the extra: uv sync --extra openai") from e
        if provider == "openai":
            model = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                dimensions=settings.embedding_dimensions,
            )
        else:
            if not settings.gemini_api_key:
                raise ProviderConfigError(
                    "GEMINI_API_KEY is required for embedding_provider=gemini"
                )
            base_url, _ = OPENAI_COMPATIBLE["gemini"]
            model = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.gemini_api_key,
                base_url=base_url,
                dimensions=settings.embedding_dimensions,
                # Send text, not tiktoken ids (only OpenAI accepts those)…
                check_embedding_ctx_length=False,
                # …and at most 100 texts per request (Gemini's batch limit).
                chunk_size=100,
                max_retries=1,
            )
    else:  # pragma: no cover
        raise ProviderConfigError(f"Unknown embedding provider: {provider}")

    return LangChainEmbeddings(
        model,
        # Dimensions are part of the name so a change gets its own collection.
        name=f"{provider}:{settings.embedding_model}"
        + (f"@{settings.embedding_dimensions}" if settings.embedding_dimensions else ""),
        query_prefix=settings.query_prefix,
        doc_prefix=settings.document_prefix,
    )
