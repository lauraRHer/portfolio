"""FastAPI application factory.

uv run uvicorn app.main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, health
from app.core.config import Settings, get_settings
from app.core.container import Container, build_container
from app.core.logging import configure_logging
from app.rag.ingest import ensure_index

log = logging.getLogger(__name__)

#: Private-network origins (any port) — allowed in development only.
LAN_ORIGINS = r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?"


def create_app(settings: Settings | None = None, container: Container | None = None) -> FastAPI:
    settings = settings or (container.settings if container else get_settings())
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        c = container or build_container(settings)
        app.state.container = c
        log.info("LLM=%s · embeddings=%s", c.llm.name, c.embeddings.name)
        if settings.auto_ingest:
            try:
                await ensure_index(
                    knowledge_dir=settings.knowledge_dir,
                    store=c.store,
                    embeddings=c.embeddings,
                    marker=c.index_marker,
                )
            except Exception:
                # Keep serving /health; the chat will answer with errors until fixed.
                log.exception("Knowledge ingestion failed (is the embedding provider running?)")
        yield

    # Interactive API docs only outside production (the chat endpoint is public anyway,
    # but there's no reason to publish its schema).
    docs = settings.environment != "production"
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url="/redoc" if docs else None,
        openapi_url="/openapi.json" if docs else None,
    )
    origin_regex = settings.cors_origin_regex
    if origin_regex is None and settings.environment == "development":
        origin_regex = LAN_ORIGINS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=origin_regex or None,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Accept"],
    )
    app.include_router(health.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    return app


app = create_app()
