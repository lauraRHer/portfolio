"""Deterministic test doubles for the ports (no Ollama needed)."""

import hashlib
import math
from collections.abc import AsyncIterator, Sequence

from app.domain.models import Message


class FakeLLM:
    """Returns a scripted reply; records the prompts it received."""

    def __init__(self, reply: str = "Laura works at **CARTIF**.", name: str = "fake:llm") -> None:
        self.reply = reply
        self.name = name
        self.calls: list[list[Message]] = []

    async def complete(self, messages: Sequence[Message]) -> str:
        self.calls.append(list(messages))
        return self.reply

    async def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        self.calls.append(list(messages))
        for word in self.reply.split(" "):
            yield word + " "


class KeywordClassifier(FakeLLM):
    """Mimics the scope router with keyword rules."""

    # "langgraph" reproduces a real misroute of the small local model.
    OFF_TOPIC = ("capital", "python function", "joke", "chiste", "langgraph", "en general")
    GREETING = ("who are you",)

    async def complete(self, messages: Sequence[Message]) -> str:
        text = messages[-1].content.lower()
        if any(k in text for k in self.OFF_TOPIC):
            return "OFF_TOPIC"
        if any(k in text for k in self.GREETING):
            return "GREETING"
        return "PORTFOLIO"


class HashEmbeddings:
    """Bag-of-words hashed into a fixed vector: similar texts → similar vectors."""

    name = "fake:hash-embeddings"
    dim = 256

    def _embed(self, text: str) -> list[float]:
        v = [0.0] * self.dim
        for word in text.lower().split():
            word = word.strip("¿?¡!.,:;()\"'")
            if len(word) < 3:
                continue
            h = int(hashlib.md5(word[:5].encode()).hexdigest(), 16)
            v[h % self.dim] += 1.0
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / n for x in v]

    async def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    async def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


class FailingClassifier(FakeLLM):
    """Scope router that is down (connection error, timeout…)."""

    async def complete(self, messages: Sequence[Message]) -> str:
        raise ConnectionError("model unavailable")


class SlowLLM(FakeLLM):
    """Streams one token every `delay` seconds (for timeouts and concurrency)."""

    def __init__(self, delay: float) -> None:
        super().__init__()
        self.delay = delay

    async def stream(self, messages: Sequence[Message]) -> AsyncIterator[str]:
        import asyncio

        self.calls.append(list(messages))
        for word in self.reply.split(" "):
            await asyncio.sleep(self.delay)
            yield word + " "
