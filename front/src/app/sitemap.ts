import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

/** One entry per locale. Future: add /projects/[slug] pages from src/content/projects.ts. */
export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: `${siteConfig.url}/${locale}`,
    lastModified: new Date(),
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteConfig.url}/${l}`])) },
  }));
}
