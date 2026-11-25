"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { OPEN_ASSISTANT_EVENT } from "@/lib/chat/events";

/** Opens the chat with a suggested question about this post. */
export function AskAssistant({ title }: { title: string }) {
  const t = useTranslations("blog");
  const question = t("askQuestion", { title });

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: { question } }))}
      className="flex w-full items-center gap-3 rounded-2xl border border-cyan/35 bg-cyan/[0.06] p-4 text-left text-ink-soft transition-colors hover:bg-cyan/10"
    >
      <Sparkles className="size-5 shrink-0 text-cyan" aria-hidden />
      <span>
        <span className="font-medium text-cyan">{t("askTitle")}</span> {t("askBody")}
      </span>
    </button>
  );
}
