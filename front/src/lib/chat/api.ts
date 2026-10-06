import { getApiUrl } from "@/config/site";
import { ChatApiError, type ChatMeta, type ChatRequest } from "./types";

type Handlers = {
  onMeta?: (meta: ChatMeta) => void;
  onToken: (text: string) => void;
  signal?: AbortSignal;
};

/** GET /api/health — used to show the offline state before the first question. */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${getApiUrl()}/api/health`, { signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST /api/chat and consume the Server-Sent Events stream.
 * Events: `meta` (once, first) → `token`* → `done` | `error`.
 */
export async function streamChat(body: ChatRequest, { onMeta, onToken, signal }: Handlers): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ChatApiError("network", "Network error");
  }

  if (res.status === 429) throw new ChatApiError("rate_limited", "Too many requests");
  if (res.status === 422 || res.status === 400) throw new ChatApiError("bad_request", "Invalid request");
  if (!res.ok || !res.body) throw new ChatApiError("server", `HTTP ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    // SSE frames are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const { event, data } = parseFrame(frame);
      if (!data) continue;
      const payload = JSON.parse(data);
      if (event === "meta") onMeta?.(payload as ChatMeta);
      else if (event === "token") onToken(payload.text as string);
      else if (event === "error") throw new ChatApiError("server", payload.message ?? "Stream error");
      else if (event === "done") return;
    }
  }
}

function parseFrame(frame: string) {
  let event = "message";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return { event, data: data.join("\n") };
}
