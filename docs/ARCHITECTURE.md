# Arquitectura

## Visión general

```
 Navegador ──────────────────────────────────────────────────────────────┐
  │  Next.js (SSG /es /en)                                               │
  │   ├─ Hero: React Three Fiber (chunk lazy, solo cliente)              │
  │   ├─ Secciones: datos de src/content + textos de messages/*.json     │
  │   └─ ChatWidget ──── POST /api/chat (SSE) ─────────┐                 │
  └────────────────────────────────────────────────────┼─────────────────┘
                                                       ▼
 FastAPI ── ChatService ── LangGraph (decide) ── LLMProvider.stream() ──▶ tokens
                              │       │
                     classifier LLM   hybrid retrieval
                                      ├─ EmbeddingProvider + VectorStore (Chroma)
                                      └─ BM25 (en memoria)
```

Front y back son independientes: el front se exporta como páginas estáticas y solo habla con el back a través del chat. Si el back no responde, el resto del portfolio funciona igual.

---

## Frontend

### Capas

| Carpeta | Responsabilidad | Regla |
|---|---|---|
| `src/content/` | **Datos** (proyectos, experiencia, skills, servicios, formación) tipados con `I18n<T>` | Para añadir contenido no se toca ningún componente |
| `messages/*.json` | **Textos de interfaz** (títulos, botones, copy) | Toda cadena visible pasa por next-intl |
| `src/config/site.ts` | Datos personales, redes, CV, URL de la API | Único lugar con URLs externas |
| `components/sections/` | Una sección = un componente | Leen datos de `content/` y textos de `messages/` |
| `components/aceternity/` | Efectos visuales reutilizables | Sin lógica de negocio; respetan *reduced motion* |
| `components/ui/` | Primitivas (Section, SectionHeader, Tag…) | Sin dependencias de sección |
| `lib/` | Hooks, cliente del chat, presets de animación | Sin JSX salvo hooks |

### Internacionalización
- `src/i18n/routing.ts` define los idiomas (`es` por defecto) con prefijo siempre (`/es`, `/en`).
- `src/proxy.ts` (antes "middleware" en Next < 16) negocia el idioma por `Accept-Language`.
- El alias `next-intl/config` se registra a mano en `next.config.ts` (ver [ADR 0003](adr/0003-next-intl-sin-plugin.md)).
- Los datos estructurados usan `I18n<T> = Record<Locale, T>`. Al añadir un idioma, TypeScript marca todos los textos que faltan.

### Hero: la galaxia (`components/hero/`)

```
Hero.tsx                 decide versión animada o estática (reduced motion)
└─ AnimatedHero          sección de 300vh con un "escenario" sticky de 100vh
   ├─ GalaxyPoster       galaxia CSS: LCP inmediato y fallback
   ├─ GalaxyScene        (next/dynamic, ssr:false) → <Canvas>
   │   ├─ Galaxy         Points + ShaderMaterial; gira, se arrastra, recibe hover/click
   │   │   ├─ CoreGlow   halo del núcleo
   │   │   └─ TargetStar la estrella en la que se entra (hija del grupo → gira con él)
   │   └─ CameraRig      parallax + vuelo hacia la estrella según el scroll
   └─ overlays           título, destello y "tinte de núcleo"
```

**Coreografía del scroll** (`galaxy/config.ts → SCROLL`), con progreso de 0 a 1 sobre el hero:

| Progreso | Qué pasa |
|---|---|
| 0 – 0.22 | el título se desvanece, crece y se desenfoca |
| 0.08 – 0.94 | la cámara viaja hacia la estrella (`easeInOutCubic`), el FOV se abre (efecto *warp*) y la galaxia frena su giro |
| 0.82 – 1 | destello blanco-violeta y, después, el "tinte de núcleo" |
| 1 | el tinte coincide con el fondo de `#core` (clase `.core-tint`), así que la transición es continua |

**Interacción, toda en GPU** (`galaxy/shaders.ts`):
- *hover*: las partículas cercanas al puntero se apartan y brillan (`uMouse`, `uHover`).
- *click*: una onda expansiva sale desde el punto pulsado (`uClickPos`, `uClickAge`).
- *drag*: el giro horizontal tiene inercia y el vertical inclina el disco (`useGalaxyPointer`).
  En táctil solo rota el arrastre horizontal; el vertical sigue haciendo scroll (`touch-action: pan-y`).
- El estado de interacción es un objeto mutable en un `ref` (`interaction.ts`), **no** estado de React: cambia en cada frame y no debe provocar renders.

**Rendimiento:** presupuesto de partículas por dispositivo (`PARTICLES_BY_TIER`), DPR limitado, `PerformanceMonitor` que baja el DPR si caen los FPS y `frameloop="never"` cuando el hero sale de pantalla. three.js va en un chunk aparte que no bloquea el primer render.

### Movimiento reducido
`MotionPreferenceProvider` combina `prefers-reduced-motion` con el botón "Reducir animaciones" del footer (guardado en `localStorage`). Con movimiento reducido:
- Motion: `MotionConfig reducedMotion="always"`.
- CSS: `html[data-motion="reduce"]` desactiva las animaciones `animate-*`.
- El hero pasa a ser una pantalla estática con un botón "Entrar".

### Mascota astronauta (`components/mascot3d/` y `components/mascot/`)
El lanzador del chat es un personaje animado que aparece al salir del hero. Por defecto se usa la **versión 3D** (React Three Fiber, ver [guía de la mascota 3D](guides/mascota-3d.md)). Si el navegador no tiene WebGL, se usa la versión 2D en SVG que se describe a continuación. Las dos comparten el mismo diseño: muelles + capas procedurales + un "director" con guion asíncrono.

| Archivo | Qué hace |
|---|---|
| `AstronautSvg.tsx` | Dibujo SVG por piezas (casco, pelo, cara, traje, brazos, piernas, portátil, antena) y expresiones: `effort`, `relief`, `happy`, `talk`, `focus`, `curious` |
| `rig.ts` | **Física de muelles**: cada articulación persigue su objetivo con rigidez y amortiguación, así hay inercia y rebote en lugar de interpolación lineal. Encima se suman capas procedurales: escalada con manos fijas en el borde y brazos elásticos, temblor de esfuerzo, pataleo, saludo, tecleo y respiración. La antena recibe impulsos de la cabeza y del cuerpo (movimiento secundario) |
| `parts.ts` | Registro de nodos SVG mediante callback refs. El bucle de render escribe `transform` directamente, sin re-render de React por frame |
| `Mascot.tsx` | El "director": un guion asíncrono que cambia objetivos, caras y bocadillos. Secuencia: manos al borde → trepa a tirones → salta → «¡Uf!» → saluda («¡Hola! ¿Te puedo ayudar?») → saltitos hasta el marco → se sienta con el portátil → «Si me necesitas, estoy aquí» → acciones aleatorias en reposo (mirar, estirarse, pensar) |
| `SpeechBubble.tsx` | Bocadillo con efecto máquina de escribir |

- La introducción completa se ve una vez por sesión (`sessionStorage`). Después reaparece ya sentada.
- Con el chat abierto o al volver al hero se esconde bajo el borde.
- Con movimiento reducido aparece sentada y quieta.
- Accesible: es un `<button>` con `aria-label` y reacciona igual al foco que al hover.
- Para retocar tiempos o poses: `STAND`/`SEATED` y el guion `intro()` en `Mascot.tsx`; rigidez y amortiguación en `SPRINGS` (`rig.ts`).

### Chat (`components/chat/`, `lib/chat/`)
- `api.ts` hace `fetch` y lee el stream SSE con `ReadableStream` (no `EventSource`, que no permite POST).
- `useChat.ts` es la máquina de estados: burbuja optimista, tokens incrementales, `AbortController` para "Detener", reintento sin duplicar el historial y persistencia solo en `sessionStorage`.
- Las fuentes que devuelve el back (`section`) se convierten en chips que enlazan a las secciones de la página.

---

## Backend

### Hexagonal: puertos y adaptadores

```
app/domain/ports.py          LLMProvider · EmbeddingProvider · VectorStore   (Protocols)
        ▲                          ▲                    ▲
app/providers/llm/           LangChainLLM ← ChatOllama | ChatOpenAI | ChatAnthropic
app/providers/embeddings/    LangChainEmbeddings ← OllamaEmbeddings | OpenAIEmbeddings
app/providers/vectorstore/   ChromaVectorStore | InMemoryVectorStore
        ▲
app/core/container.py        "composition root": el único sitio que elige implementaciones
```

El pipeline RAG solo conoce los puertos. **Cambiar de modelo es cambiar variables de entorno** ([guía](guides/cambiar-proveedor-llm.md)). Los tests montan el contenedor con *fakes* deterministas.

### Pipeline del chat

```
START → guard ─┬─ inyección / role-play ──────→ END (refusal)
               ├─ saludo simple ──────────────→ END (greeting)
               └─┬→ classify  (LLM: PORTFOLIO | GREETING | OFF_TOPIC) ─┐
                 └→ retrieve  (vectores + BM25 → RRF)  ─────────────────┴→ decide → END
```

| Nodo | Qué hace |
|---|---|
| `guard` | detecta el idioma, posibles inyecciones de prompt, peticiones de hablar en mi nombre (role-play) y saludos simples, sin llamar al modelo. Marca además las preguntas de habilidad que solo pueden ser sobre mí ("¿Laura sabe X?", "¿Sabe X?"; no la segunda persona, que puede ir dirigida al bot) |
| `classify` | router de ámbito con un LLM a temperatura 0 y 8 tokens de salida; ve la pregunta anterior del visitante para entender seguimientos. Si falla o supera `LLM_TIMEOUT_SECONDS`, queda en "desconocido" (no se da por buena) |
| `retrieve` | búsqueda híbrida: Chroma (coseno) + BM25 fusionados con *Reciprocal Rank Fusion*; filtra por umbrales y prioriza el idioma de la pregunta. Los seguimientos cortos (≤ 2 palabras con contenido, p. ej. "¿Y antes de eso?") se buscan junto a la pregunta anterior |
| `decide` | saludo → texto fijo; fuera de ámbito → rechazo (salvo pregunta de habilidad sobre mí); clasificador caído → rechazo salvo recuperación muy convincente; sin fragmentos relevantes → "no tengo ese dato"; si no → prompt de respuesta |

`classify` y `retrieve` corren **en paralelo**. La generación final **no** se hace dentro del grafo: `ChatService` transmite los tokens del LLM directamente por SSE para que el primer token llegue lo antes posible.

**Tres capas de defensa de ámbito:** las reglas del `guard`, el router LLM y las reglas del system prompt de respuesta. Los rechazos y los "no sé" son textos fijos y nunca dependen del modelo.

**Por qué la similitud nunca anula al clasificador:** con un modelo de embeddings pequeño (nomic-embed-text) las preguntas legítimas y las de fuera de tema dan similitudes que se solapan casi por completo (medido: 0,55–0,75 frente a 0,52–0,73; un mensaje vacío da 0,73). Ningún umbral las separa, así que la recuperación solo decide *qué* contexto usar, no *si* se responde.

**El historial no es fuente de datos:** lo envía el cliente, así que los turnos del asistente podrían estar falsificados ("me dijiste que cobra 90.000 €") o arrastrar una alucinación anterior. El servidor solo usa las preguntas anteriores del visitante, como referencia para entender "eso" o "antes"; los hechos salen siempre del contexto recuperado.

**Carga:** `ChatService` limita los chats simultáneos (`MAX_CONCURRENT_CHATS`); los que no consiguen hueco en `CHAT_QUEUE_SECONDS` reciben un aviso fijo de "ocupado" (`kind: busy`) en vez de acumularse sobre el modelo. Cada llamada al modelo tiene un tiempo máximo.

### Base de conocimiento
- `back/knowledge/{es,en}/*.md`: frontmatter (`title`, `section`) y un bloque `##` por chunk.
- Al arrancar, si `AUTO_INGEST=true`, se compara un *fingerprint* (hash) del contenido con el del índice y se reindexa si cambió.
- La colección de Chroma incluye el nombre del modelo de embeddings, así que cambiar de modelo nunca mezcla vectores de dimensiones distintas.

### Configuración
Todo en `app/core/config.py` (pydantic-settings, variables de entorno o `.env`). Ver `back/.env.example`.
