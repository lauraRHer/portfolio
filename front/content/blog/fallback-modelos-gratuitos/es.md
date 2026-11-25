---
title: "Un chatbot gratis que no se queda mudo: cadena de fallback entre modelos"
excerpt: "En producción mi asistente solo usa planes gratuitos. Así consigo que siga respondiendo cuando un proveedor agota la cuota o retira un modelo."
assistantSummary: >
  Laura explica cómo mantiene el asistente de su portfolio funcionando solo con
  planes gratuitos de LLM (Groq, Google AI Studio, OpenRouter). Diseñó una
  cadena de fallback propia como decorador del puerto LLMProvider: recorre una
  lista ordenada de modelos y aplica a cada modelo que falla un enfriamiento
  según la causa (límite por minuto, cuota diaria, modelo retirado, error).
  En streaming solo cambia de modelo antes del primer token. Cuenta por qué
  descartó with_fallbacks de LangChain y LiteLLM, y qué limitaciones acepta.
---

## El problema de lo gratis

Quería que el asistente de mi portfolio costara cero euros. Eso significa vivir de planes gratuitos: Groq, Google AI Studio, OpenRouter… Cada uno limita las peticiones por minuto y por día, los modelos cambian o desaparecen con frecuencia, y algún proveedor ha quitado su plan gratuito de un día para otro.

Con un único modelo, el chatbot se quedaría mudo en cuanto se agotase la cuota diaria. Justo el día que alguien interesante lo pruebe.

## Una lista de modelos y un decorador

La solución es una cadena: una lista ordenada de modelos en una variable de entorno, `LLM_CHAIN`, con el formato `proveedor:modelo, …`. Si el primero falla, se prueba el siguiente.

El backend sigue una arquitectura hexagonal, así que el chat habla con un puerto, `LLMProvider`, y no con un proveedor concreto. `FallbackLLM` es un decorador de ese puerto: por fuera parece un modelo más y por dentro recorre la lista. El grafo del RAG y el servicio de chat no saben que existe.

## Recordar quién está agotado

Si un modelo ha agotado su cuota, volver a llamarlo en cada pregunta solo añade espera. Por eso cada fallo deja al modelo en «enfriamiento» durante un tiempo que depende de la causa:

- límite por minuto: lo que diga `Retry-After`, o 60 segundos;
- cuota diaria, clave inválida o modelo retirado: una hora;
- error o timeout: 30 segundos.

Mientras dura el enfriamiento, las peticiones siguientes saltan ese modelo sin gastar una llamada. El router de ámbito y el generador comparten estos enfriamientos, porque las cuotas son por modelo y no por uso.

## El detalle del streaming

Las respuestas llegan token a token. Si un modelo falla a mitad de frase, cambiar a otro mezclaría dos respuestas. Así que la regla es simple: solo se cambia de modelo antes del primer token. Una respuesta vacía también cuenta como fallo.

Dentro de la cadena desactivé además los reintentos del SDK. Reintentar contra un modelo limitado solo retrasa el paso al siguiente.

## Lo que descarté

- **`with_fallbacks()` de LangChain:** no recuerda qué modelo está agotado, así que cada pregunta volvería a gastar una llamada contra un modelo sin cuota, y no distingue si el fallo es antes o después del primer token.
- **LiteLLM Router:** hace esto y más, pero es una dependencia pesada para menos de 200 líneas propias, y los tests pasarían a depender de ella.
- **Un único proveedor de pago:** más simple, pero el objetivo era coste cero.

## Lo que acepto

Los enfriamientos viven en memoria: con varias réplicas, cada una aprende por su cuenta qué modelo está agotado. La calidad también varía según qué modelo conteste. Y si la cadena se agota entera, el visitante no ve un error: recibe un mensaje fijo, con algo de humor, y mi email.
