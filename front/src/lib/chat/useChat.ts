"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "./api";
import { ChatApiError, type ChatMeta, type ChatTurn } from "./types";

export type UiMessage = ChatTurn & {
  id: string;
  meta?: ChatMeta;
  streaming?: boolean;
  error?: "rate_limited" | "generic";
};

export type ChatStatus = "idle" | "streaming";

const STORAGE_KEY = "lrh:chat";
/** How many previous turns we send for conversational context. */
const HISTORY_TURNS = 6;

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Chat state machine: optimistic user bubble → empty assistant bubble that
 * fills token by token. Conversation lives in sessionStorage only
 * (nothing persisted beyond the session).
 */
export function useChat(locale: string) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (status === "streaming") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.error)));
    } catch {
      /* ignore */
    }
  }, [messages, status]);

  const patchLast = (fn: (m: UiMessage) => UiMessage) =>
    setMessages((prev) => (prev.length ? [...prev.slice(0, -1), fn(prev[prev.length - 1])] : prev));

  /** Sends `text` on top of the conversation `base` (lets retry drop the failed turn). */
  const run = useCallback(
    async (base: UiMessage[], text: string) => {
      const message = text.trim();
      if (!message || status === "streaming") return;

      const history: ChatTurn[] = base
        .filter((m) => !m.error && m.content)
        .slice(-HISTORY_TURNS)
        .map(({ role, content }) => ({ role, content }));

      setMessages([
        ...base,
        { id: uid(), role: "user", content: message },
        { id: uid(), role: "assistant", content: "", streaming: true },
      ]);
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          { message, history, locale },
          {
            signal: controller.signal,
            onMeta: (meta) => patchLast((m) => ({ ...m, meta })),
            onToken: (t) => patchLast((m) => ({ ...m, content: m.content + t })),
          },
        );
        patchLast((m) => ({ ...m, streaming: false }));
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          patchLast((m) => ({ ...m, streaming: false }));
        } else {
          const error = e instanceof ChatApiError && e.code === "rate_limited" ? "rate_limited" : "generic";
          patchLast((m) => ({ ...m, streaming: false, error }));
        }
      } finally {
        abortRef.current = null;
        setStatus("idle");
      }
    },
    [status, locale],
  );

  const send = useCallback((text: string) => run(messages, text), [run, messages]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Re-send the last user message after an error. */
  const retry = useCallback(() => {
    const idx = messages.findLastIndex((m) => m.role === "user");
    if (idx === -1) return;
    run(messages.slice(0, idx), messages[idx].content);
  }, [messages, run]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, status, send, stop, retry, reset };
}
