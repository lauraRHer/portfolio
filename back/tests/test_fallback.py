"""Fallback chain: free-tier limits, outages and empty answers move on to the next model."""

import asyncio
from collections.abc import AsyncIterator, Sequence

import pytest

from app.core.config import Settings, parse_chain
from app.domain.models import Message
from app.domain.ports import LLMUnavailableError
from app.providers.llm.fallback import (
    CooldownPolicy,
    Cooldowns,
    FallbackLLM,
    classify_failure,
)

from .fakes import FakeLLM, SlowLLM

PROMPT = [Message("user", "¿Dónde trabaja Laura?")]
POLICY = CooldownPolicy(rate_limit=60, quota=3600, error=30)


class FakeResponse:
    def __init__(self, status_code: int, headers: dict[str, str] | None = None) -> None:
        self.status_code = status_code
        self.headers = headers or {}


class APIError(Exception):
    """Shape of the openai/anthropic SDK errors: `status_code` + `response`."""

    def __init__(self, status: int, message: str, headers: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.status_code = status
        self.response = FakeResponse(status, headers)


class FailingLLM(FakeLLM):
    def __init__(self, error: Exception, name: str) -> None:
        super().__init__(name=name)
        self.error = error

    async def complete(self, messages: Sequence[Message]) -> str:
        self.calls.append(list(messages))
        raise self.error

    async def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        self.calls.append(list(messages))
        raise self.error
        yield  # pragma: no cover - makes this an async generator


class BreaksMidStreamLLM(FakeLLM):
    async def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        yield "Laura "
        raise APIError(500, "connection reset")


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def chain(*models, clock=None, timeout: float = 5) -> FallbackLLM:
    return FallbackLLM(
        models,
        cooldowns=Cooldowns(clock or Clock()),
        policy=POLICY,
        attempt_timeout=timeout,
    )


async def text(llm: FallbackLLM) -> str:
    return "".join([t async for t in llm.stream(PROMPT)])


# --- error classification ---------------------------------------------------------


@pytest.mark.parametrize(
    ("error", "reason", "seconds"),
    [
        # Real messages from the providers' free tiers.
        (
            APIError(429, "Rate limit reached for model on requests per day (RPD): Limit 1000"),
            "daily_quota",
            3600,
        ),
        (
            APIError(429, "Quota exceeded for GenerateRequestsPerDayPerProjectPerModel-FreeTier"),
            "daily_quota",
            3600,
        ),
        (APIError(429, "Rate limit exceeded: free-models-per-day"), "daily_quota", 3600),
        (
            APIError(429, "Rate limit reached on tokens per minute (TPM)", {"retry-after": "7"}),
            "rate_limit",
            7,
        ),
        (APIError(429, "RESOURCE_EXHAUSTED. Please retry in 37.5s."), "rate_limit", 37.5),
        (APIError(429, "Too many requests"), "rate_limit", 60),
        (APIError(401, "Invalid API key"), "http_401", 3600),
        (APIError(404, "The model does not exist"), "http_404", 3600),
        (APIError(503, "Service unavailable"), "http_503", 30),
        (TimeoutError(), "timeout", 30),
        (ConnectionError("refused"), "ConnectionError", 30),
    ],
)
def test_classify_failure(error, reason, seconds):
    assert classify_failure(error, POLICY) == (reason, seconds)


# --- fallback ---------------------------------------------------------------------


async def test_first_model_answers_when_healthy():
    a, b = FakeLLM("A", name="a"), FakeLLM("B", name="b")
    assert await chain(a, b).complete(PROMPT) == "A"
    assert not b.calls


async def test_daily_quota_moves_on_and_skips_the_model_until_cooldown_ends():
    clock = Clock()
    quota = APIError(429, "Rate limit reached on requests per day (RPD)")
    a, b = FailingLLM(quota, "a"), FakeLLM("B", name="b")
    llm = chain(a, b, clock=clock)

    assert await text(llm) == "B "
    assert await llm.complete(PROMPT) == "B"
    assert len(a.calls) == 1  # not retried while exhausted

    clock.now = 3601  # cooldown over: probed again
    await llm.complete(PROMPT)
    assert len(a.calls) == 2


async def test_classifier_and_answer_chains_share_cooldowns():
    cooldowns = Cooldowns(Clock())
    a = FailingLLM(APIError(429, "requests per day"), "groq:x")
    answer = FallbackLLM(
        [a, FakeLLM(name="b")], cooldowns=cooldowns, policy=POLICY, attempt_timeout=5
    )
    classifier = FallbackLLM(
        [a, FakeLLM("PORTFOLIO", name="c")], cooldowns=cooldowns, policy=POLICY, attempt_timeout=5
    )
    await answer.complete(PROMPT)
    assert await classifier.complete(PROMPT) == "PORTFOLIO"
    assert len(a.calls) == 1


async def test_slow_model_is_skipped_after_attempt_timeout():
    slow, b = SlowLLM(delay=1), FakeLLM("B", name="b")
    slow.name = "slow"
    assert await asyncio.wait_for(text(chain(slow, b, timeout=0.05)), 1) == "B "


async def test_last_model_is_not_cut_by_attempt_timeout():
    slow = SlowLLM(delay=0.1)
    slow.reply = "ok"
    llm = chain(FailingLLM(APIError(503, "down"), "a"), slow, timeout=0.01)
    assert await text(llm) == "ok "


async def test_empty_answer_counts_as_failure():
    a, b = FakeLLM("", name="a"), FakeLLM("B", name="b")
    assert await chain(a, b).complete(PROMPT) == "B"


async def test_all_models_failing_raises():
    llm = chain(FailingLLM(APIError(503, "x"), "a"), FailingLLM(APIError(429, "y"), "b"))
    with pytest.raises(LLMUnavailableError):
        await text(llm)
    with pytest.raises(LLMUnavailableError):
        await llm.complete(PROMPT)


async def test_when_all_are_cooling_down_the_soonest_is_tried():
    clock = Clock()
    a = FailingLLM(APIError(429, "requests per day"), "a")  # 3600 s
    b = FailingLLM(APIError(503, "down"), "b")  # 30 s
    llm = chain(a, b, clock=clock)
    with pytest.raises(LLMUnavailableError):
        await llm.complete(PROMPT)
    b.complete = FakeLLM("B").complete  # type: ignore[method-assign]
    assert await llm.complete(PROMPT) == "B"
    assert len(a.calls) == 1


async def test_no_switch_after_first_token():
    """The visitor already has part of the answer: the error reaches ChatService."""
    b = FakeLLM("B", name="b")
    llm = chain(BreaksMidStreamLLM(name="a"), b)
    with pytest.raises(APIError):
        await text(llm)
    assert not b.calls


# --- configuration ------------------------------------------------------------------


def test_parse_chain():
    specs = parse_chain(
        "groq:openai/gpt-oss-20b?reasoning_effort=low , ollama:qwen2.5:3b,"
        " openrouter:meta-llama/llama-3.3-70b-instruct:free"
    )
    assert [s.name for s in specs] == [
        "groq:openai/gpt-oss-20b",
        "ollama:qwen2.5:3b",
        "openrouter:meta-llama/llama-3.3-70b-instruct:free",
    ]
    assert specs[0].options == {"reasoning_effort": "low"}


@pytest.mark.parametrize("raw", ["", " , ", "nope:model", "groq", "groq:x?temperature=1"])
def test_parse_chain_rejects_typos(raw):
    with pytest.raises(ValueError):
        parse_chain(raw)


def test_classifier_uses_answer_chain_by_default():
    s = Settings(llm_chain="groq:a, gemini:b", _env_file=None)
    assert [m.name for m in s.classifier_models] == ["groq:a", "gemini:b"]
    s = Settings(llm_chain="groq:a", classifier_chain="gemini:c", _env_file=None)
    assert [m.name for m in s.classifier_models] == ["gemini:c"]
    s = Settings(llm_model="qwen2.5:3b", classifier_model="qwen2.5:0.5b", _env_file=None)
    assert [m.name for m in s.classifier_models] == ["ollama:qwen2.5:0.5b"]
