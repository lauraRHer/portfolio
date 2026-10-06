from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_container
from app.api.schemas.chat import HealthResponse
from app.core.container import Container

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(c: Annotated[Container, Depends(get_container)]) -> HealthResponse:
    return HealthResponse(
        status="ok",
        llm=c.llm.name,
        embeddings=c.embeddings.name,
        indexed_chunks=await c.store.count(),
    )
