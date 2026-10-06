"""HTTP contract of /api/chat — mirrored in front/src/lib/chat/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    locale: Literal["es", "en"] = "es"


class HealthResponse(BaseModel):
    status: Literal["ok"]
    llm: str
    embeddings: str
    indexed_chunks: int
