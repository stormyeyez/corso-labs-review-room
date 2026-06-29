import type { ChatMessage, ChatPayload, ProviderCallResult } from "./chat-types";

export const OPENROUTER_MODEL = "google/gemma-4-31b-it";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_TIMEOUT_MS = 45_000;

export function buildOpenRouterPayload(messages: ChatMessage[]): ChatPayload {
  return {
    model: OPENROUTER_MODEL,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" },
  };
}

export async function callOpenRouter(
  payload: ChatPayload,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderCallResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "http-referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "x-title": "Corso Labs ED Documentation Review Room",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const totalMs = Date.now() - started;

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${response.status}`);
  }

  return { json: await response.json(), totalMs };
}
