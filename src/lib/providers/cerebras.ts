import type { ChatMessage, ChatPayload, ProviderCallResult } from "./chat-types";

export const CEREBRAS_MODEL = "gemma-4-31b";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const CEREBRAS_TIMEOUT_MS = 15_000;

export function buildCerebrasPayload(messages: ChatMessage[]): ChatPayload {
  return {
    model: CEREBRAS_MODEL,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" },
  };
}

export async function callCerebras(
  payload: ChatPayload,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderCallResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CEREBRAS_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(CEREBRAS_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const totalMs = Date.now() - started;

  if (!response.ok) {
    throw new Error(`Cerebras request failed: ${response.status}`);
  }

  return { json: await response.json(), totalMs };
}
