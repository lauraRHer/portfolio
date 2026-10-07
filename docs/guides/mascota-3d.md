# Mascota 3D (astronauta)

El lanzador del chat es una astronauta en 3D (`front/src/components/mascot3d/`), hecha a partir de un **modelo GLB** generado con IA y riggeado por script (ver más abajo). Si el navegador no tiene WebGL, se usa la versión 2D en SVG (`components/mascot/`).

## Cómo está hecha

| Archivo | Qué hace |
|---|---|
| `AstronautGLB.tsx` | Carga `public/models/mascot.glb` y mueve sus huesos cada frame a partir de los muelles (`rig`) y las capas procedurales (`layers`). El pelo tiene un hueso propio con balanceo secundario |
| `Laptop.tsx` | El portátil que saca al sentarse |
| `rigState.ts` | Todos los valores animables como **muelles** (`SpringSet`) y las capas procedurales (escalada, temblor, pataleo, saludo, tecleo, hablar) |
| `springs.ts` | Muelles amortiguados con subpasos de 1/60 s: tiempo real a cualquier FPS, sin cámara lenta en equipos lentos |
| `ik.ts` | IK analítica de dos huesos: al trepar, los guantes quedan clavados en el borde de la pantalla |
| `runtime.ts` | Registro de los nodos animados (callback refs estables) |
| `Stage.tsx` | Canvas transparente con cámara ortográfica alineada con la pantalla (y = 0 es el borde inferior), luces de estudio y entorno local para los reflejos |
| `Mascot3D.tsx` | El **director**: guion asíncrono (trepar → «¡Uf!» → saludar → ir al marco → sentarse con el portátil → «Si me necesitas, estoy aquí» → acciones en reposo), hover y click |
| `MascotPreview.tsx` | Laboratorio de desarrollo en **`/es/dev/mascot`** (solo `npm run dev`): cámara orbital y botones para probar poses y capas |

### Retocar
- **Poses:** `POSES` en `Mascot3D.tsx`.
- **Tiempos del guion:** función `intro()` en `Mascot3D.tsx`.
- **Rigidez del movimiento:** `k` y `c` de cada muelle en `rigState.ts`. Más `k` = más rápido; menos `c` = más rebote.

---

## Modelo GLB actual

El modelo fuente es `front/assets/mascot/meshy_mascot.glb`: una malla estática con textura (base, normales y rugosidad), generada con **Meshy** (plan gratuito → licencia **CC BY 4.0**, hay que citar la herramienta: lo hace el pie de la web, el README y el `LICENSE`). No tiene esqueleto ni animaciones. Está fuera de `public/` para que no se despliegue.

> Se sustituyó un modelo anterior generado con Hunyuan3D porque su licencia comunitaria excluye la Unión Europea.

`npm run rig:mascot` (`front/scripts/rig-mascot.mjs`) genera `front/public/models/mascot.glb`:

1. **Simplifica** la malla con meshoptimizer (~150 000 → ~52 000 triángulos) y la **normaliza**: pies en y = 0, centrada, escala ×0.52 (≈ 1 unidad de alto).
2. **Crea el esqueleto** con las articulaciones que usa el director (`hips`, `spine`, `head`, `shL/elL`, `shR/elR`, `hipL/kneeL`, `hipR/kneeR`) y un hueso `hair`. Los huesos de las extremidades se orientan con su -y local a lo largo del miembro, así que **los ángulos del director valen tal cual**.
3. **Calcula los pesos de skinning por regiones**: el pelo se detecta por el color de la textura (marrón oscuro) y solo sigue a cabeza, columna y hueso del pelo, nunca a los brazos. Hombros, codos, caderas y rodillas se mezclan a lo largo del eje del miembro, y el trasero se queda con la pelvis al sentarse.
4. **Pinta el lunar de la frente** en la textura (`MOLE`). Los generadores de 3D a partir de imagen pierden los detalles pequeños, así que se pinta en 3D: cada píxel de la textura cercano se convierte en su punto de la superficie y se colorea si cae dentro del círculo. Así queda redondo aunque la frente esté repartida en varias piezas de la textura.
5. **Optimiza**: extiende cada pieza de la textura `GUTTER` píxeles hacia fuera (evita costuras claras al reducirla), quita el mapa de normales (sin tangentes dibujaba franjas de luz en las costuras de la cara y en un personaje cartoon apenas aporta), texturas WebP de 1024 px y geometría cuantizada (10 MB → 1,5 MB).

Particularidades:
- En el modelo de Meshy **los brazos están fundidos con el traje** donde rozan la cadera. Los pesos de los brazos solo se asignan fuera del ancho del torso (`TORSO_HALF_WIDTH`) y la zona de contacto pasa al torso de forma gradual, para que al levantar el brazo esa superficie se estire suave en lugar de rasgarse. `BACKPACK_FRONT` evita que la mochila siga a los brazos.
- **Sin expresiones faciales**: el modelo no tiene blendshapes. Al hablar, la cabeza asiente un poco.
- `ARM_SPLAY` (en `AstronautGLB.tsx`) abre los brazos 0.25 rad respecto a los ángulos del director, porque el torso chibi es más ancho.
- La pose `seated` del director usa `rootY: -0.28` (asiento justo en el borde) y codos a -0.35 (manos sobre el teclado).

### Cambiar de modelo
Las articulaciones (`JOINTS` en el script) están **medidas sobre esta malla**. Con un modelo nuevo:
1. Guarda el GLB en `front/assets/mascot/` y mide las articulaciones en coordenadas del modelo, mirando a +z. Sirve cualquier visor (p. ej. [gltf.report](https://gltf.report)) o un corte de vértices por alturas.
2. Ajusta `ORIGIN`, `JOINTS` y, si el pelo no es castaño, `isHairColour`.
3. `npm run rig:mascot` y copia en `AstronautGLB.tsx` las medidas que imprime el script (`SHOULDER`, `UPPER_ARM`, `FOREARM`).
4. Revisa las poses en `/es/dev/mascot`.
