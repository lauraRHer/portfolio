/**
 * Chat API contract — mirrors back/app/api/schemas/chat.py.
 * See docs/API.md for the full SSE protocol.
 */
export type ChatRole = "user" | "assistant";

export type ChatTurn = { role: ChatRole; content: string };

/** How the backend classified the question. */
export type AnswerKind = "answer" | "greeting" | "refusal" | "no_info" | "busy" | "unavailable";

export type ChatSource = {
  id: string;
  title: string;
  /** Page section id (e.g. "experience") to link to. */
  section: string | null;
};

export type ChatMeta = { kind: AnswerKind; sources: ChatSource[] };

export type ChatRequest = {
  message: string;
  history: ChatTurn[];
  locale: string;
};

export class ChatApiError extends Error {
  constructor(
    public code: "rate_limited" | "network" | "server" | "bad_request",
    message: string,
  ) {
    super(message);
  }
}
