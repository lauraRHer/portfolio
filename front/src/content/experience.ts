import type { ExperienceEntry } from "./types";

/** Timeline entries, newest first. Source of truth: cv/cv.json. */
export const experience: ExperienceEntry[] = [
  {
    id: "cartif-dev",
    kind: "work",
    start: "2023-06",
    end: null,
    organization: "CARTIF",
    role: { es: "Desarrolladora Full-Stack", en: "Full-Stack Developer" },
    location: { es: "Boecillo (Valladolid)", en: "Boecillo (Valladolid, Spain)" },
    bullets: {
      es: [
        "Desarrollo más de 8 aplicaciones web de visualización y análisis de datos con Angular y Python/FastAPI, desde la interfaz hasta la base de datos.",
        "Convierto modelos de predicción en herramientas web: mapas con Leaflet, gráficas con ECharts y Plotly.js, y cálculos asíncronos con Celery.",
        "Diseño APIs REST y bases de datos geoespaciales (PostgreSQL/PostGIS); he desarrollado de principio a fin una aplicación interna con Keycloak y doble factor.",
        "Calidad y entrega continua con Cypress, pytest, SonarQube, Docker y CI/CD, trabajando con Scrum y formando a becarios y juniors.",
      ],
      en: [
        "Develop 8+ data visualisation and analysis web applications with Angular and Python/FastAPI, from the user interface to the database.",
        "Turn prediction models into web tools: Leaflet maps, ECharts and Plotly.js charts, and asynchronous calculations with Celery.",
        "Design REST APIs and geospatial databases (PostgreSQL/PostGIS); built an internal application end to end with Keycloak and two-factor authentication.",
        "Quality and continuous delivery with Cypress, pytest, SonarQube, Docker and CI/CD, working in Scrum and mentoring interns and juniors.",
      ],
    },
    link: "#projects",
  },
  {
    id: "cartif-intern",
    kind: "work",
    start: "2023-03",
    end: "2023-05",
    organization: "CARTIF",
    role: { es: "Desarrolladora web en prácticas", en: "Web Developer Intern" },
    location: { es: "Boecillo (Valladolid)", en: "Boecillo (Valladolid, Spain)" },
    summary: {
      es: "Desarrollé funcionalidades completas para la intranet corporativa con Angular, .NET y PostgreSQL, trabajando con autorización segura basada en JWT y despliegue mediante CI/CD.",
      en: "Built end-to-end features for the corporate intranet with Angular, .NET and PostgreSQL, working with secure JWT-based authorisation and CI/CD deployment.",
    },
  },
  {
    id: "ies-galileo",
    kind: "education",
    start: "2021-09",
    end: "2023-06",
    organization: "IES Galileo",
    role: {
      es: "Técnico Superior en Desarrollo de Aplicaciones Web",
      en: "Higher Vocational Diploma in Web Application Development",
    },
    location: { es: "Valladolid", en: "Valladolid, Spain" },
  },
];
