"""Adapter: LangChain `Embeddings` → our `EmbeddingProvider` port.

Adds optional task prefixes (e.g. nomic-embed-text expects
"search_query: " / "search_document: ").
"""

from collections.abc import Sequence

from langchain_core.embeddings import Embeddings

from app.core.config import Settings
from app.domain.ports import EmbeddingProvider

from ..llm.factory import ProviderConfigError


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
    elif provider == "openai":
        try:
            from langchain_openai import OpenAIEmbeddings
        except ImportError as e:  # pragma: no cover
            raise ProviderConfigError("Install the extra: uv sync --extra openai") from e
        model = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
    else:  # pragma: no cover
        raise ProviderConfigError(f"Unknown embedding provider: {provider}")

    return LangChainEmbeddings(
        model,
        name=f"{provider}:{settings.embedding_model}",
        query_prefix=settings.query_prefix,
        doc_prefix=settings.document_prefix,
    )
