# Añadir un proyecto

1. **Front:** añade un objeto en `front/src/content/projects.ts`:

   ```ts
   {
     slug: "mi-agente-rag",           // único, en minúsculas y con guiones
     status: "real",                   // "real" | "in-progress" | "example" (muestra la etiqueta EJEMPLO)
     order: 2,                         // orden manual (el destacado va siempre primero)
     year: 2026,
     context: "personal",
     accent: "cyan",                   // "violet" | "cyan" | "magenta"
     categories: ["ai", "backend"],    // usadas por los filtros
     stack: ["Python", "LangGraph", "FastAPI"],
     title:   { es: "Mi agente RAG", en: "My RAG agent" },
     summary: { es: "Qué hace en ≤140 caracteres.", en: "What it does in ≤140 chars." },
     links: { repo: "https://github.com/…", demo: "https://…" },
   }
   ```
   TypeScript avisa si falta un idioma o un campo obligatorio. La tarjeta, los filtros y el orden se generan solos.

2. **Chatbot:** añade el proyecto a `back/knowledge/es/proyectos.md` y `back/knowledge/en/projects.md`, en un bloque `##` autocontenido que diga explícitamente "Laura…".
3. **Reindexa:** reinicia la API (detecta el cambio) o ejecuta `uv run python -m app.rag.ingest`.
4. **Evalúa (opcional):** añade una pregunta sobre el proyecto a `back/evals/cases.yaml` y ejecuta `uv run python -m evals.run`.

**Para eliminar un proyecto de ejemplo**, borra su objeto en `projects.ts` y su mención en la base de conocimiento.

### Futuro: página de detalle
El modelo ya tiene `slug`, `highlights` y `confidential`. Para crear `/[locale]/projects/[slug]`:
- añade `src/app/[locale]/projects/[slug]/page.tsx` con `generateStaticParams` a partir de `projects`;
- reutiliza el layout de `CaseStudy`;
- cambia el enlace de la tarjeta.
