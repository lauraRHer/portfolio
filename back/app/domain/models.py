"""Plain domain types shared across layers (no framework imports)."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Literal

Role = Literal["system", "user", "assistant"]
Language = Literal["es", "en"]


@dataclass(frozen=True, slots=True)
class Message:
    role: Role
    content: str


@dataclass(frozen=True, slots=True)
class Chunk:
    """A piece of the knowledge base, ready to embed."""

    id: str
    text: str
    #: Source document id (file stem), e.g. "experience".
    source: str
    title: str
    #: Page section id in the frontend (e.g. "experience") — used for source chips.
    section: str | None = None
    language: Language | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class RetrievedChunk:
    chunk: Chunk
    #: Cosine similarity in [0, 1] (higher = more similar).
    score: float


class AnswerKind(StrEnum):
    ANSWER = "answer"
    GREETING = "greeting"
    REFUSAL = "refusal"
    NO_INFO = "no_info"
    BUSY = "busy"


class Scope(StrEnum):
    """Output of the scope classifier."""

    PORTFOLIO = "PORTFOLIO"
    GREETING = "GREETING"
    OFF_TOPIC = "OFF_TOPIC"
