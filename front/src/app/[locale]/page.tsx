import { setRequestLocale } from "next-intl/server";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Hero } from "@/components/hero/Hero";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Trajectory } from "@/components/layout/Trajectory";
import { Blog } from "@/components/sections/Blog";
import { CaseStudy } from "@/components/sections/CaseStudy";
import { Contact } from "@/components/sections/Contact";
import { Core } from "@/components/sections/Core";
import { Experience } from "@/components/sections/Experience";
import { Horizon } from "@/components/sections/Horizon";
import { Projects } from "@/components/sections/Projects";
import { Services } from "@/components/sections/Services";
import { Stack } from "@/components/sections/Stack";
import { PersonJsonLd } from "@/components/seo/PersonJsonLd";
import type { SectionId } from "@/content/sections";
import type { Locale } from "@/i18n/routing";
import { getPosts } from "@/lib/blog/posts";

/**
 * Single-page portfolio. Section order = narrative order:
 * hero (galaxy) → dive into the star → core → … → contact.
 * To add a section: create it in components/sections, add it here and
 * register its id in src/content/sections.ts (nav + trajectory).
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = getPosts(locale as Locale);
  // No published posts yet → no blog section and no nav entry for it.
  const hidden: SectionId[] = posts.length ? [] : ["blog"];

  return (
    <>
      <PersonJsonLd />
      <Navbar hidden={hidden} />
      <Trajectory hidden={hidden} />
      <main>
        <Hero />
        <Core />
        <Services />
        <Stack />
        <Experience />
        <CaseStudy />
        <Projects />
        <Horizon />
        {posts.length > 0 && <Blog posts={posts} />}
        <Contact />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
