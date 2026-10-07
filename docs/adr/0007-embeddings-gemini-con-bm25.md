# 0007 · Embeddings de Gemini con BM25 de respaldo

**Contexto.** En producción no hay Ollama. Los embeddings tienen que salir de otro sitio y sin coste. A diferencia del chat, no basta con pasar al siguiente modelo: los vectores de dos modelos distintos no son comparables, así que la pregunta y el índice tienen que usar siempre el mismo modelo.

**Decisión.**
- `gemini-embedding-001` por la API compatible con OpenAI de Google AI Studio (plan gratuito), reducido a 768 dimensiones.
- Si una consulta de embeddings falla o tarda más de `EMBEDDING_TIMEOUT_SECONDS`, `retrieve` busca solo con BM25, que no depende de ningún modelo.
- La ingesta calcula los vectores antes de vaciar el índice: un fallo al reindexar conserva el índice anterior.

**Alternativas.** Embeddings locales en el contenedor (fastembed + ONNX, el mismo `nomic-embed-text` que en desarrollo): no tienen cuota ni dependen de un tercero, y conservarían los umbrales ajustados. A cambio, la imagen pesaría unos 500 MB más y harían falta 0,6–1 GB de RAM, lo que deja fuera los planes gratuitos de hosting más comunes. Ollama como segundo servicio: el mismo problema de memoria, además de otro contenedor que mantener. Cadena de modelos de embeddings, cada uno con su propia colección y sus propios umbrales: es posible, pero cada modelo hay que calibrarlo por separado. Queda aplazada hasta que los logs (`vector_down`) muestren que la cuota de Gemini se agota de verdad.

**Consecuencias.**
- ➕ Imagen ligera, sin RAM extra y sin dependencias nuevas: cabe en cualquier hosting gratuito.
- ➕ Si se agota la cuota, el chatbot sigue respondiendo con búsqueda por palabras clave.
- ➖ La cuota del plan gratuito de embeddings es incierta y Google la ha recortado antes. Con BM25 solo, empeora la recuperación de preguntas parafraseadas ("¿dónde ha currado?" frente a "experiencia").
- ➖ Las preguntas de los visitantes se envían a Google, y en el plan gratuito pueden usarse para mejorar sus productos.
- ➕ Calibrado con `evals.run`: 100 % de acierto del router y 95 % de recuperación, con los umbrales por defecto. Las preguntas válidas dan una similitud de 0,61–0,80 y las de fuera de tema de 0,46–0,62.
