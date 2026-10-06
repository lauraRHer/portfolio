# 0005 · Búsqueda híbrida (vectores + BM25) y router LLM

**Contexto.** Con `nomic-embed-text` (modelo pequeño, sobre todo en inglés), preguntas en español como "¿Dónde estudió?" no recuperaban el fragmento correcto. Además, la similitud coseno no separa bien las preguntas dentro de ámbito de las de fuera (ambas daban 0,55–0,68), así que no sirve como único filtro.

**Decisión.**
- **Recuperación híbrida:** BM25 en memoria (normaliza acentos, quita *stopwords* ES/EN y compara prefijos de 5 letras) + vectores, fusionados con *Reciprocal Rank Fusion*. Un fragmento es relevante si cualquiera de los dos retrievers supera su umbral.
- **Ámbito decidido por un router LLM** (temperatura 0, 8 tokens) en paralelo con la recuperación. La similitud solo actúa como señal secundaria.

**Consecuencias.**
- ➕ Evaluación: 100 % de ámbito y 100 % de recall de fuentes en el set de evaluación original (`back/evals`).
- ➕ BM25 no tiene coste de infraestructura: la base de conocimiento es pequeña.
- ➖ Con miles de documentos habría que mover BM25 al motor (pgvector + tsvector, Qdrant sparse, etc.).
