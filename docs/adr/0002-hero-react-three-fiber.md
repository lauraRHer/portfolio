# 0002 · Hero con React Three Fiber y shaders propios

**Contexto.** El hero debe ser una galaxia que gire de forma continua, reaccione a hover y click, se pueda arrastrar y "lleve" al usuario dentro de una estrella al hacer scroll.

**Decisión.** React Three Fiber con `Points` y un `ShaderMaterial` propio. Toda la interacción por partícula ocurre en el vertex shader; la CPU solo actualiza unos pocos uniforms por frame. Se carga con `next/dynamic` (`ssr: false`) detrás de un póster CSS.

**Alternativas.** Canvas 2D (más ligero, pero sin rotación 3D ni zoom creíble); librerías de partículas (tsparticles), sin control fino ni efecto de entrada en la estrella.

**Consecuencias.**
- ➕ Presupuesto de partículas por dispositivo (70k escritorio → 9k gama baja) y DPR adaptativo. Pendiente: medir FPS en hardware real (solo se ha probado en Chrome headless con render por software).
- ➕ three.js no penaliza el LCP: va en un chunk aparte.
- ➖ GLSL a mano: está documentado en `galaxy/shaders.ts` y los parámetros se centralizan en `galaxy/config.ts`.
