import type { Service } from "./types";

export const services: Service[] = [
  {
    id: "ai",
    accent: "cyan",
    tags: ["RAG", "LlamaIndex", "LangGraph", "Ollama"],
    title: { es: "Aplicaciones con IA", en: "AI-powered applications" },
    description: {
      es: "Integro IA en aplicaciones reales: asistentes RAG que responden a partir de documentación propia, extracción automática de datos de imágenes y documentos, y flujos con modelos locales o en la nube.",
      en: "I bring AI into real applications: RAG assistants that answer from in-house documentation, automatic data extraction from images and documents, and workflows with local or cloud models.",
    },
  },
  {
    id: "web",
    accent: "violet",
    tags: ["Angular", "TypeScript", "FastAPI"],
    title: { es: "Aplicaciones web full-stack", en: "Full-stack web applications" },
    description: {
      es: "Aplicaciones web completas, de la idea a producción: diseño de la interfaz, frontend en Angular, APIs en Python y una experiencia de uso cuidada en cada pantalla.",
      en: "Complete web applications, from idea to production: interface design, Angular frontend, Python APIs and a polished user experience on every screen.",
    },
  },
  {
    id: "maps",
    accent: "magenta",
    tags: ["Leaflet", "PostGIS", "ECharts", "Plotly.js"],
    title: { es: "Mapas y visualización de datos", en: "Maps & data visualisation" },
    description: {
      es: "Mapas interactivos y gráficas que convierten datos complejos y resultados de modelos en algo que se entiende de un vistazo, con datos geoespaciales en PostGIS.",
      en: "Interactive maps and charts that turn complex data and model results into something you understand at a glance, with geospatial data in PostGIS.",
    },
  },
  {
    id: "api",
    accent: "violet",
    tags: ["FastAPI", "PostgreSQL", "Keycloak", "Docker"],
    title: { es: "APIs, datos y despliegue", en: "APIs, data & deployment" },
    description: {
      es: "APIs con FastAPI, bases de datos PostgreSQL, autenticación segura con Keycloak y despliegues automatizados con Docker y CI/CD.",
      en: "FastAPI APIs, PostgreSQL databases, secure authentication with Keycloak and automated deployments with Docker and CI/CD.",
    },
  },
];
