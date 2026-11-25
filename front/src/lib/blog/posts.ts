import "server-only";

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { constellations, type ConstellationId, type Heading, type PostSummary } from "@/content/blog";
import { routing, type Locale } from "@/i18n/routing";
import { slugify } from "./slugify";

/**
 * Reads the blog from `front/content/blog/<slug>/`:
 *   post.yaml   shared data (date, constellation, tags, project, star, draft)
 *   es.md       frontmatter (title, excerpt, assistantSummary) + body
 *   en.md       same, in English
 *
 * `assistantSummary` is only for the chatbot (exported to back/knowledge by
 * scripts/export-blog-knowledge.mjs). It is dropped here, so no component can
 * ever render it. Errors are thrown at build time with the offending file.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const WORDS_PER_MINUTE = 220;
const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

/** Drafts show in `next dev`; in production only with BLOG_DRAFTS=true. */
const showDrafts = process.env.NODE_ENV !== "production" || process.env.BLOG_DRAFTS === "true";

type LoadedPost = {
  meta: Omit<PostSummary, "title" | "excerpt" | "readingMinutes" | "slug">;
  locales: Record<Locale, { title: string; excerpt: string; body: string }>;
};

let cache: Map<string, LoadedPost> | null = null;

function fail(file: string, message: string): never {
  throw new Error(`[blog] ${path.relative(process.cwd(), file)}: ${message}`);
}

function requireString(data: Record<string, unknown>, key: string, file: string): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) fail(file, `falta "${key}" (texto)`);
  return value.trim();
}

function readPost(slug: string): LoadedPost | null {
  const dir = path.join(BLOG_DIR, slug);
  const metaFile = path.join(dir, "post.yaml");
  if (!fs.existsSync(metaFile)) fail(dir, "falta post.yaml");
  const raw = YAML.parse(fs.readFileSync(metaFile, "utf8")) ?? {};

  if (raw.draft === true && !showDrafts) return null;

  const date = raw.date instanceof Date ? raw.date.toISOString().slice(0, 10) : String(raw.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(metaFile, `"date" debe ser YYYY-MM-DD`);
  if (!(raw.constellation in constellations)) {
    fail(metaFile, `"constellation" debe ser una de: ${Object.keys(constellations).join(", ")}`);
  }
  const star = raw.star;
  if (star !== undefined && !(Array.isArray(star) && star.length === 2 && star.every((n: unknown) => typeof n === "number" && n >= 0 && n <= 1))) {
    fail(metaFile, `"star" debe ser [x, y] con valores entre 0 y 1`);
  }

  const locales = {} as LoadedPost["locales"];
  for (const locale of routing.locales) {
    const file = path.join(dir, `${locale}.md`);
    // Every post must exist in every language.
    if (!fs.existsSync(file)) fail(dir, `falta ${locale}.md (cada artículo va en todos los idiomas)`);
    const text = fs.readFileSync(file, "utf8");
    const match = FRONTMATTER.exec(text);
    if (!match) fail(file, "falta el frontmatter (--- … ---)");
    const front = YAML.parse(match[1]) ?? {};
    requireString(front, "assistantSummary", file); // validated, never returned
    locales[locale] = {
      title: requireString(front, "title", file),
      excerpt: requireString(front, "excerpt", file),
      body: text.slice(match[0].length).trim(),
    };
  }

  return {
    meta: {
      date,
      constellation: raw.constellation as ConstellationId,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      project: typeof raw.project === "string" ? raw.project : undefined,
      star: star as [number, number] | undefined,
      draft: raw.draft === true || undefined,
    },
    locales,
  };
}

function loadAll(): Map<string, LoadedPost> {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const map = new Map<string, LoadedPost>();
  if (fs.existsSync(BLOG_DIR)) {
    for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.name)) fail(path.join(BLOG_DIR, entry.name), "el slug va en minúsculas y con guiones");
      const post = readPost(entry.name);
      if (post) map.set(entry.name, post);
    }
  }
  cache = map;
  return map;
}

function readingMinutes(body: string): number {
  const words = body.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function toSummary(slug: string, post: LoadedPost, locale: Locale): PostSummary {
  const l = post.locales[locale];
  return { slug, title: l.title, excerpt: l.excerpt, readingMinutes: readingMinutes(l.body), ...post.meta };
}

/** All visible posts, newest first. */
export function getPosts(locale: Locale): PostSummary[] {
  return [...loadAll()]
    .map(([slug, post]) => toSummary(slug, post, locale))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostSlugs(): string[] {
  return [...loadAll().keys()];
}

/** `##` headings of the body, for the table of contents. */
function extractHeadings(body: string): Heading[] {
  const withoutCode = body.replace(/```[\s\S]*?```/g, "");
  return [...withoutCode.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1].replace(/[*_`]/g, "").trim();
    return { id: slugify(text), text };
  });
}

export function getPost(locale: Locale, slug: string) {
  const post = loadAll().get(slug);
  if (!post) return null;
  const body = post.locales[locale].body;
  return { post: toSummary(slug, post, locale), body, headings: extractHeadings(body) };
}
