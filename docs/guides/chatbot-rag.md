# El chatbot RAG: conocimiento, evaluación y ajuste

## Qué sabe el bot
**Solo** lo que hay en `back/knowledge/{es,en}/*.md`. Reglas para escribir conocimiento:
- Un bloque `##` = un fragmento. Que sea autocontenido: repite "Laura" en lugar de usar solo "ella".
- El título del bloque se incluye en el embedding: haz que describa la pregunta que responde ("Dónde estudió Laura (estudios)").
- Frontmatter `section:` = id de la sección de la web a la que enlazan las "fuentes".
- Mantén ES y EN alineados.
- No escribas nada que no quieras que el bot diga en público.

## Cómo decide
Ver [ARCHITECTURE.md → Pipeline del chat](../ARCHITECTURE.md#pipeline-del-chat). En resumen: guardrails → (router LLM ‖ búsqueda híbrida) → decisión → respuesta en streaming o texto fijo.

## Evaluar
```bash
cd back
uv run python -m evals.run                               # con la config de .env
CLASSIFIER_MODEL=qwen2.5:0.5b uv run python -m evals.run # comparar otro router
```
Muestra, por caso, la decisión esperada y la obtenida, la sección recuperada, el tiempo y la traza del grafo. Añade casos en `evals/cases.yaml` cuando detectes un fallo, antes de corregirlo.

Resultados de referencia de la primera versión del set (CPU, `nomic-embed-text`):

| Router | Ámbito | Recall de fuentes |
|---|---|---|
| qwen2.5:3b | 100 % | 100 % |
| qwen2.5:0.5b | 88 % | 100 % |

## Parámetros de ajuste (`back/.env`)
| Variable | Por defecto | Efecto |
|---|---|---|
| `RETRIEVAL_TOP_K` | 3 | fragmentos en el contexto (más = mejor cobertura y más latencia) |
| `RETRIEVAL_MIN_SCORE` | 0.62 | similitud coseno mínima para considerar relevante un fragmento |
| `RETRIEVAL_LEXICAL_MIN_SCORE` | 2.0 | puntuación BM25 mínima |
| `RETRIEVAL_OVERRIDE_SCORE` | 0.68 | solo si el router no está disponible: se responde si la recuperación supera este valor y tiene una coincidencia léxica fuerte. Nunca anula un OFF_TOPIC (ver [arquitectura](../ARCHITECTURE.md#pipeline-del-chat)) |
| `LLM_TEMPERATURE` | 0.2 | creatividad de la respuesta |
| `LLM_MAX_TOKENS` | 400 | longitud máxima de la respuesta |

## Latencia
En una máquina solo con CPU, el primer token llega en 20–60 s: el coste es evaluar el prompt. Opciones, de más a menos impacto:
1. **GPU** (Ollama la usa automáticamente) o **modelo alojado** en producción: 1–3 s.
2. `OLLAMA_NUM_PARALLEL=2` en el servicio de Ollama: mantiene cachés separadas para el router y la respuesta.
3. `CLASSIFIER_MODEL=qwen2.5:0.5b`: router 3 veces más rápido, con menor precisión (ver tabla).
4. `RETRIEVAL_TOP_K=2` y fragmentos más cortos.

## Seguridad
- Inyección de prompt y role-play: regex en `guardrails.py`, router LLM y reglas del system prompt. Los rechazos son textos fijos.
- El historial que envía el cliente no es fuente de datos: solo se usan las preguntas anteriores del visitante.
- Límite de chats simultáneos (`MAX_CONCURRENT_CHATS`) y tiempo máximo por llamada al modelo (`LLM_TIMEOUT_SECONDS`).
- Rate limit por IP (`RATE_LIMIT_*`). Con varias réplicas, implementa `RateLimiter.hit()` sobre Redis.
- No se guardan conversaciones en el servidor.
