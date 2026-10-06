# syntax=docker/dockerfile:1
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.11.3 /uv /usr/local/bin/uv
WORKDIR /app

# Install dependencies first (cached layer). Add `--extra openai` / `--extra anthropic` as needed.
ARG UV_EXTRAS=""
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project $UV_EXTRAS

COPY app ./app
COPY knowledge ./knowledge

RUN useradd --create-home appuser && mkdir -p /app/data && chown -R appuser /app/data
USER appuser
EXPOSE 8000
# The rate limit keys on the client IP. uvicorn takes it from X-Forwarded-For only
# when the request comes from a trusted proxy: set FORWARDED_ALLOW_IPS to your
# proxy's address (or "*" if the container is only reachable through the proxy).
ENV FORWARDED_ALLOW_IPS=127.0.0.1
# Production defaults: no LAN CORS, no /docs. Override with ENVIRONMENT=development.
ENV ENVIRONMENT=production
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
