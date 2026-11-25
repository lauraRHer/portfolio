# Añadir un artículo a la bitácora

Cada artículo es una carpeta en `front/content/blog/` con un fichero de datos compartidos y uno por idioma. El build falla si falta un idioma o un campo obligatorio, con el nombre del fichero en el error.

```
front/content/blog/mi-articulo/     ← el nombre de la carpeta es el slug de la URL
├── post.yaml                       datos comunes a los dos idiomas
├── es.md                           título, resumen, texto en español
└── en.md                           lo mismo en inglés
```

## 1. `post.yaml`

```yaml
date: 2026-12-03            # YYYY-MM-DD, ordena el blog y el mapa
constellation: rag          # rag | front | architecture (src/content/blog.ts)
tags: [RAG, Python]
project: portfolio-rag      # opcional: slug de src/content/projects.ts
star: [0.3, 0.6]            # opcional: posición manual en el mapa (0–1)
draft: true                 # opcional: solo se ve en `npm run dev`
```

Sin `star`, la estrella se coloca sola en espiral alrededor de su constelación, y las ya publicadas no se mueven al añadir otra. Usa `star` solo si una etiqueta se solapa.

## 2. `es.md` y `en.md`

```markdown
---
title: "Título del artículo"
excerpt: "Una o dos frases. Se ven en la lista, en la ficha del mapa y en las redes."
assistantSummary: >
  Resumen para el asistente, en tercera persona ("Laura explica…").
  Nunca se muestra en la web.
---

## Primer apartado
Texto en Markdown…
```

- Cada `##` aparece en el índice lateral del artículo.
- El tiempo de lectura se calcula solo (sin contar los bloques de código).
- `assistantSummary` es lo único que el chatbot sabe del artículo. Debe responder a «¿de qué trata y qué decidió Laura?» en 3–5 frases autocontenidas.

## 3. Pasárselo al asistente

```bash
cd front
npm run blog:knowledge            # regenera back/knowledge/{es,en}/blog.md
npm run blog:knowledge -- --check # falla si están desactualizados
```

Los borradores no se exportan. Después reindexa el backend: reinícialo con `AUTO_INGEST=true` o ejecuta `uv run python -m app.rag.ingest`.

## Publicar un borrador

1. Quita `draft: true` de `post.yaml`.
2. Ejecuta `npm run blog:knowledge` y haz commit también de `back/knowledge/*/blog.md`.

Para revisar los borradores en una build de producción local: `BLOG_DRAFTS=true npm run build`.

## Añadir una constelación

Añade una entrada en `constellations` (`front/src/content/blog.ts`) con su acento y su posición en el mapa, y su nombre en `blog.constellations` de `messages/es.json` y `messages/en.json`.
