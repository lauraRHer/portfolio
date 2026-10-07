"""Chain of chat models: when one can't answer, the next one does.

Free tiers cap requests per minute and per day, and they fail more often than
paid APIs. A single free model would leave the chatbot silent once its quota
runs out, so production uses an ordered chain of them (LLM_CHAIN):

- A model that fails is put on **cooldown** and skipped by later requests.
  The cooldown depends on the cause: per-minute limit (Retry-After or ~1 min),
  daily quota / invalid key / model removed (~1 h, then it is probed again),
  server or network error and timeout (~30 s).
- **Streaming** switches model only before the first token: once the visitor
  sees text, a different model can't continue it. An empty answer counts as a
  failure too (some free models return nothing when overloaded).
- If every model is cooling down, they are still tried (soonest to recover
  first): failing fast costs less than refusing to try.

The classifier and answer chains share one `Cooldowns`, because quotas are
per model, whatever the call is for.
"""

import asyncio
import logging
import re
import time
from collections.abc import AsyncIterator, Callable, Sequence
from contextlib import aclosing
from dataclasses import dataclass

from app.domain.models import Message
from app.domain.ports import LLMProvider, LLMUnavailableError

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class CooldownPolicy:
    rate_limit: float = 60
    quota: float = 3600
    error: float = 30


class Cooldowns:
    """When each model (by name) may be tried again."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._until: dict[str, float] = {}

    def remaining(self, name: str) -> float:
        return max(0.0, self._until.get(name, 0.0) - self._clock())

    def block(self, name: str, seconds: float) -> None:
        self._until[name] = max(self._until.get(name, 0.0), self._clock() + seconds)

    def clear(self, name: str) -> None:
        self._until.pop(name, None)


# Providers word daily limits differently: Groq "requests per day (RPD)",
# Gemini "…PerDayPerProjectPerModel…", OpenRouter "free-models-per-day".
_DAILY = re.compile(r"per[ _-]?day|daily|\b(rpd|tpd)\b", re.IGNORECASE)
_RETRY_IN = re.compile(r"retry (?:in|after) (\d+(?:\.\d+)?)\s*s", re.IGNORECASE)


def _status(exc: BaseException) -> int | None:
    status = getattr(exc, "status_code", None)
    if status is None:
        status = getattr(getattr(exc, "response", None), "status_code", None)
    return status if isinstance(status, int) else None


def _retry_after(exc: BaseException) -> float | None:
    headers = getattr(getattr(exc, "response", None), "headers", None)
    value = headers.get("retry-after") if headers is not None else None
    if value is None and (m := _RETRY_IN.search(str(exc))):
        value = m.group(1)
    try:
        return float(value) if value is not None else None
    except ValueError:  # HTTP-date form: rare, use the default
        return None


def classify_failure(exc: BaseException, policy: CooldownPolicy) -> tuple[str, float]:
    """(reason, cooldown seconds) for a failed call."""
    if isinstance(exc, TimeoutError):
        return "timeout", policy.error
    status, text = _status(exc), str(exc)
    if status == 429 or "rate limit" in text.lower() or "RESOURCE_EXHAUSTED" in text:
        if _DAILY.search(text):
            return "daily_quota", policy.quota
        return "rate_limit", _retry_after(exc) or policy.rate_limit
    if status in (401, 402, 403, 404):  # bad key, no credit, model gone: won't fix itself soon
        return f"http_{status}", policy.quota
    return (f"http_{status}" if status else type(exc).__name__), policy.error


class FallbackLLM:
    """`LLMProvider` that delegates to the first model of the chain able to answer."""

    def __init__(
        self,
        models: Sequence[LLMProvider],
        *,
        cooldowns: Cooldowns,
        policy: CooldownPolicy,
        attempt_timeout: float,
    ) -> None:
        if not models:
            raise ValueError("FallbackLLM needs at least one model")
        self._models = list(models)
        self._cooldowns = cooldowns
        self._policy = policy
        self._timeout = attempt_timeout
        self.name = " > ".join(m.name for m in self._models)

    def _candidates(self) -> list[LLMProvider]:
        ready = [m for m in self._models if not self._cooldowns.remaining(m.name)]
        if ready:
            return ready
        return sorted(self._models, key=lambda m: self._cooldowns.remaining(m.name))

    def _failed(self, model: LLMProvider, exc: BaseException) -> None:
        reason, seconds = classify_failure(exc, self._policy)
        self._cooldowns.block(model.name, seconds)
        log.warning("LLM %s failed (%s): skipped for %.0fs", model.name, reason, seconds)

    def _empty(self, model: LLMProvider) -> None:
        seconds = self._policy.error
        self._cooldowns.block(model.name, seconds)
        log.warning("LLM %s returned an empty answer: skipped for %.0fs", model.name, seconds)

    def _answered(self, model: LLMProvider, position: int) -> None:
        # A model tried as a last resort while cooling down is back in service.
        self._cooldowns.clear(model.name)
        if position:
            log.info("LLM fallback: %s answered", model.name)

    def _bounded(self, awaitable, last: bool):
        # The last candidate gets no attempt timeout: the caller's deadline applies.
        return awaitable if last else asyncio.wait_for(awaitable, self._timeout)

    async def complete(self, messages: Sequence[Message]) -> str:
        candidates = self._candidates()
        error: BaseException | None = None
        for i, model in enumerate(candidates):
            last = i == len(candidates) - 1
            try:
                text = await self._bounded(model.complete(messages), last)
            except Exception as e:
                self._failed(model, e)
                error = e
                continue
            if text.strip():
                self._answered(model, i)
                return text
            self._empty(model)
        raise LLMUnavailableError(f"No model answered ({self.name})") from error

    async def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        candidates = self._candidates()
        error: BaseException | None = None
        for i, model in enumerate(candidates):
            last = i == len(candidates) - 1
            async with aclosing(aiter(model.stream(messages))) as tokens:
                try:
                    first = await self._bounded(anext(tokens), last)
                except StopAsyncIteration:
                    self._empty(model)
                    continue
                except Exception as e:
                    self._failed(model, e)
                    error = e
                    continue
                self._answered(model, i)
                yield first
                try:
                    async for token in tokens:
                        yield token
                except Exception as e:
                    # Too late to switch: the visitor already has part of this answer.
                    self._failed(model, e)
                    raise
                return
        raise LLMUnavailableError(f"No model answered ({self.name})") from error
