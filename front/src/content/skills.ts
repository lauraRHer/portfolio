import type { SkillGroup } from "./types";

/** Skill constellations. Source of truth: cv/cv.json. */
export const skillGroups: SkillGroup[] = [
  {
    id: "frontend",
    name: { es: "Frontend", en: "Frontend" },
    accent: "violet",
    items: ["Angular", "TypeScript", "ng-zorro / PrimeNG / Clarity", "Leaflet", "ECharts", "Plotly.js", "Figma"],
  },
  {
    id: "backend",
    name: { es: "Backend y datos", en: "Backend & data" },
    accent: "violet",
    items: ["Python", "FastAPI", "PostgreSQL + PostGIS", "Celery", "Keycloak", ".NET"],
  },
  {
    id: "ai",
    name: { es: "IA", en: "AI" },
    accent: "cyan",
    items: [
      { es: "LLMs locales (Ollama)", en: "Local LLMs (Ollama)" },
      { es: "Modelos de visión", en: "Vision models" },
      "RAG",
      "LlamaIndex",
      "LangGraph",
      { es: "Agentes de codificación", en: "Coding agents" },
    ],
  },
  {
    id: "quality",
    name: { es: "Calidad y operaciones", en: "Quality & ops" },
    accent: "magenta",
    items: ["Git", "CI/CD", "Docker", "Cypress", "pytest", "SonarQube", "Linux"],
  },
];

export const foundations = [
  { es: "Fundamentos de ML y deep learning", en: "ML & deep learning foundations" },
  { es: "Datos geoespaciales", en: "Geospatial data" },
  { es: "Scrum", en: "Scrum" },
  { es: "Mentoría de juniors", en: "Mentoring juniors" },
];
