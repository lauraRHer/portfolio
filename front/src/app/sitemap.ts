import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getPosts } from "@/lib/blog/posts";

/** Home, blog index and every post, per locale with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts(routing.defaultLocale);
  const paths: { path: string; lastModified: Date }[] = [
    { path: "", lastModified: new Date() },
    ...(posts.length ? [{ path: "/blog", lastModified: new Date(`${posts[0].date}T00:00:00Z`) }] : []),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastModified: new Date(`${p.date}T00:00:00Z`) })),
  ];

  return paths.flatMap(({ path, lastModified }) =>
    routing.locales.map((locale) => ({
      url: `${siteConfig.url}/${locale}${path}`,
      lastModified,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteConfig.url}/${l}${path}`])) },
    })),
  );
}
