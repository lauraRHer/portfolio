/**
 * Ordered list of page sections after the hero.
 * Drives the navbar, the scroll "trajectory" and the mobile menu.
 * `key` maps to the `nav.<key>` translation.
 */
export const sections = [
  { id: "core", key: "core", inNav: true },
  { id: "services", key: "services", inNav: true },
  { id: "stack", key: "stack", inNav: true },
  { id: "experience", key: "experience", inNav: true },
  { id: "case-study", key: "caseStudy", inNav: false },
  { id: "projects", key: "projects", inNav: true },
  { id: "learning", key: "learning", inNav: false },
  { id: "contact", key: "contact", inNav: true },
] as const;

export type SectionId = (typeof sections)[number]["id"];
