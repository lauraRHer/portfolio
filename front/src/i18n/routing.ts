import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for supported locales.
 * Adding a locale = add it here + create `messages/<locale>.json`
 * + add the locale key to the `I18n` content type (src/content/types.ts).
 */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
