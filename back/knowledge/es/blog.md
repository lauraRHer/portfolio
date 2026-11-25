---
title: Bitácora (blog)
section: blog
---

<!-- Generado por front/scripts/export-blog-knowledge.mjs. No editar a mano. -->

## Artículo del blog de Laura: «Búsqueda híbrida: por qué BM25 sigue salvando a los embeddings»
Laura publicó este artículo en su bitácora (blog) el 12 de noviembre de 2026. Se puede leer en /es/blog/busqueda-hibrida. Laura explica por qué el asistente RAG de su portfolio combina búsqueda por palabras clave (BM25) con búsqueda por embeddings, fusionadas con Reciprocal Rank Fusion. Cuenta que con un modelo de embeddings pequeño las preguntas en español fallaban, que la similitud coseno no separaba bien las preguntas de fuera de tema y que por eso un router LLM decide el ámbito. También explica cómo lo midió con un set de evaluación propio y que, si los embeddings fallan en producción, el asistente sigue respondiendo solo con BM25.

## Artículo del blog de Laura: «Un chatbot gratis que no se queda mudo: cadena de fallback entre modelos»
Laura publicó este artículo en su bitácora (blog) el 28 de octubre de 2026. Se puede leer en /es/blog/fallback-modelos-gratuitos. Laura explica cómo mantiene el asistente de su portfolio funcionando solo con planes gratuitos de LLM (Groq, Google AI Studio, OpenRouter). Diseñó una cadena de fallback propia como decorador del puerto LLMProvider: recorre una lista ordenada de modelos y aplica a cada modelo que falla un enfriamiento según la causa (límite por minuto, cuota diaria, modelo retirado, error). En streaming solo cambia de modelo antes del primer token. Cuenta por qué descartó with_fallbacks de LangChain y LiteLLM, y qué limitaciones acepta.
