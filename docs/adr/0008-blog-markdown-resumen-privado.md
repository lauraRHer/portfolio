# 0008 · Blog en Markdown con un resumen privado para el asistente

**Contexto.** Quería un blog integrado en el portfolio: con la misma estética, bilingüe y, sobre todo, que el asistente RAG supiera qué he escrito. Pero el asistente no debe responder con el texto completo de los artículos: son largos, partirlos en *chunks* mezclaría opiniones y detalles técnicos con mi perfil, y el ámbito del bot es hablar de mí, no hacer de buscador del blog.

**Decisión.**
- Los artículos son ficheros Markdown en el repo (`front/content/blog/<slug>/`): un `post.yaml` con los datos comunes y un `.md` por idioma. Se prerenderizan todos en el build; no hay CMS ni base de datos.
- Cada idioma tiene un campo `assistantSummary` en el frontmatter. El cargador (`src/lib/blog/posts.ts`, `server-only`) lo valida y lo descarta: el tipo `PostSummary` que reciben los componentes no tiene ese campo, así que no puede acabar en el HTML ni en el JavaScript del cliente.
- `scripts/export-blog-knowledge.mjs` genera `back/knowledge/{es,en}/blog.md` con título, fecha, URL y resumen de cada artículo publicado. El backend lo indexa como el resto del conocimiento (`section: blog`).
- Todo artículo existe en los dos idiomas: el build falla si falta uno.
- El índice del blog es un mapa estelar (cada estrella, un artículo; cada constelación, un tema) acompañado siempre de una lista normal, para que se entienda a la primera que son artículos y para la accesibilidad.

**Alternativas.** MDX con `@next/mdx`: permite componentes dentro del texto, pero no lo necesito y añade configuración al build. Un CMS headless: tiene sentido con varios autores; para uno solo es otra cuenta y otra dependencia. Indexar el texto completo en el RAG: más recall, pero el bot acabaría respondiendo sobre detalles de un artículo en vez de sobre mí, y sería más difícil de controlar.

**Consecuencias.**
- ➕ Publicar es un commit. Los artículos se revisan como código y quedan en el historial.
- ➕ Controlo exactamente qué sabe el asistente de cada artículo, y puede enlazarlo.
- ➖ El `blog.md` del backend es un fichero generado que hay que regenerar al publicar (`npm run blog:knowledge -- --check` lo detecta).
- ➖ El mapa no escala a cientos de artículos. Con muchos, las etiquetas se solaparían y habría que agruparlas o mostrar solo las recientes.
