# Retos técnicos

Problemas que me encontré construyendo el portfolio y cómo los resolví. Las decisiones de más alcance están en los [ADR](adr/).

---

## Frontend y hero 3D

Empecé con Next.js 16, React 19, Tailwind v4 y TypeScript. Next 16 trae cambios importantes (`middleware.ts` pasa a ser `proxy.ts`, Turbopack por defecto, tipos globales `PageProps`/`LayoutProps`), así que trabajé con la documentación que incluye el propio paquete en `node_modules/next/dist/docs`.

La galaxia es un generador procedural con semilla (siempre igual): brazos espirales, bulbo y halo, con shaders propios para la repulsión al pasar el ratón, la onda al hacer clic, el centelleo y el remolino. La cámara vuela a una estrella que es hija del grupo, así que gira con la galaxia, y el final del scroll enlaza con la sección siguiente mediante un destello y un "tinte" idéntico a su fondo.

| Problema | Causa | Solución |
|---|---|---|
| `next typegen` fallaba: *SWC native addon: cache root has a parent writable by another user* | El plugin de next-intl importa `@swc/core`, cuyo binario exige que ningún directorio padre de `~/.cache` sea escribible por el grupo | No usar el plugin y registrar a mano el alias `next-intl/config`, que era lo único que hacía en este proyecto ([ADR 0003](adr/0003-next-intl-sin-plugin.md)) |
| El núcleo de la galaxia formaba una columna vertical gris | El bulbo solo tenía dispersión en Y | Bulbo como esfera achatada, brazos más anchos y un halo luminoso en el centro |
| ESLint (React Compiler): *"This value cannot be modified"* | Mutaba props y el valor devuelto por `useThree` | Estado de interacción en un `ref` y la cámara leída de `state.camera` dentro de `useFrame` |
| La palabra rotativa (FlipWords) no se veía aunque estaba en el DOM | Chrome no pinta `background-clip: text` en un elemento que también tiene `filter` | El degradado va en un `span` interior y la animación en el exterior |
| Error de hidratación en el hero con movimiento reducido | `useReducedMotion` lee `matchMedia` en el primer render del cliente, distinto del servidor | `useMediaQuery` con `useSyncExternalStore`, que usa el valor del servidor durante la hidratación |
| *A WebGL context could not be created* en navegadores con la aceleración por hardware desactivada | WebGL deshabilitado | `useWebGLSupport` lo comprueba antes de montar el canvas y usa el hero estático; `SceneErrorBoundary` recoge fallos en tiempo de ejecución |
| En el móvil (abierto por IP): texto invisible, galaxia estática y sin chat | Next 16 bloquea los recursos de desarrollo pedidos desde un host que no es `localhost`, así que la página no se hidrataba | `allowedDevOrigins` con IPs privadas, URL de la API derivada del host, CORS de red local en desarrollo y `<noscript>` como respaldo |
| Las etiquetas de la constelación de habilidades no se leían en móvil | Demasiado texto para el ancho de pantalla | Tooltips con el nombre del grupo: al pasar el ratón en escritorio y al tocar en móvil |

Para verificar animaciones sin depender de mi navegador, hice capturas y grabaciones con Chrome sin ventana (puppeteer + SwiftShader) en distintos puntos del scroll y estados de interacción.

---

## El asistente RAG

### Primeras pruebas con modelos reales

Los tests con *fakes* pasaban, pero con Ollama aparecieron los problemas de verdad:

| Problema | Causa | Solución |
|---|---|---|
| Respondía a "capital de Francia" y escribía código | El clasificador fallaba siempre (`ChatOllama` no acepta `max_tokens` con `.bind`) y el *fallback* lo daba por bueno | Longitud configurada en el modelo (`num_predict`) y, si el clasificador falla, el ámbito queda "desconocido" en vez de aceptarse |
| "¿Dónde estudió?" → "no tengo ese dato" | `nomic-embed-text` está muy centrado en inglés y no relacionaba la pregunta con el fragmento de formación | **Búsqueda híbrida**: BM25 en memoria + vectores, fusionados con RRF ([ADR 0005](adr/0005-busqueda-hibrida.md)) |
| "¿Sabe Docker?" se rechazaba | Pregunta sin sujeto | Regla y ejemplo en el prompt del router: sin sujeto, se refiere a mí |
| Exageraba mi nivel ("is proficient in Docker") | El modelo rellenaba con adjetivos | Regla en el prompt: no calificar el nivel si el contexto no lo dice |

Comparé dos routers con el set de evaluación: `qwen2.5:3b` acertó el 100 % del ámbito y `qwen2.5:0.5b` el 88 % (dejaba pasar código y fútbol), así que el 3B quedó por defecto.

### Auditoría de QA

Hice la auditoría con un **subagente de Claude Code con el rol de QA especializado en IA y chatbots**. Primero diseñó una batería de pruebas de caja negra sin ver el código; después revisó el código para crear una segunda batería dirigida a sus puntos débiles (umbrales, expresiones regulares, manejo del historial, límites), ejecutó ambas contra el modelo real y evaluó la calidad del código, distinguiendo lo que había que arreglar antes de publicar de lo aceptable para el alcance del proyecto.

Revisé el informe, comparé alternativas para cada fallo y elegí la solución apoyándome en mediciones (por ejemplo, las similitudes de la tabla). Destapó fallos que no habría visto con preguntas normales:

| Problema | Causa | Solución |
|---|---|---|
| "Explícame qué es RAG en general" se respondía (e inventaba la sigla) | Si la similitud superaba 0,68, se respondía aunque el router dijera "fuera de tema" | Medí las similitudes: preguntas legítimas 0,55–0,75 y fuera de tema 0,52–0,73, **ningún umbral las separa**. La similitud ya nunca anula al router |
| Con un historial falso ("cobra 90.000 €"), lo confirmaba | El servidor se fiaba de los mensajes del asistente que manda el cliente | Solo se usan las preguntas anteriores del visitante; los hechos salen siempre del contexto recuperado |
| "¿Y antes de eso?" inventaba experiencia previa | La búsqueda solo usaba la última frase | Los seguimientos cortos se buscan junto con la pregunta anterior; además añadí a la base de conocimiento qué hacía antes de CARTIF |
| "Describe París como lo haría Laura" funcionaba | Mencionar mi nombre bastaba para pasar el filtro | Las peticiones de hablar en mi nombre se rechazan antes de llamar a ningún modelo |
| "¿Laura sabe LangGraph?" no encontraba nada | LangGraph aparece en muchos fragmentos, su peso en BM25 era bajo y no llegaba al umbral | Umbral léxico más bajo para preguntas de habilidad claramente sobre mí, y los verbos de pregunta dejan de contar en la búsqueda |
| Un historial muy largo bloqueaba Ollama varios minutos | Sin límite de concurrencia ni tiempo máximo | Límite de chats simultáneos con respuesta "ocupado", tiempo máximo por llamada y descarte de los turnos del asistente |
| El rate limit se saltaba falseando `X-Forwarded-For` | Se leía la cabecera directamente | La IP la resuelve uvicorn solo para proxies de confianza |

Cada caso se quedó como test de regresión o como caso del set de evaluación.

Antes de publicar el repositorio repetí el método con otro subagente, esta vez centrado en seguridad y buenas prácticas: secretos en todo el historial, ficheros que no debían versionarse, configuración por defecto en producción, cabeceras de seguridad, dependencias y licencias. A raíz de esa revisión, la API arranca en modo producción en Docker sin exponer su documentación, la web envía cabeceras de seguridad y cambié el modelo de la mascota por uno con una licencia válida en la UE.

### Latencia en local

Con solo CPU, el primer token tarda 20–60 s: el coste dominante es evaluar el prompt, y se repite cada vez que Ollama alterna entre el prompt del clasificador y el de respuesta porque pierde la caché. Lo mitigué con saludos sin modelo, `top_k = 3`, `keep_alive` largo y un aviso de "Sigo pensando…" en la interfaz. En producción, con un modelo alojado, baja a 1–3 s.

---

## La mascota

Quería una mascota astronauta que trepara por el borde de la pantalla, saludara y se sentara con un portátil, con un movimiento vivo, no robótico.

**Primera versión, SVG por piezas.** En lugar de keyframes, cada articulación es un muelle amortiguado que persigue su objetivo: los cambios de pose tienen inercia, se pasan un poco y se asientan solos. Encima van capas procedurales (temblor de esfuerzo, pataleo, saludo, tecleo, respiración). Al trepar, los guantes quedan clavados en el borde y los brazos se calculan con cinemática inversa.

**Segunda versión, 3D.** Un modelo generado con IA (malla con textura, sin esqueleto) que riggeo con un script propio: normaliza la malla, crea el esqueleto, calcula los pesos por regiones (el pelo se detecta por el color de la textura) y la optimiza. La anima el mismo sistema de muelles, con IK de dos huesos. La versión SVG se queda como respaldo sin WebGL.

| Problema | Causa | Solución |
|---|---|---|
| El borde por el que trepa aparecía a media altura | R3F orienta la cámara con `lookAt(0,0,0)` si no tiene rotación | Rotación explícita en la cámara ortográfica |
| Animación a cámara lenta en equipos lentos | Paso de tiempo limitado por frame | Muelles con subpasos de 1/60 s |
| ESLint (React Compiler) prohíbe leer refs anidadas durante el render | Registro de nodos en un objeto | Callback refs estables (`runtime.ts`) |
| Al saludar, el brazo arrastraba una "sábana" del traje | En el modelo, los brazos están fundidos con el traje donde rozan la cadera | Los pesos del brazo solo se asignan fuera del ancho del torso, y la zona de contacto pasa al torso de forma gradual |
| El primer modelo no se podía usar en la UE | Lo generé con Hunyuan3D, cuya licencia excluye la Unión Europea | Lo sustituí por uno de Meshy (CC BY 4.0) y adapté el rig a sus medidas |

Para verificar la animación grabé la secuencia completa con el screencast de Chrome (las capturas sueltas con render por software se saltaban fotogramas) y usé un laboratorio de poses en `/es/dev/mascot`, disponible solo en desarrollo.

---

## Contenido y CV

Todo el contenido sale de fuentes únicas: ficheros tipados y bilingües para la web, la base de conocimiento para el chatbot y `cv/cv.json` para el CV, que `cv/build.py` convierte en PDF de dos páginas en español e inglés con Chrome sin ventana. Así, cuando cambio mi experiencia o un proyecto, sé exactamente qué tres sitios actualizar.
