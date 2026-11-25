import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogExplorer } from "@/components/blog/BlogExplorer";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import type { Locale } from "@/i18n/routing";
import { getPosts } from "@/lib/blog/posts";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { es: "/es/blog", en: "/en/blog", "x-default": "/es/blog" },
      types: { "application/rss+xml": `/${locale}/blog/rss.xml` },
    },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), type: "website" },
  };
}

/** /[locale]/blog — the logbook as a star map, with the full list below. */
export default async function BlogIndexPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const posts = getPosts(locale as Locale);

  return (
    <>
      <Navbar current="blog" />
      <main className="container-page pb-32 pt-32 md:pt-40">
        <header className="mb-12 max-w-3xl">
          <p className="label-mono mb-5 flex items-center gap-3 text-violet-soft">
            <span aria-hidden className="h-px w-6 bg-violet-soft/60" />
            {t("indexEyebrow")}
          </p>
          <h1 className="display-lg text-balance">{t("indexTitle")}</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft text-pretty">{t("indexIntro")}</p>
        </header>
        <BlogExplorer posts={posts} />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
