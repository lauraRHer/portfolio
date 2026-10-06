# Knowledge base del chatbot

Única fuente de verdad del asistente RAG. **El bot solo sabe lo que hay aquí.**

- Un archivo por tema y por idioma (`es/`, `en/`).
- Frontmatter obligatorio: `title` y `section` (id de la sección de la web a la que enlazan las "fuentes"; vacío si no aplica).
- Cada bloque `## ` se convierte en un *chunk* independiente: mantenlos autocontenidos (repite el nombre "Laura" en vez de usar solo pronombres).
- Tras editar: `uv run python -m app.rag.ingest --reset` (o reinicia la API con `AUTO_INGEST=true`, que detecta cambios por hash).
- No incluyas nada que no quieras que el bot diga en público.
