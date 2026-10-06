/**
 * Global site configuration — personal data, links and external endpoints.
 * ⚠️ Values marked TODO must be replaced before launch.
 */
export const siteConfig = {
  name: "Laura Rodrigo Hernando",
  shortName: "LRH",
  email: "laurarodrigohernando@gmail.com",
  location: "Valladolid, España",
  // `||` (not `??`): an empty variable copied from .env.example falls back too
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  socials: {
    linkedin: "https://www.linkedin.com/in/laura-rodrigo-hernando-77b736226",
    github: "https://github.com/lauraRHer",
  },
  /** CV per locale (generated from cv/cv.json with `python3 cv/build.py --publish`). */
  cv: {
    es: "/cv/laura-rodrigo-hernando-cv-es.pdf",
    en: "/cv/laura-rodrigo-hernando-cv-en.pdf",
  },
} as const;

/**
 * FastAPI backend base URL (chatbot).
 * NEXT_PUBLIC_API_URL wins; otherwise, in the browser, the API is assumed on
 * port 8000 of the same host the site was opened from — so it also works
 * from a phone on the LAN (http://192.168.x.x:3000 → http://192.168.x.x:8000).
 */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}
