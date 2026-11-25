import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { routing, type Locale } from "@/i18n/routing";
import { getPosts } from "@/lib/blog/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed per locale: /es/blog/rss.xml, /en/blog/rss.xml. */
export async function GET(_req: Request, { params }: RouteContext<"/[locale]/blog/rss.xml">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const base = `${siteConfig.url}/${locale}/blog`;
  const items = getPosts(locale as Locale)
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${base}/${p.slug}</link>
      <guid>${base}/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(p.excerpt)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(t("metaTitle"))}</title>
    <link>${base}</link>
    <description>${escape(t("metaDescription"))}</description>
    <language>${locale}</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
