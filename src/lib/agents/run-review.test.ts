import { describe, expect, it, vi } from "vitest";
import { demoEncounter } from "@/demo-data/encounter";
import { getMockResultImageDataUri } from "@/demo-data/mock-result-image";
import { sourceCards } from "@/demo-data/source-cards";
import { buildAgentMessages } from "./prompts";
import { runReviewRace } from "./run-review";
import { buildCerebrasPayload } from "../providers/cerebras";
import { buildOpenRouterPayload } from "../providers/openrouter";

describe("review race orchestration", () => {
  it("builds Cerebras payloads with the Gemma 4 model", () => {
    const payload = buildCerebrasPayload(buildAgentMessages("intake", demoEncounter, sourceCards));

    expect(payload.model).toBe("gemma-4-31b");
    expect(payload.messages[0]?.content).toContain("Use synthetic demo data only.");
  });

  it("includes the approved raster image in the image agent payload", () => {
    const payload = buildCerebrasPayload(
      buildAgentMessages("image-evidence", demoEncounter, sourceCards, getMockResultImageDataUri()),
    );

    expect(JSON.stringify(payload.messages)).toContain("image_url");
    expect(JSON.stringify(payload.messages)).toContain("data:image/jpeg;base64,");
  });

  it("builds an OpenRouter GPU payload with the matching model family", () => {
    const payload = buildOpenRouterPayload(buildAgentMessages("openrouter-gpu", demoEncounter, sourceCards));

    expect(payload.model).toBe("google/gemma-4-31b-it");
  });

  it("returns the safe fallback review when a provider call fails", async () => {
    const failingProvider = vi.fn().mockRejectedValue(new Error("provider unavailable"));

    const result = await runReviewRace({
      cerebrasApiKey: "test-cerebras-key",
      openRouterApiKey: "test-openrouter-key",
      callCerebrasProvider: failingProvider,
      callOpenRouterProvider: failingProvider,
    });

    expect(result.cerebras.usedFallback).toBe(true);
    expect(result.openrouter.usedFallback).toBe(true);
    expect(result.errorSummary).toContain("Cached demo result shown");
  });

  it("runs comparable 8-step chains for Cerebras and OpenRouter timing", async () => {
    const successfulProvider = vi.fn().mockResolvedValue({
      json: {
        choices: [{ message: { content: '{"summary":"ok"}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
      totalMs: 100,
    });

    await runReviewRace({
      cerebrasApiKey: "test-cerebras-key",
      openRouterApiKey: "test-openrouter-key",
      callCerebrasProvider: successfulProvider,
      callOpenRouterProvider: successfulProvider,
    });

    expect(successfulProvider).toHaveBeenCalledTimes(16);
  });
});
