"""Builds the configured chat models. Provider SDKs are imported lazily so
only the one you use needs to be installed (see pyproject extras)."""

from app.core.config import ModelSpec, Settings
from app.domain.ports import LLMProvider

from .fallback import CooldownPolicy, Cooldowns, FallbackLLM
from .langchain_adapter import LangChainLLM


class ProviderConfigError(RuntimeError):
    pass


#: OpenAI-compatible providers with a free tier: base URL + settings field of the key.
OPENAI_COMPATIBLE = {
    "groq": ("https://api.groq.com/openai/v1", "groq_api_key"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai/", "gemini_api_key"),
    "openrouter": ("https://openrouter.ai/api/v1", "openrouter_api_key"),
}


def build_model(
    settings: Settings,
    spec: ModelSpec,
    *,
    max_tokens: int,
    temperature: float,
    max_retries: int,
) -> LLMProvider:
    provider, model = spec.provider, spec.model

    if provider == "ollama":
        from langchain_ollama import ChatOllama

        chat = ChatOllama(
            model=model,
            base_url=settings.ollama_base_url,
            temperature=temperature,
            num_predict=max_tokens,
            keep_alive=settings.ollama_keep_alive,
        )
    elif provider == "openai" or provider in OPENAI_COMPATIBLE:
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as e:  # pragma: no cover
            raise ProviderConfigError("Install the extra: uv sync --extra openai") from e
        if provider == "openai":
            base_url, key_field = settings.openai_base_url, "openai_api_key"
        else:
            base_url, key_field = OPENAI_COMPATIBLE[provider]
        api_key = getattr(settings, key_field)
        if not api_key:
            raise ProviderConfigError(f"{key_field.upper()} is required for {spec.name}")
        chat = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=temperature,
            max_tokens=max_tokens,
            max_retries=max_retries,
            **spec.options,  # e.g. reasoning_effort
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
            max_retries=max_retries,
        )
    else:  # pragma: no cover - guarded by Literal type
        raise ProviderConfigError(f"Unknown LLM provider: {provider}")

    return LangChainLLM(chat, name=spec.name)


def _chain(
    settings: Settings,
    specs: list[ModelSpec],
    cooldowns: Cooldowns,
    *,
    max_tokens: int,
    temperature: float,
) -> LLMProvider:
    # With a fallback, retrying a rate-limited model only delays the next one.
    retries = 0 if len(specs) > 1 else 2
    models = [
        build_model(
            settings, s, max_tokens=max_tokens, temperature=temperature, max_retries=retries
        )
        for s in specs
    ]
    if len(models) == 1:
        return models[0]
    return FallbackLLM(
        models,
        cooldowns=cooldowns,
        policy=CooldownPolicy(
            rate_limit=settings.llm_cooldown_rate_limit_seconds,
            quota=settings.llm_cooldown_quota_seconds,
            error=settings.llm_cooldown_error_seconds,
        ),
        attempt_timeout=settings.llm_attempt_timeout_seconds,
    )


def build_llms(settings: Settings) -> tuple[LLMProvider, LLMProvider]:
    """(answer model, scope classifier). Both chains share the cooldowns,
    because free-tier quotas are per model, whatever the call is for."""
    cooldowns = Cooldowns()
    answer = _chain(
        settings,
        settings.answer_models,
        cooldowns,
        max_tokens=settings.llm_max_tokens,
        temperature=settings.llm_temperature,
    )
    # Deterministic, short output: the classifier only replies with a label.
    classifier = _chain(
        settings,
        settings.classifier_models,
        cooldowns,
        max_tokens=settings.classifier_max_tokens,
        temperature=0.0,
    )
    return answer, classifier
