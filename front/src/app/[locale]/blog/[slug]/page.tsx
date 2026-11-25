import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import { ArticleToc } from "@/components/blog/ArticleToc";
import { AskAssistant } from "@/components/blog/AskAssistant";
import { formatPostDate } from "@/components/blog/format";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { accentHex, constellations } from "@/content/blog";
import { projects } from "@/content/projects";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getPost, getPosts, getPostSlugs } from "@/lib/blog/posts";
import { slugify } from "@/lib/blog/slugify";

// Every post is prerendered; unknown slugs are a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = getPost(locale as Locale, slug);
  if (!data) return {};
  const { post } = data;
  return {
    title: `${post.title} — Laura Rodrigo Hernando`,
    description: post.excerpt,
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: Object.fromEntries([...routing.locales.map((l) => [l, `/${l}/blog/${slug}`]), ["x-default", `/es/blog/${slug}`]]),
    },
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.date, authors: [siteConfig.name] },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

/** Markdown → portfolio typography. `##` get ids for the table of contents. */
const markdown: Components = {
  h2: ({ children }) => (
    <h2 id={slugify(textOf(children))} className="scroll-mt-28">
      {children}
    </h2>
  ),
  a: ({ href, children }) => {
    const external = /^https?:/.test(href ?? "");
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
};

export default async function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = getPost(locale as Locale, slug);
  if (!data) notFound();
  const { post, body, headings } = data;
  const t = await getTranslations("blog");
  const otherLocale = routing.locales.find((l) => l !== locale) ?? "en";
  const color = accentHex[constellations[post.constellation].accent];

  // Next post in the same constellation (older first after this one), else any older post.
  const all = getPosts(locale as Locale);
  const sameTopic = all.filter((p) => p.constellation === post.constellation && p.slug !== slug);
  const next = sameTopic.find((p) => p.date <= post.date) ?? sameTopic[0] ?? null;
  const project = post.project ? projects.find((p) => p.slug === post.project) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    inLanguage: locale,
    url: `${siteConfig.url}/${locale}/blog/${slug}`,
    author: { "@type": "Person", name: siteConfig.name, url: siteConfig.url },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar current="blog" />
      <main className="container-page pb-32 pt-32 md:pt-40">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <article className="min-w-0 max-w-[42rem]">
            <Link href="/blog" className="label-mono mb-10 inline-flex min-h-10 items-center gap-2 text-ink-muted transition-colors hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden /> {t("back")}
            </Link>
            <p className="label-mono mb-5 flex items-center gap-3" style={{ color }}>
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
              {t("indexEyebrow")} · {t(`constellations.${post.constellation}`)}
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance md:text-5xl">{post.title}</h1>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs uppercase tracking-[0.08em] text-ink-muted">
              <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
              <span>{t("readingTime", { n: post.readingMinutes })}</span>
              <Link href={`/blog/${slug}`} locale={otherLocale} lang={otherLocale} className="text-cyan hover:underline">
                {t("otherLanguage")}
              </Link>
            </p>
            <p className="mt-8 text-xl leading-relaxed text-ink text-pretty">{post.excerpt}</p>

            <div className="prose-blog mt-10">
              <ReactMarkdown components={markdown}>{body}</ReactMarkdown>
            </div>

            {post.tags.length > 0 && (
              <ul className="mt-12 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <li key={tag} className="rounded-md border border-line px-2 py-1 font-mono text-[0.72rem] text-ink-soft">
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-12 flex flex-col gap-4">
              <AskAssistant title={post.title} />
              {project && (
                <Link href="/#projects" className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-line-strong">
                  <span>
                    <span className="label-mono block text-ink-muted">{t("related")}</span>
                    <span className="mt-1 block font-semibold">{project.title[locale as Locale]}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-cyan" aria-hidden />
                </Link>
              )}
              {next && (
                <Link href={`/blog/${next.slug}`} className="group flex items-center gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-line-strong">
                  <svg aria-hidden viewBox="0 0 54 40" className="h-10 w-14 shrink-0">
                    <polyline points="8,30 26,18 46,10" fill="none" stroke={color} strokeOpacity={0.5} />
                    <circle cx="8" cy="30" r="3" fill="#a6a6c0" />
                    <circle cx="26" cy="18" r="4" fill="#f2f2f7" />
                    <circle cx="46" cy="10" r="3" fill={color} />
                  </svg>
                  <span className="min-w-0">
                    <span className="label-mono block text-ink-muted">{t("next")}</span>
                    <span className="mt-1 block font-display text-lg font-bold leading-snug group-hover:text-gradient">{next.title}</span>
                  </span>
                </Link>
              )}
            </div>
          </article>
          <aside>
            <ArticleToc headings={headings} />
          </aside>
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
