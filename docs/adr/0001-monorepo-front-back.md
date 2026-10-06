# 0001 · Monorepo con front y back independientes

**Contexto.** El portfolio es sobre todo contenido estático, pero el chatbot necesita Python (ecosistema de IA). Se espera que ambos crezcan: más proyectos y un blog en el front; RAG más rico y quizá otros agentes en el back.

**Decisión.** Un único repositorio con `front/` (Next.js) y `back/` (FastAPI), sin dependencias de código entre ellos. El único contrato es HTTP (`docs/API.md`), reflejado en `front/src/lib/chat/types.ts` y `back/app/api/schemas/chat.py`.

**Consecuencias.**
- ➕ Cada parte se despliega por separado: front en Vercel o hosting estático, back en cualquier contenedor.
- ➕ El portfolio sigue funcionando aunque el back esté caído (estado "no disponible").
- ➖ El contrato está duplicado en dos lenguajes. Mitigación: tests de API en el back y un tipo único en el front. A futuro se puede generar el cliente desde el OpenAPI.
