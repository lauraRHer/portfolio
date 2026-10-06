# 0004 · Backend hexagonal y agnóstico de modelo

**Contexto.** En local se usan modelos de Ollama; en producción, otros proveedores (OpenAI, Anthropic, servidores compatibles con OpenAI). El código del RAG no debe cambiar al cambiar de modelo.

**Decisión.**
- Puertos propios (`LLMProvider`, `EmbeddingProvider`, `VectorStore`) en `app/domain/ports.py`.
- Adaptadores sobre LangChain, que ya normaliza decenas de proveedores, elegidos por configuración en `app/core/container.py`.
- LangGraph orquesta la lógica de decisión. El streaming de la respuesta lo hace `ChatService` fuera del grafo para no retrasar el primer token.
- La colección de Chroma se nombra según el modelo de embeddings, así que cambiar de modelo reindexa en vez de mezclar dimensiones.

**Alternativas.** Solo LiteLLM: menos código, pero el dominio quedaría acoplado a una librería y los tests dependerían de ella. Clientes HTTP propios: más control, pero más código que mantener.

**Consecuencias.**
- ➕ Cambiar de proveedor = variables de entorno ([guía](../guides/cambiar-proveedor-llm.md)).
- ➕ Tests rápidos y deterministas con *fakes* que implementan los puertos.
- ➖ Una capa de indirección más. Es pequeña: dos adaptadores de ~40 líneas.
