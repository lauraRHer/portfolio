import { siteConfig } from "@/config/site";

/** schema.org Person structured data. */
export function PersonJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    jobTitle: "Full-Stack Developer · AI Engineer",
    email: `mailto:${siteConfig.email}`,
    url: siteConfig.url,
    address: { "@type": "PostalAddress", addressLocality: "Valladolid", addressCountry: "ES" },
    sameAs: [siteConfig.socials.linkedin, siteConfig.socials.github],
    knowsAbout: ["Angular", "TypeScript", "Python", "FastAPI", "PostgreSQL", "PostGIS", "Leaflet", "Keycloak", "Docker", "RAG", "Ollama", "LlamaIndex"],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
