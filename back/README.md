# Back · FastAPI + LangGraph

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
uv run pytest                                      # tests sin Ollama
uv run python -m evals.run                         # evaluación del chatbot (con Ollama)
uv run python -m app.rag.ingest --reset            # reindexar knowledge/
```

Configuración: ver `.env.example`. Documentación: [arquitectura](../docs/ARCHITECTURE.md#backend), [API](../docs/API.md), [chatbot RAG](../docs/guides/chatbot-rag.md), [cambiar de proveedor de LLM](../docs/guides/cambiar-proveedor-llm.md).
