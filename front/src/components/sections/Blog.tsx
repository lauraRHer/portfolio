"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PostRow } from "@/components/blog/PostRow";
import { StarMap } from "@/components/blog/StarMap";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { PostSummary } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { revealUp, viewportOnce } from "@/lib/motion";

const LATEST = 3;

/** 08 · Logbook — a corner of the star map next to the latest posts. */
export function Blog({ posts }: { posts: PostSummary[] }) {
  const t = useTranslations("blog");
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Section id="blog">
      <SectionHeader id="blog" orbit={t("orbit")} title={t("title")} intro={t("intro")} />
      <motion.div variants={revealUp} initial="hidden" whileInView="visible" viewport={viewportOnce} className="grid items-start gap-10 lg:grid-cols-[5fr_6fr]">
        <StarMap posts={posts} variant="compact" active={hovered} onHover={setHovered} />
        <div>
          <ul className="divide-y divide-line">
            {posts.slice(0, LATEST).map((p) => (
              <li key={p.slug}>
                <PostRow post={p} active={hovered === p.slug} onHover={setHovered} />
              </li>
            ))}
          </ul>
          <Link
            href="/blog"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-violet/50 bg-violet/10 px-5 text-sm font-medium text-ink transition-shadow hover:glow-violet"
          >
            {t("openMap")} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </motion.div>
    </Section>
  );
}
