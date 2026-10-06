"use client";

import { motion } from "motion/react";
import { Download, ExternalLink, Mail } from "lucide-react";
import { GithubIcon as Github, LinkedinIcon as Linkedin } from "@/components/ui/BrandIcons";
import { useLocale, useTranslations } from "next-intl";
import { Lamp } from "@/components/aceternity/Lamp";
import { ShootingStars } from "@/components/aceternity/ShootingStars";
import { CopyEmailButton } from "@/components/ui/CopyEmailButton";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { revealUp, stagger, viewportOnce } from "@/lib/motion";

/** 08 · Transmission — contact. */
export function Contact() {
  const t = useTranslations("contact");
  const locale = useLocale() as Locale;
  const mailto = `mailto:${siteConfig.email}?subject=${encodeURIComponent(t("mailSubject"))}`;

  const channel = "glass flex min-h-14 flex-col justify-between gap-6 rounded-2xl p-6 text-left transition-colors hover:border-line-strong";

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative overflow-hidden py-32 md:py-44">
      <ShootingStars />
      <Lamp />
      <div className="container-page relative">
        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="visible" viewport={viewportOnce} className="mx-auto max-w-3xl text-center">
          <motion.p variants={revealUp} className="label-mono mb-5 text-cyan">{t("orbit")}</motion.p>
          <motion.h2 variants={revealUp} id="contact-title" className="display-xl text-glow">{t("title")}</motion.h2>
          <motion.p variants={revealUp} className="mt-6 text-lg text-ink-soft text-pretty">{t("sub")}</motion.p>
        </motion.div>

        <motion.ul variants={stagger()} initial="hidden" whileInView="visible" viewport={viewportOnce} className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.li variants={revealUp} className={`${channel} border-violet/40 glow-violet`}>
            <div>
              <Mail className="mb-3 size-5 text-violet-soft" aria-hidden />
              <p className="label-mono text-ink-muted">{t("labels.email")}</p>
              <p className="mt-1 break-all text-sm text-ink">{siteConfig.email}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <CopyEmailButton label={t("copyEmail")} copiedLabel={t("copied")} className="min-h-10 text-cyan hover:underline" />
              <a href={mailto} className="inline-flex min-h-10 items-center gap-1 text-ink-soft hover:text-ink">{t("openMail")}</a>
            </div>
          </motion.li>
          <motion.li variants={revealUp}>
            <a href={siteConfig.socials.linkedin} target="_blank" rel="noopener noreferrer" className={`${channel} h-full`}>
              <div>
                <Linkedin className="mb-3 size-5 text-violet-soft" aria-hidden />
                <p className="label-mono text-ink-muted">{t("labels.linkedin")}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm text-cyan">{t("viewProfile")} <ExternalLink className="size-3.5" aria-hidden /></span>
            </a>
          </motion.li>
          <motion.li variants={revealUp}>
            <a href={siteConfig.socials.github} target="_blank" rel="noopener noreferrer" className={`${channel} h-full`}>
              <div>
                <Github className="mb-3 size-5 text-violet-soft" aria-hidden />
                <p className="label-mono text-ink-muted">{t("labels.github")}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm text-cyan">{t("viewProfile")} <ExternalLink className="size-3.5" aria-hidden /></span>
            </a>
          </motion.li>
          <motion.li variants={revealUp}>
            <a href={siteConfig.cv[locale]} download className={`${channel} h-full`}>
              <div>
                <Download className="mb-3 size-5 text-violet-soft" aria-hidden />
                <p className="label-mono text-ink-muted">{t("labels.cv")}</p>
              </div>
              <span className="text-sm text-cyan">{t("downloadCv")}</span>
            </a>
          </motion.li>
        </motion.ul>

        <p className="label-mono mt-12 text-center text-ink-muted">{t("location")}</p>
      </div>
    </section>
  );
}
