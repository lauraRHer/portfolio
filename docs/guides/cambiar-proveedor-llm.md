# Cambiar el proveedor de LLM

Todo se hace en `back/.env`, que está ignorado por git (plantilla con todas las variables: `back/.env.example`). El código no cambia.

## Ollama (local, por defecto)
```env
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:3b
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
```
Cualquier modelo de `ollama list` sirve. Con GPU, modelos de 7–8B (`qwen2.5:7b`, `llama3.1:8b`) dan respuestas mejores.

## OpenAI
```bash
uv sync --extra openai
```
```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

## Cualquier servidor compatible con OpenAI (Groq, Together, vLLM, LM Studio…)
Igual que OpenAI, más `OPENAI_BASE_URL=https://…/v1`.

## Anthropic (Claude)
```bash
uv sync --extra anthropic
```
```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_API_KEY=sk-ant-...
```
Anthropic no ofrece embeddings: combínalo con `EMBEDDING_PROVIDER=ollama` u `openai`.

## Notas
- **Al cambiar de modelo de embeddings** se crea una colección nueva y se reindexa automáticamente al arrancar.
- **Prefijos de embeddings:** se ponen solos. Los modelos `nomic-embed-*` reciben `search_query: ` y `search_document: `, y el resto ninguno. Define `EMBEDDING_QUERY_PREFIX` / `EMBEDDING_DOCUMENT_PREFIX` solo si tu modelo necesita otros.
- **Variables vacías = valor por defecto.** Copiar el `.env.example` tal cual no rompe nada.
- **Router más barato:** `CLASSIFIER_MODEL` permite usar un modelo distinto (más pequeño) solo para clasificar el ámbito.
- **Tras cambiar de modelo, evalúa:** `uv run python -m evals.run`. Los umbrales `RETRIEVAL_MIN_SCORE` y `RETRIEVAL_OVERRIDE_SCORE` dependen del modelo de embeddings.

## Añadir un proveedor nuevo
1. En `app/providers/llm/factory.py`, añade una rama en `_build()` que cree el `BaseChatModel` de LangChain correspondiente.
2. Añade el literal a `LLMProviderName` en `app/core/config.py`.
3. Si no existe adaptador de LangChain, implementa el protocolo `LLMProvider` (`complete` + `stream`) directamente.
