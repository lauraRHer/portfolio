import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_container
from app.api.schemas.chat import ChatRequest
from app.core.container import Container
from app.domain.models import Message
from app.rag.service import ChatEvent

router = APIRouter(tags=["chat"])


def to_sse(event: ChatEvent) -> str:
    return f"event: {event.event}\ndata: {json.dumps(event.data, ensure_ascii=False)}\n\n"


def client_key(request: Request) -> str:
    # X-Forwarded-For is never read here: any client can set it. Behind a reverse
    # proxy, uvicorn resolves the real IP only for trusted proxies
    # (--proxy-headers + FORWARDED_ALLOW_IPS, see the Dockerfile).
    return request.client.host if request.client else "unknown"


@router.post(
    "/chat",
    response_class=StreamingResponse,
    responses={200: {"content": {"text/event-stream": {}}}, 429: {"description": "Rate limited"}},
)
async def chat(
    body: ChatRequest, request: Request, c: Annotated[Container, Depends(get_container)]
) -> StreamingResponse:
    """Answer a question about Laura as a Server-Sent Events stream.

    Events: `meta` {kind, sources} → `token` {text}* → `done` {} | `error` {message}.
    """
    if not c.rate_limiter.hit(client_key(request)):
        raise HTTPException(status_code=429, detail="Too many requests")

    history = [Message(t.role, t.content) for t in body.history][-c.settings.max_history_turns :]

    async def events() -> AsyncIterator[str]:
        async for event in c.chat.stream(body.message, history, body.locale):
            if await request.is_disconnected():
                break
            yield to_sse(event)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
