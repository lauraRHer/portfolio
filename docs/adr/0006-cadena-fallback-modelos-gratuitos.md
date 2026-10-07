# 0006 · Cadena de fallback de modelos gratuitos en producción

**Contexto.** En producción el chatbot funciona solo con planes gratuitos (Groq, Google AI Studio, OpenRouter…). Cada uno limita las peticiones por minuto y por día, sus modelos cambian o se retiran con frecuencia y algunos proveedores han eliminado el plan gratuito de un día para otro. Con un único modelo, el chatbot se quedaría mudo en cuanto se agotase la cuota diaria.

**Decisión.**
- `FallbackLLM`: un decorador del puerto `LLMProvider` que recorre una lista ordenada de modelos configurada en `LLM_CHAIN` (`proveedor:modelo, …`).
- Al modelo que falla se le aplica un **enfriamiento** según la causa: límite por minuto (`Retry-After` o 60 s), cuota diaria, clave inválida o modelo retirado (1 h) y error o timeout (30 s). Mientras dura, las peticiones siguientes lo saltan sin gastar una llamada.
- En streaming solo se cambia de modelo **antes del primer token**. Una respuesta vacía cuenta como fallo.
- El router y el generador comparten los enfriamientos, porque las cuotas son por modelo.
- Groq, Gemini y OpenRouter son *presets* sobre `ChatOpenAI` (URL base + clave propia), sin dependencias nuevas.
- Dentro de una cadena, los reintentos del SDK se desactivan: reintentar un modelo limitado solo retrasa al siguiente.

**Alternativas.** `with_fallbacks()` de LangChain: no recuerda qué modelo está agotado (cada petición volvería a gastar una llamada contra un modelo sin cuota) y no distingue el fallo antes y después del primer token en streaming. LiteLLM Router: hace esto y más, pero añade una dependencia pesada para menos de 200 líneas propias, y los tests dependerían de ella (ver [0004](0004-backend-hexagonal-agnostico.md)). Un único proveedor de pago: más simple, pero el objetivo es coste cero.

**Consecuencias.**
- ➕ Sin coste, y una caída o cuota agotada de un proveedor no afecta al visitante.
- ➕ Cambiar el orden o sustituir un modelo retirado es editar una variable. `evals/check_llms.py` comprueba cada entrada antes de desplegar.
- ➕ El grafo y `ChatService` no cambian: el fallback es transparente detrás del puerto.
- ➖ Los enfriamientos viven en memoria: con varias réplicas, cada una aprende por su cuenta qué modelo está agotado (cuesta una petición fallida por réplica). Para este tráfico es asumible.
- ➖ Detectar la cuota diaria depende del texto del error de cada proveedor. Si un proveedor lo cambia, se trata como límite por minuto: se reintenta antes de lo necesario, pero sigue funcionando.
- ➕ Si la cadena se agota entera, el visitante recibe un texto fijo con humor y mi email (`kind: unavailable`), no un error ni un rechazo que culpe a su pregunta.
- ➖ La calidad de la respuesta varía según qué modelo conteste. El router de ámbito y las respuestas fijas acotan ese efecto.
