#!/usr/bin/env node
/**
 * Exports the blog to the assistant's knowledge base:
 *   front/content/blog/<slug>/{post.yaml,es.md,en.md}  →  back/knowledge/{es,en}/blog.md
 *
 * Only title, date, URL and `assistantSummary` go to the bot, never the body.
 * Drafts are skipped (pass --drafts to include them locally).
 *
 *   npm run blog:knowledge          write the files
 *   npm run blog:knowledge -- --check   fail if they are out of date (CI)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(root, "content", "blog");
const KNOWLEDGE_DIR = path.resolve(root, "..", "back", "knowledge");
const LOCALES = ["es", "en"];
const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

const args = new Set(process.argv.slice(2));
const includeDrafts = args.has("--drafts");
const check = args.has("--check");

const copy = {
  es: {
    title: "Bitácora (blog)",
    heading: (t) => `Artículo del blog de Laura: «${t}»`,
    intro: (date, url) => `Laura publicó este artículo en su bitácora (blog) el ${date}. Se puede leer en ${url}.`,
    date: (d) => new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d),
  },
  en: {
    title: "Logbook (blog)",
    heading: (t) => `Post on Laura's blog: "${t}"`,
    intro: (date, url) => `Laura published this post on her logbook (blog) on ${date}. It can be read at ${url}.`,
    date: (d) => new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d),
  },
};

function readPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(BLOG_DIR, e.name);
      const meta = YAML.parse(fs.readFileSync(path.join(dir, "post.yaml"), "utf8")) ?? {};
      const locales = Object.fromEntries(
        LOCALES.map((l) => {
          const text = fs.readFileSync(path.join(dir, `${l}.md`), "utf8");
          const front = YAML.parse(FRONTMATTER.exec(text)?.[1] ?? "") ?? {};
          if (!front.title || !front.assistantSummary) throw new Error(`${e.name}/${l}.md: faltan title o assistantSummary`);
          return [l, front];
        }),
      );
      return { slug: e.name, date: String(meta.date), draft: meta.draft === true, locales };
    })
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function render(locale, posts) {
  const c = copy[locale];
  const blocks = posts.map((p) => {
    const front = p.locales[locale];
    const url = `/${locale}/blog/${p.slug}`;
    const summary = String(front.assistantSummary).replace(/\s+/g, " ").trim();
    return `## ${c.heading(front.title)}\n${c.intro(c.date(new Date(`${p.date}T00:00:00Z`)), url)} ${summary}\n`;
  });
  return `---\ntitle: ${c.title}\nsection: blog\n---\n\n<!-- Generado por front/scripts/export-blog-knowledge.mjs. No editar a mano. -->\n\n${blocks.join("\n")}`;
}

const posts = readPosts();
let stale = false;
for (const locale of LOCALES) {
  const file = path.join(KNOWLEDGE_DIR, locale, "blog.md");
  const expected = posts.length ? render(locale, posts) : null;
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (expected === current) continue;
  if (check) {
    stale = true;
    console.error(`✗ ${path.relative(process.cwd(), file)} no está al día`);
    continue;
  }
  if (expected) fs.writeFileSync(file, expected);
  else fs.rmSync(file, { force: true });
  console.log(`${expected ? "✓ escrito" : "✓ borrado (sin artículos publicados)"} ${path.relative(process.cwd(), file)}`);
}
if (stale) {
  console.error("Ejecuta `npm run blog:knowledge` y reindexa el backend.");
  process.exit(1);
}
if (!check) console.log(`${posts.length} artículo(s) exportado(s)${includeDrafts ? " (con borradores)" : ""}.`);
