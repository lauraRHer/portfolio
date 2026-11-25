/**
 * Blog ("Bitácora") — client-safe types and constellation config.
 * Posts live in `front/content/blog/<slug>/` and are read on the server by
 * `src/lib/blog/posts.ts`. Nothing here may hold the assistant summary.
 */

/** Constellation = topic. `anchor` is where its stars gather on the map (0–1). */
export const constellations = {
  rag: { accent: "cyan", anchor: [0.26, 0.4] },
  front: { accent: "magenta", anchor: [0.72, 0.58] },
  architecture: { accent: "violet", anchor: [0.46, 0.78] },
} as const;

export type ConstellationId = keyof typeof constellations;
export const constellationIds = Object.keys(constellations) as ConstellationId[];

/** SVG can't read Tailwind utilities: same values as the @theme tokens. */
export const accentHex = { cyan: "#22d3ee", magenta: "#e040fb", violet: "#a78bfa" } as const;

/** What the UI receives for each post. Deliberately has no assistant summary. */
export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  readingMinutes: number;
  constellation: ConstellationId;
  tags: string[];
  /** Slug from src/content/projects.ts, if the post is about one. */
  project?: string;
  /** Manual star position (0–1) when the automatic layout isn't good enough. */
  star?: [number, number];
  /** Only visible in development (or with BLOG_DRAFTS=true). */
  draft?: boolean;
};

export type Heading = { id: string; text: string };
