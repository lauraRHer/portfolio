# 0003 · next-intl sin su plugin de Next

**Contexto.** `createNextIntlPlugin()` importa `@swc/core` al cargarse (lo usa para la extracción experimental de mensajes). El binario nativo de SWC se descomprime en `~/.cache` y se niega a cargar si algún directorio padre es escribible por otros usuarios. En mi máquina de desarrollo el directorio personal tiene permisos 0770, así que `next dev`, `next build` y `next typegen` fallaban.

**Decisión.** No usar el plugin y registrar a mano lo único que hacía en este proyecto: el alias `next-intl/config → ./src/i18n/request.ts` en `turbopack.resolveAlias` (`front/next.config.ts`).

**Consecuencias.**
- ➕ Funciona sin depender de permisos del sistema ni de un binario nativo.
- ➖ Si se quieren las funciones experimentales de next-intl (extracción o precompilación de mensajes), habrá que volver al plugin y resolver los permisos (por ejemplo `chmod 750 ~`) o definir `SWC_NATIVE_BINDING_CACHE` con un directorio seguro.
