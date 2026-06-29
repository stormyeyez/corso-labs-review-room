import { describe, expect, it, vi } from "vitest";
import { resolveReviewRace } from "./route";

describe("run-review route helper", () => {
  it("returns cached fallback when requested", async () => {
    const result = await resolveReviewRace({
      body: { useFallback: true },
      env: {},
      runRace: vi.fn(),
    });

    expect(result.cerebras.usedFallback).toBe(true);
    expect(result.openrouter.usedFallback).toBe(true);
  });

  it("returns cached fallback when provider keys are missing", async () => {
    const result = await resolveReviewRace({
      body: {},
      env: {},
      runRace: vi.fn(),
    });

    expect(result.errorSummary).toContain("Live provider keys are not configured");
  });

  it("calls the live race runner when both provider keys exist", async () => {
    const runRace = vi.fn().mockResolvedValue({
      cerebras: { usedFallback: false },
      openrouter: { usedFallback: false },
    });
    const consumeLiveRun = vi.fn().mockReturnValue(true);

    await resolveReviewRace({
      body: {},
      env: {
        CEREBRAS_API_KEY: "test-cerebras-key",
        OPENROUTER_API_KEY: "test-openrouter-key",
      },
      runRace,
      consumeLiveRun,
    });

    expect(consumeLiveRun).toHaveBeenCalledOnce();
    expect(runRace).toHaveBeenCalledWith({
      cerebrasApiKey: "test-cerebras-key",
      openRouterApiKey: "test-openrouter-key",
    });
  });

  it("returns cached fallback without calling providers when the live run limit is reached", async () => {
    const runRace = vi.fn();

    const result = await resolveReviewRace({
      body: {},
      env: {
        CEREBRAS_API_KEY: "test-cerebras-key",
        OPENROUTER_API_KEY: "test-openrouter-key",
      },
      runRace,
      consumeLiveRun: vi.fn().mockReturnValue(false),
    });

    expect(runRace).not.toHaveBeenCalled();
    expect(result.errorSummary).toContain("Live demo run limit reached");
    expect(result.cerebras.usedFallback).toBe(true);
    expect(result.openrouter.usedFallback).toBe(true);
  });

  it("does not leak provider keys in the returned payload", async () => {
    const result = await resolveReviewRace({
      body: {},
      env: {},
      runRace: vi.fn(),
    });

    expect(JSON.stringify(result)).not.toContain("CEREBRAS_API_KEY");
    expect(JSON.stringify(result)).not.toContain("OPENROUTER_API_KEY");
  });
});
