"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { sections } from "@/content/sections";
import type { UiMessage } from "@/lib/chat/useChat";
import { cn } from "@/lib/utils";
import { CopyEmailButton } from "../ui/CopyEmailButton";

const sectionKey = Object.fromEntries(sections.map((s) => [s.id, s.key])) as Record<string, (typeof sections)[number]["key"]>;

type Props = {
  message: UiMessage;
  onRetry: () => void;
  onSuggestion: (text: string) => void;
  suggestions: string[];
};

/** One chat bubble. Assistant answers render limited markdown + source chips. */
export function ChatMessage({ message: m, onRetry, onSuggestion, suggestions }: Props) {
  const t = useTranslations("chat");
  const tNav = useTranslations("nav");
  const isUser = m.role === "user";

  if (m.error) {
    return (
      <div className="max-w-[90%] rounded-2xl border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-ink-soft">
        <p>{m.error === "rate_limited" ? t("rateLimit") : t("error")}</p>
        <div className="mt-2 flex gap-4">
          <button type="button" onClick={onRetry} className="text-cyan hover:underline">{t("retry")}</button>
          <CopyEmailButton label={t("copyEmail")} copiedLabel={t("copied")} className="text-ink-soft hover:text-ink" />
        </div>
      </div>
    );
  }

  const sources = (m.meta?.sources ?? []).filter((s) => s.section && sectionKey[s.section]);
  const uniqueSections = [...new Set(sources.map((s) => s.section as string))];

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "rounded-br-md bg-violet/25 text-ink" : "glass rounded-bl-md text-ink-soft",
        )}
      >
        <span className="sr-only">{isUser ? t("you") : t("assistant")}: </span>
        {isUser ? (
          m.content
        ) : m.content ? (
          <div className="prose-chat">
            <ReactMarkdown
              allowedElements={["p", "strong", "em", "ul", "ol", "li", "a", "br", "code"]}
              // headings, tables, code blocks… keep their text instead of vanishing
              unwrapDisallowed
              components={{
                a: ({ href, children }) => (
                  <a href={href} className="text-cyan underline" target={href?.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {m.content}
            </ReactMarkdown>
            {m.streaming && <span aria-hidden className="ml-0.5 inline-block animate-blink text-violet-soft">▍</span>}
          </div>
        ) : (
          <TypingDots />
        )}

        {!m.streaming && uniqueSections.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
            <span className="label-mono text-[0.62rem] text-ink-muted">{t("sources")}:</span>
            {uniqueSections.map((s) => (
              <a key={s} href={`#${s}`} className="rounded-md border border-cyan/30 px-1.5 py-0.5 font-mono text-[0.65rem] text-cyan hover:bg-cyan/10">
                {tNav(sectionKey[s])}
              </a>
            ))}
          </div>
        )}

        {!m.streaming && m.meta?.kind === "refusal" && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => onSuggestion(s)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-violet hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pulsing dots; after a few seconds adds a "still thinking" hint (local CPU models can be slow). */
function TypingDots() {
  const t = useTranslations("chat");
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <span className="flex items-center gap-3 py-1.5">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-pulse-dot rounded-full" style={{ animationDelay: `${i * 0.18}s`, background: i === 1 ? "#a78bfa" : "#22d3ee" }} />
        ))}
      </span>
      {slow && <span className="text-xs text-ink-muted">{t("slow")}</span>}
    </span>
  );
}
