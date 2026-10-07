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

## Producción con modelos gratuitos: cadena de fallback
Los planes gratuitos limitan las peticiones por minuto y por día, y fallan más a menudo que los de pago. Por eso en producción no uso un modelo, sino una **cadena ordenada** de modelos gratuitos de varios proveedores:

```bash
uv sync --extra openai          # Groq, Gemini y OpenRouter usan la API compatible con OpenAI
```
```env
LLM_CHAIN=groq:openai/gpt-oss-120b?reasoning_effort=low, groq:qwen/qwen3.8-27b, gemini:gemini-3.5-flash-lite, openrouter:nvidia/nemotron-3-super-120b-a12b:free
CLASSIFIER_CHAIN=groq:qwen/qwen3.8-27b, gemini:gemini-3.5-flash-lite
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=768
GROQ_API_KEY=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
```

- Cada entrada es `proveedor:modelo`, y solo el primer `:` separa, así que valen ids como `qwen2.5:3b` o `…:free`. Proveedores disponibles: `ollama`, `openai`, `anthropic`, `groq`, `gemini` y `openrouter`. Tras `?` se puede añadir `reasoning_effort=none|low|medium|high` para los modelos de razonamiento.
- `LLM_CHAIN` tiene prioridad sobre `LLM_PROVIDER`/`LLM_MODEL`. El router de ámbito usa la misma cadena salvo que se defina `CLASSIFIER_CHAIN`.
- Un error de configuración (proveedor desconocido, opción inválida o clave que falta) detiene el arranque en vez de aparecer en el primer chat.

**Por qué esta cadena** (medido en octubre de 2026 con `evals.run` y el pipeline real; los modelos gratuitos cambian a menudo):

| Modelo | Router (34 casos, 8 tokens) | Primer token de la respuesta |
|---|---|---|
| `groq:qwen/qwen3.8-27b` | 100 % | 0,4 s |
| `groq:openai/gpt-oss-120b` (`reasoning_effort=low`) | no evaluado | 0,8 s |
| `groq:openai/gpt-oss-20b` (`reasoning_effort=low`) | 65 % (100 % con 256 tokens) | no evaluado |
| `gemini:gemini-3.5-flash-lite` | 94 % | 1,0 s |
| `openrouter:nvidia/nemotron-3-super-120b-a12b:free` | no evaluado | 2,0 s |

- Las respuestas empiezan por gpt-oss-120b y el router por Qwen. En Groq la cuota es por modelo, así que cada uno gasta la suya.
- El router solo usa modelos que responden bien con 8 tokens. Subir `CLASSIFIER_MAX_TOKENS` para un modelo de razonamiento puede hacer que los que no razonan respondan con frases en vez de con la etiqueta.
- Descartados: Gemma 4 servido por Gemini, porque mete su razonamiento (`<thought>…`) en la respuesta, y los modelos `:free` muy populares de OpenRouter, porque su cola compartida devuelve 429 a menudo.
- Con `gemini-embedding-001` a 768 dimensiones, el router acierta el 100 % y la recuperación el 95 %. Las preguntas válidas dan una similitud de 0,61–0,80 y las de fuera de tema de 0,46–0,62, así que los umbrales por defecto sirven.
- Con varios visitantes a la vez, el primero que se nota es el límite de tokens por minuto de Groq. La cadena lo cubre pasando al siguiente modelo.

**Cuándo se pasa al siguiente modelo y durante cuánto tiempo se aparta el que ha fallado:**

| Causa | Detección | Se aparta durante |
|---|---|---|
| Límite por minuto | HTTP 429 | `Retry-After` del proveedor, o `LLM_COOLDOWN_RATE_LIMIT_SECONDS` (60 s) |
| Cuota diaria agotada | 429 con «per day» / «RPD» / «PerDay» en el mensaje | `LLM_COOLDOWN_QUOTA_SECONDS` (1 h; luego se vuelve a probar) |
| Clave inválida, sin crédito, modelo retirado | 401 · 402 · 403 · 404 | `LLM_COOLDOWN_QUOTA_SECONDS` |
| Error del servidor o de red | 5xx, conexión | `LLM_COOLDOWN_ERROR_SECONDS` (30 s) |
| No empieza a responder a tiempo | sin primer token en `LLM_ATTEMPT_TIMEOUT_SECONDS` (20 s) | `LLM_COOLDOWN_ERROR_SECONDS` |
| Respuesta vacía | ningún token | `LLM_COOLDOWN_ERROR_SECONDS` |

- **El cambio de modelo solo ocurre antes del primer token.** Si un modelo falla a mitad de respuesta, el visitante ya ha visto parte del texto y otro modelo no puede continuarlo, así que se muestra el error y ese modelo queda apartado para las siguientes preguntas.
- Al último modelo disponible no se le aplica `LLM_ATTEMPT_TIMEOUT_SECONDS`, porque no hay a quién pasar. Lo acota `LLM_TIMEOUT_SECONDS`.
- Si todos están apartados, se prueban igualmente, empezando por el que antes se recupera: fallar rápido es mejor que no intentarlo.
- El router y el generador comparten el registro de modelos apartados, porque las cuotas son por modelo.
- `/health` muestra la cadena (`groq:… > gemini:… > …`) y los logs indican qué modelo falló, por qué y quién respondió.

**Modelos de razonamiento.** Gastan tokens pensando antes de responder, y esos tokens cuentan en el límite de salida. El router solo responde una etiqueta con `CLASSIFIER_MAX_TOKENS` (8): con un modelo de razonamiento, desactiva el razonamiento (`?reasoning_effort=none`, si el modelo lo admite), sube ese límite o usa una `CLASSIFIER_CHAIN` con modelos sin razonamiento.

**Si se agotan todos.** El visitante no ve un error: recibe una respuesta fija (`kind: unavailable`) que dice, con humor, que el asistente está "algo mareado" y da el email de contacto. Mientras todos están apartados se siguen probando en cada pregunta (cada fallo cuesta ~200 ms), así que en cuanto cualquier cuota se reinicia el chatbot vuelve a responder. Como referencia, una pregunta consume unos 1.800 tokens entre el router y la respuesta, y la cuota diaria de tokens suele agotarse antes que la de peticiones. Si el router usa otros modelos (`CLASSIFIER_CHAIN`), la cuota se reparte.

**Comprobar la cadena antes de desplegar.** Los modelos gratuitos y sus límites cambian a menudo:
```bash
uv run --extra openai python -m evals.check_llms
```
Envía una petición corta a cada modelo de las dos cadenas, sin fallback, y muestra latencia, respuesta o motivo del fallo (`daily_quota`, `http_404`…). Después, `uv run python -m evals.run` evalúa el router con la cadena real.

## Embeddings de Gemini (gratuitos)
```env
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=768
GEMINI_API_KEY=...
```
- Usa la misma clave que el chat de Gemini, pero la cuota es aparte. Cada pregunta gasta una petición y reindexar la base de conocimiento gasta una por cada 100 fragmentos.
- `EMBEDDING_DIMENSIONS` reduce el vector (3072 por defecto) casi sin perder calidad. Forma parte del nombre de la colección, así que cambiarlo reindexa.
- **Si se agota la cuota o falla la red**, la búsqueda sigue solo con BM25 (palabras clave). Las respuestas empeoran un poco, pero el chatbot no deja de funcionar. Si falla al reindexar, se conserva el índice anterior.
- Al cambiar de modelo de embeddings, vuelve a ajustar `RETRIEVAL_MIN_SCORE` y `RETRIEVAL_OVERRIDE_SCORE` con `uv run python -m evals.run`: cada modelo reparte las similitudes de forma distinta.

## Notas
- **Al cambiar de modelo de embeddings** se crea una colección nueva y se reindexa automáticamente al arrancar.
- **Prefijos de embeddings:** se ponen solos. Los modelos `nomic-embed-*` reciben `search_query: ` y `search_document: `, y el resto ninguno. Define `EMBEDDING_QUERY_PREFIX` / `EMBEDDING_DOCUMENT_PREFIX` solo si tu modelo necesita otros.
- **Variables vacías = valor por defecto.** Copiar el `.env.example` tal cual no rompe nada.
- **Router más barato:** `CLASSIFIER_MODEL` permite usar un modelo distinto (más pequeño) solo para clasificar el ámbito.
- **Tras cambiar de modelo, evalúa:** `uv run python -m evals.run`. Los umbrales `RETRIEVAL_MIN_SCORE` y `RETRIEVAL_OVERRIDE_SCORE` dependen del modelo de embeddings.

## Añadir un proveedor nuevo
1. En `app/providers/llm/factory.py`, añade una rama en `_build()` que cree el `BaseChatModel` de LangChain correspondiente.
2. Añade el literal a `LLMProviderName` en `app/core/config.py`.
   Si es compatible con OpenAI, basta con añadirlo a `OPENAI_COMPATIBLE` en la factoría (URL base + campo de su clave en `Settings`).
3. Si no existe adaptador de LangChain, implementa el protocolo `LLMProvider` (`complete` + `stream`) directamente.
