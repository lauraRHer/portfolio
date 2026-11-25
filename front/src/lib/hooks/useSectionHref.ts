"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";

/**
 * Href to a home section: `#id` on the home page, `/<locale>#id` elsewhere
 * (blog pages), so the shared navbar, footer and chat work on every page.
 */
export function useSectionHref() {
  const locale = useLocale();
  const pathname = usePathname();
  const onHome = pathname === "/";
  return (id: string) => {
    if (onHome) return `#${id}`;
    // Inside the blog, "Logbook" means the blog index, not the home teaser.
    if (id === "blog") return `/${locale}/blog`;
    return `/${locale}#${id}`;
  };
}
