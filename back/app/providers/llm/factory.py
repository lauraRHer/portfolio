"""Builds the configured chat model. Provider SDKs are imported lazily so
only the one you use needs to be installed (see pyproject extras)."""

from app.core.config import Settings
from app.domain.ports import LLMProvider

from .langchain_adapter import LangChainLLM


class ProviderConfigError(RuntimeError):
    pass


def _build(settings: Settings, model: str, *, max_tokens: int, temperature: float) -> LLMProvider:
    provider = settings.llm_provider

    if provider == "ollama":
        from langchain_ollama import ChatOllama

        chat = ChatOllama(
            model=model,
            base_url=settings.ollama_base_url,
            temperature=temperature,
            num_predict=max_tokens,
            keep_alive=settings.ollama_keep_alive,
        )
    elif provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as e:  # pragma: no cover
            raise ProviderConfigError("Install the extra: uv sync --extra openai") from e
        if not settings.openai_api_key:
            raise ProviderConfigError("OPENAI_API_KEY is required for llm_provider=openai")
        chat = ChatOpenAI(
            model=model,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    elif provider == "anthropic":
        try:
            from langchain_anthropic import ChatAnthropic
        except ImportError as e:  # pragma: no cover
            raise ProviderConfigError("Install the extra: uv sync --extra anthropic") from e
        if not settings.anthropic_api_key:
            raise ProviderConfigError("ANTHROPIC_API_KEY is required for llm_provider=anthropic")
        chat = ChatAnthropic(
            model=model,
            api_key=settings.anthropic_api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    else:  # pragma: no cover - guarded by Literal type
        raise ProviderConfigError(f"Unknown LLM provider: {provider}")

    return LangChainLLM(chat, name=f"{provider}:{model}")


def build_llm(settings: Settings) -> LLMProvider:
    """Model that writes the answers."""
    return _build(
        settings,
        settings.llm_model,
        max_tokens=settings.llm_max_tokens,
        temperature=settings.llm_temperature,
    )


def build_classifier_llm(settings: Settings) -> LLMProvider:
    """Deterministic, short-output model for the scope classifier."""
    return _build(
        settings,
        settings.classifier_model or settings.llm_model,
        max_tokens=8,
        temperature=0.0,
    )
