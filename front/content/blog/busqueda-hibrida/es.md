---
title: "Búsqueda híbrida: por qué BM25 sigue salvando a los embeddings"
excerpt: "El asistente de mi portfolio no encontraba dónde había estudiado. El fallo no estaba en el modelo, sino en cómo recuperaba los fragmentos."
assistantSummary: >
  Laura explica por qué el asistente RAG de su portfolio combina búsqueda por
  palabras clave (BM25) con búsqueda por embeddings, fusionadas con Reciprocal
  Rank Fusion. Cuenta que con un modelo de embeddings pequeño las preguntas en
  español fallaban, que la similitud coseno no separaba bien las preguntas de
  fuera de tema y que por eso un router LLM decide el ámbito. También explica
  cómo lo midió con un set de evaluación propio y que, si los embeddings fallan
  en producción, el asistente sigue respondiendo solo con BM25.
---

## El síntoma

Le pregunté a mi propio asistente «¿Dónde estudió?» y no supo contestar. La información estaba en la base de conocimiento, en un fragmento sobre formación, pero no llegaba al modelo. El modelo no era el problema: nunca había visto ese fragmento.

En desarrollo usaba `nomic-embed-text`, un modelo de embeddings pequeño y entrenado sobre todo en inglés. Con preguntas cortas en español, el vector de la pregunta y el del fragmento correcto no quedaban lo bastante cerca.

## Por qué no bastaba con subir o bajar un umbral

Lo primero que probé fue ajustar el umbral de similitud. Ahí encontré el segundo problema: las preguntas dentro de tema y las de fuera daban similitudes parecidas, entre 0,55 y 0,68. Cualquier umbral dejaba fuera preguntas buenas o dejaba pasar preguntas que no tenían nada que ver conmigo.

Así que la similitud no podía ser el único filtro, ni para recuperar ni para decidir si una pregunta tenía sentido.

## BM25, el veterano

BM25 es una búsqueda por palabras clave de toda la vida: puntúa un fragmento según cuántas veces aparecen los términos de la pregunta y lo raros que son en el conjunto. No entiende sinónimos, pero no falla con nombres propios, tecnologías o empresas, que es justo lo que más se pregunta en un portfolio.

Como la base de conocimiento es pequeña, el índice vive en memoria y está escrito en Python puro. Antes de comparar, cada texto pasa por tres pasos:

- quitar acentos y pasar a minúsculas;
- eliminar palabras vacías en español e inglés;
- recortar cada palabra a sus 5 primeras letras, un *stemming* muy básico que hace que «estudió» y «estudios» coincidan.

## Fusionar dos rankings con RRF

Los dos buscadores devuelven puntuaciones en escalas que no se pueden comparar. En vez de normalizarlas, uso *Reciprocal Rank Fusion*: cada fragmento suma `1 / (60 + posición)` por cada ranking en el que aparece. Lo que importa es la posición, no la puntuación.

```python
for rank, hit in enumerate(vector_hits):
    fused[hit.id] = fused.get(hit.id, 0) + 1 / (60 + rank)
for rank, hit in enumerate(keyword_hits):
    fused[hit.id] = fused.get(hit.id, 0) + 1 / (60 + rank)
```

Un fragmento se considera relevante si cualquiera de los dos buscadores supera su propio umbral. Para decidir si la pregunta es de ámbito, un router LLM con temperatura 0 contesta en paralelo a la recuperación, y la similitud queda como señal secundaria.

## Medirlo para creérmelo

No quería fiarme de cuatro preguntas probadas a mano, así que preparé un set de evaluación con preguntas dentro y fuera de tema. Con la búsqueda híbrida y el router, el set original pasó al 100 % de acierto de ámbito y al 100 % de fuentes recuperadas.

En producción los embeddings vienen de Gemini, con su propia calibración: 100 % de acierto del router y 95 % de recuperación. Y BM25 aporta algo más: si el servicio de embeddings falla o se queda sin cuota, el asistente sigue respondiendo solo con palabras clave en lugar de quedarse mudo.

## Lo que me llevo

La búsqueda semántica no sustituye a la de palabras clave; se complementan. Con pocos documentos, BM25 no cuesta nada de infraestructura. Si algún día fueran miles, movería esa parte al motor de búsqueda en lugar de mantenerla en memoria.
