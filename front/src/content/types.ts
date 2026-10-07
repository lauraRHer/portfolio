import type { Locale } from "@/i18n/routing";

/** A value translated into every supported locale. */
export type I18n<T = string> = Record<Locale, T>;

export type Accent = "violet" | "cyan" | "magenta";

export type ProjectCategory = "ai" | "web" | "backend" | "testing";

/**
 * Project entry — see docs/guides/anadir-un-proyecto.md.
 * The grid, filters, sitemap and (future) /projects/[slug] pages derive from it.
 */
export interface Project {
  /** URL-safe id, used for /projects/[slug] in the future. */
  slug: string;
  /** `example` shows the EJEMPLO/EXAMPLE badge, `in-progress` the EN DESARROLLO one. */
  status: "real" | "example" | "in-progress";
  /** First and wide card in the grid. */
  featured?: boolean;
  /** Manual sort (ascending). */
  order: number;
  title: I18n;
  /** ≤ 140 chars, shown on the card. */
  summary: I18n;
  /** Optional: only shown when known. */
  year?: number;
  context?: "professional" | "personal" | "academic";
  organization?: string;
  categories: ProjectCategory[];
  stack: string[];
  highlights?: I18n<string[]>;
  accent?: Accent;
  links?: { demo?: string; repo?: string; caseStudy?: string };
  /** Hides repo links and shows a "no confidential code" note. */
  confidential?: boolean;
}

export interface ExperienceEntry {
  id: string;
  kind: "work" | "education";
  start: string; // ISO yyyy-mm
  end: string | null; // null = present
  role: I18n;
  organization: string;
  location: I18n;
  summary?: I18n;
  bullets?: I18n<string[]>;
  /** Optional in-page anchor (e.g. "#case-study"). */
  link?: string;
}

export interface SkillGroup {
  id: string;
  name: I18n;
  accent: Accent;
  /** Plain strings are language-neutral (tech names). */
  items: (string | I18n)[];
}

export interface Service {
  id: "ai" | "web" | "maps" | "api";
  title: I18n;
  description: I18n;
  tags: string[];
  accent: Accent;
}

export interface Credential {
  id: string;
  title: I18n;
  issuer: string;
  year: string;
  description: I18n;
  credentialUrl?: string;
  kind: "degree" | "certification";
}

/** Helper to read a localized value. */
export const tr = <T,>(value: I18n<T>, locale: Locale): T => value[locale];
