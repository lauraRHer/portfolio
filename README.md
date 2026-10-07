# Portfolio · Laura Rodrigo Hernando

Mi portfolio personal: una **galaxia 3D** en la que entras al hacer scroll y un **asistente RAG** que responde preguntas sobre mi experiencia, y solo sobre eso.

Soy desarrolladora full-stack (Angular, Python/FastAPI, PostgreSQL/PostGIS) y me estoy especializando en IA aplicada. Construí esta web para enseñar las dos caras: un frontend cuidado y animado, y un backend de IA diseñado como software de producción.

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Motion · React Three Fiber · next-intl (ES/EN) |
| **Backend** | FastAPI · LangGraph · adaptadores de LangChain · Chroma · BM25 · Ollama en local y cualquier proveedor alojado en producción |
| **Calidad** | TypeScript estricto + ESLint · Ruff · pytest (sin conexión, con *fakes*) · set de evaluación del asistente |

## Lo más destacado

- **Hero con shaders propios.** Decenas de miles de partículas animadas en la GPU: se apartan al pasar el ratón, lanzan una onda al hacer clic, giran con inercia al arrastrar y la cámara vuela hacia una estrella con el scroll, enlazando sin corte con la sección siguiente. El número de partículas y la resolución se adaptan al dispositivo, y hay una versión estática para movimiento reducido y navegadores sin WebGL.
- **Un asistente RAG que no se sale del tema.** Un grafo de LangGraph aplica reglas deterministas, un router LLM de ámbito y búsqueda híbrida (vectores + BM25 fusionados con *Reciprocal Rank Fusion*) antes de responder. Los rechazos y los "no tengo ese dato" son textos fijos, así que nunca dependen del modelo. Las respuestas llegan en streaming por SSE.
- **Independiente del proveedor.** El código del RAG solo depende de puertos (`LLMProvider`, `EmbeddingProvider`, `VectorStore`): pasar de Ollama a OpenAI, Anthropic o cualquier servidor compatible con OpenAI es cuestión de variables de entorno.
- **En producción, solo modelos gratuitos.** Una cadena de fallback recorre modelos de varios proveedores (Groq, Gemini, OpenRouter). Cuando uno agota su cuota diaria, llega a su límite por minuto o falla, el siguiente responde, y el que ha fallado queda apartado el tiempo que corresponde a cada causa ([ADR 0006](docs/adr/0006-cadena-fallback-modelos-gratuitos.md)).
- **Endurecido tras una auditoría de QA hecha con un agente de IA** ([cómo](#cómo-lo-he-construido)). El historial falsificado se ignora, los intentos de inyección y de hacerse pasar por mí se rechazan, las generaciones simultáneas están limitadas, las llamadas al modelo tienen tiempo máximo y cada fallo encontrado se convirtió en un test de regresión.
- **Mascota animada.** Un modelo 3D generado con IA que riggeo por script (esqueleto y pesos calculados a partir de la malla) y animo de forma procedural con muelles e IK de dos huesos: trepa a la página, saluda y se sienta con el portátil.
- **Una única fuente de verdad para el contenido.** Ficheros tipados y bilingües alimentan la web, y el CV (PDF en ES/EN) se genera desde un único JSON.

## Cómo lo he construido

He desarrollado este proyecto con **Claude Code** como agente de programación, y forma parte de lo que quiero demostrar: saber trabajar con asistentes de IA de forma eficaz y con criterio.

- **Yo dirijo, el agente ejecuta.** Defino qué construir, tomo las decisiones de producto y de arquitectura (están en los [ADR](docs/adr/)), y reviso y pruebo cada cambio antes de darlo por bueno. Claude Code implementa, propone alternativas y explica los compromisos de cada una.
- **Subagentes especializados para revisar.** Para el asistente RAG lancé un subagente con rol de QA experto en IA y chatbots: diseñó una batería de pruebas de caja negra, revisó el código para crear otra de caja blanca, ejecutó ambas contra el modelo real y auditó la calidad del código. Antes de publicar el repositorio, otro subagente hizo una auditoría de seguridad y buenas prácticas (secretos en el historial, configuración de producción, cabeceras, licencias). Los fallos encontrados están en [Retos técnicos](docs/RETOS.md#auditoría-de-qa) y cada uno se convirtió en un test.
- **Verificación, no fe.** Ningún cambio se da por hecho sin comprobarlo: tests, lint y tipos en cada paso, pruebas contra el modelo real y capturas automáticas con Chrome sin ventana para validar animaciones y diseño en escritorio y móvil.
- **Contexto persistente.** Reglas globales y memoria del agente para que respete mis convenciones en cualquier proyecto: estilo de los textos, qué información no se publica y cómo se redactan los commits.

## Puesta en marcha

### Requisitos
- Node ≥ 20.9 y npm
- Python 3.11+ y [uv](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com) con:
  ```bash
  ollama pull qwen2.5:3b        # chat + router de ámbito
  ollama pull nomic-embed-text  # embeddings
  ```

### Backend
```bash
cd back
cp .env.example .env            # valores vacíos = por defecto; .env no se sube a git
uv sync
uv run uvicorn app.main:app --reload --port 8000
```
Al arrancar indexa `back/knowledge/` (≈20 s la primera vez). Estado: http://localhost:8000/api/health · documentación interactiva: http://localhost:8000/docs

### Frontend
```bash
cd front
cp .env.example .env.local      # opcional
npm install
npm run dev
```
Abre http://localhost:3000 (redirige a `/es` o `/en`). La web funciona sin el backend: el asistente muestra un estado "no disponible" con mi email.

### Desde el móvil (misma wifi)
```bash
cd back  && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
cd front && npm run dev -- -H 0.0.0.0
```
Abre `http://<IP-del-ordenador>:3000`. El front calcula la URL de la API con esa misma IP y, en desarrollo, la API acepta CORS desde redes privadas.

### Docker
```bash
docker compose up --build       # web :3000 · api :8000
```
Ollama se queda en el host; en la [guía de despliegue](docs/guides/despliegue.md) explico cómo hacerlo accesible desde el contenedor.

## Comandos

| Dónde | Comando | Qué hace |
|---|---|---|
| front | `npm run dev` · `npm run build` · `npm run lint` | desarrollo · build de producción · lint |
| front | `npx tsc --noEmit` | comprobación de tipos |
| front | `npm run rig:mascot` | regenera el modelo riggeado de la mascota |
| back | `uv run pytest` | tests (no necesitan Ollama) |
| back | `uv run ruff check . && uv run ruff format .` | lint + formato |
| back | `uv run python -m app.rag.ingest --reset` | reconstruye el índice de conocimiento |
| back | `uv run python -m evals.run` | evalúa el router y la recuperación (necesita Ollama) |
| cv | `python3 cv/build.py --publish` | genera el CV en ES/EN y lo copia a la web |

## Estructura

```
portfolio/
├── front/                     Next.js
│   ├── messages/{es,en}.json  textos de la interfaz
│   ├── scripts/               script de rigging de la mascota
│   └── src/
│       ├── app/[locale]/      layout, página, imagen Open Graph
│       ├── components/
│       │   ├── hero/          galaxia 3D (escena, shaders, cámara, interacción)
│       │   ├── sections/      un componente por sección
│       │   ├── mascot3d/      mascota 3D (rig, muelles, IK, director)
│       │   ├── chat/          widget del asistente
│       │   └── ui/            primitivas
│       ├── content/           datos tipados: proyectos, experiencia, skills, formación
│       └── lib/               hooks, cliente del chat, presets de animación
├── back/                      FastAPI
│   ├── app/
│   │   ├── domain/            modelos y puertos (interfaces)
│   │   ├── providers/         adaptadores: llm/, embeddings/, vectorstore/
│   │   ├── rag/               grafo LangGraph, guardrails, prompts, BM25, ingesta
│   │   ├── api/               rutas HTTP + SSE
│   │   └── core/              configuración, contenedor de dependencias, rate limit
│   ├── knowledge/{es,en}/     base de conocimiento del asistente (Markdown)
│   ├── evals/                 set de evaluación
│   └── tests/
├── cv/                        fuente del CV (cv.json) y generador de PDF
└── docs/                      arquitectura, API, decisiones y guías
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md): cómo encaja todo (frontend, hero 3D, i18n, pipeline RAG)
- [API](docs/API.md): contrato HTTP/SSE del asistente
- [Retos técnicos](docs/RETOS.md): problemas que me encontré y cómo los resolví
- [Decisiones de arquitectura (ADR)](docs/adr/)
- Guías: [añadir un proyecto](docs/guides/anadir-un-proyecto.md) · [el asistente RAG](docs/guides/chatbot-rag.md) · [proveedores de LLM](docs/guides/cambiar-proveedor-llm.md) · [la mascota 3D](docs/guides/mascota-3d.md) · [despliegue](docs/guides/despliegue.md)

## Licencia

© 2026 Laura Rodrigo Hernando. Todos los derechos reservados: el código se publica para que pueda leerse, no para reutilizarse. Ver [LICENSE](LICENSE).

Excepción: el modelo 3D de la mascota se generó con [Meshy](https://www.meshy.ai) y se distribuye bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (adaptado: esqueleto, pesos y optimización con `front/scripts/rig-mascot.mjs`).
