/**
 * Window event that opens the assistant from anywhere on the page.
 * `detail.question` (optional) pre-fills the input without sending it.
 */
export const OPEN_ASSISTANT_EVENT = "assistant:open";

export type OpenAssistantDetail = { question?: string };
