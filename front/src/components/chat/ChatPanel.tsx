"use client";

import { motion } from "motion/react";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { checkHealth } from "@/lib/chat/api";
import { useChat } from "@/lib/chat/useChat";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ChatMessage, EmailLink } from "./ChatMessage";

const MAX_CHARS = 500;

/** Assistant panel: desktop floating card, mobile full-screen sheet. */
export function ChatPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { messages, status, send, stop, retry, reset } = useChat(locale);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [stuckToBottom, setStuckToBottom] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = t.raw("suggestions") as string[];
  const placeholders = t.raw("placeholders") as string[];
  const streaming = status === "streaming";

  // Health check when opening.
  useEffect(() => {
    const ctrl = new AbortController();
    checkHealth(ctrl.signal).then(setOnline);
    inputRef.current?.focus();
    return () => ctrl.abort();
  }, []);

  // Rotating placeholder.
  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % placeholders.length), 3500);
    return () => clearInterval(id);
  }, [placeholders.length]);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-scroll unless the visitor scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (el && stuckToBottom) el.scrollTop = el.scrollHeight;
  }, [messages, stuckToBottom]);

  const submit = (text = input) => {
    if (!text.trim() || streaming) return;
    send(text.slice(0, MAX_CHARS));
    setInput("");
    setStuckToBottom(true);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal={isMobile}
      aria-labelledby="chat-title"
      initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9 }}
      animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
      exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9 }}
      transition={spring}
      style={{ transformOrigin: "bottom right" }}
      className={cn(
        "fixed z-[56] flex flex-col overflow-hidden border border-line bg-space-900/[0.97] backdrop-blur-xl elevation",
        isMobile ? "inset-0 rounded-none bg-space-950/95" : "bottom-6 right-6 h-[min(600px,calc(100vh-48px))] w-[400px] rounded-3xl",
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--grad-nebula)] font-display text-xs font-bold">
          LRH
        </span>
        <div className="flex-1">
          <h2 id="chat-title" className="text-sm font-semibold">{t("title")}</h2>
          <p className="font-mono text-[0.68rem] text-ink-muted">{t("subtitle")}</p>
        </div>
        <button type="button" onClick={reset} aria-label={t("reset")} title={t("reset")} className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:text-ink">
          <RotateCcw className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={onClose} aria-label={t("close")} className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:text-ink">
          <X className="size-5" aria-hidden />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-busy={streaming}
        onScroll={(e) => {
          const el = e.currentTarget;
          setStuckToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
        className="relative flex-1 space-y-4 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-4">
            <div>
              <p className="font-semibold">{t("greetingTitle")}</p>
              <p className="mt-1 text-sm text-ink-soft">{t("greetingBody")}</p>
            </div>
            {online === false ? (
              <OfflineNotice />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => submit(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-xs text-ink-soft transition-colors hover:border-violet hover:text-ink">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} onRetry={retry} onSuggestion={submit} suggestions={suggestions.slice(0, 2)} />
        ))}
      </div>

      {!stuckToBottom && (
        <button
          type="button"
          onClick={() => setStuckToBottom(true)}
          className="absolute bottom-36 left-1/2 -translate-x-1/2 rounded-full bg-space-700 px-3 py-1 text-xs text-ink shadow"
        >
          {t("newMessages")}
        </button>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t border-line p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-space-950/60 p-2 focus-within:border-violet">
          <label htmlFor="chat-input" className="sr-only">{t("inputLabel")}</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={MAX_CHARS}
            placeholder={placeholders[placeholderIdx]}
            disabled={online === false}
            className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none disabled:opacity-50"
          />
          {streaming ? (
            <button type="button" onClick={stop} aria-label={t("stop")} className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-space-700 text-ink">
              <Square className="size-3.5 fill-current" aria-hidden />
            </button>
          ) : (
            <button type="submit" aria-label={t("send")} disabled={!input.trim() || online === false} className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet text-white transition-opacity disabled:opacity-40">
              <ArrowUp className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[0.68rem] leading-snug text-ink-muted">{t("disclaimer")}</p>
      </form>
    </motion.div>
  );
}

function OfflineNotice() {
  const t = useTranslations("chat");
  return (
    <div className="rounded-xl border-l-2 border-danger bg-danger/5 p-3 text-sm text-ink-soft">
      <p>{t("offline")}</p>
      <div className="mt-2">
        <EmailLink />
      </div>
    </div>
  );
}
