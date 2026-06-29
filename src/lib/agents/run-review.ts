import { demoEncounter } from "@/demo-data/encounter";
import { fallbackReview } from "@/demo-data/fallback-review";
import { getMockResultImageDataUri } from "@/demo-data/mock-result-image";
import { sourceCards } from "@/demo-data/source-cards";
import { calculateSpeedup } from "@/lib/metrics";
import type { AgentTrace, ProviderMetrics, RaceResult, ReviewPacket } from "@/lib/types";
import { buildCerebrasPayload, callCerebras, CEREBRAS_MODEL } from "../providers/cerebras";
import { buildOpenRouterPayload, callOpenRouter, OPENROUTER_MODEL } from "../providers/openrouter";
import type { ChatPayload, ProviderCallResult } from "../providers/chat-types";
import { buildAgentMessages, type AgentKind } from "./prompts";

type ProviderCaller = (payload: ChatPayload, apiKey: string) => Promise<ProviderCallResult>;

export type RunReviewRaceOptions = {
  cerebrasApiKey?: string;
  openRouterApiKey?: string;
  callCerebrasProvider?: ProviderCaller;
  callOpenRouterProvider?: ProviderCaller;
};

const cerebrasAgents: Array<{ id: AgentKind; label: string }> = [
  { id: "intake", label: "Intake" },
  { id: "image-evidence", label: "Image" },
  { id: "workup", label: "Workup" },
  { id: "mdm-draft", label: "HPI" },
  { id: "medical-literature", label: "Claim Check" },
  { id: "institution-context", label: "Local Rules" },
  { id: "safety-review", label: "Safety" },
  { id: "coordinator", label: "Merge" },
];

type ProviderChainResult = {
  results: ProviderCallResult[];
  totalMs: number;
  traces?: AgentTrace[];
};

function fallbackWithReason(reason: string): RaceResult {
  return {
    ...fallbackReview,
    errorSummary: `${fallbackReview.errorSummary} ${reason}`,
  };
}

function extractText(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  const choices = (json as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function extractTokenMetrics(json: unknown): Pick<ProviderMetrics, "promptTokens" | "completionTokens"> {
  if (!json || typeof json !== "object") {
    return {};
  }

  const usage = (json as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } }).usage;
  return {
    promptTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : undefined,
  };
}

function aggregateTokenMetrics(results: ProviderCallResult[]): Pick<ProviderMetrics, "promptTokens" | "completionTokens" | "outputTokensPerSecond"> {
  let promptTokens = 0;
  let completionTokens = 0;
  const totalMs = results.reduce((sum, result) => sum + result.totalMs, 0);

  for (const result of results) {
    const metrics = extractTokenMetrics(result.json);
    promptTokens += metrics.promptTokens ?? 0;
    completionTokens += metrics.completionTokens ?? 0;
  }

  return {
    promptTokens: promptTokens || undefined,
    completionTokens: completionTokens || undefined,
    outputTokensPerSecond:
      completionTokens > 0 && totalMs > 0 ? Math.round(completionTokens / (totalMs / 1000)) : undefined,
  };
}

function parseReviewPacket(text: string): ReviewPacket {
  if (!text.trim()) {
    return fallbackReview.packet;
  }

  try {
    const parsed = JSON.parse(text) as Partial<ReviewPacket>;
    if (
      typeof parsed.caseFrame === "string" &&
      Array.isArray(parsed.keyDataExtracted) &&
      typeof parsed.mdmDraft === "string" &&
      Array.isArray(parsed.medicalLiteratureMatches) &&
      Array.isArray(parsed.institutionDependentFlags) &&
      parsed.multimodalEvidence &&
      Array.isArray(parsed.needsClinicianVerification) &&
      Array.isArray(parsed.safetyOverclaimCheck)
    ) {
      return parsed as ReviewPacket;
    }
  } catch {
    return fallbackReview.packet;
  }

  return fallbackReview.packet;
}

function summarize(label: string, json: unknown): string {
  const text = extractText(json).trim();
  if (!text) {
    return `${label} completed.`;
  }

  try {
    const parsed = JSON.parse(text) as { summary?: unknown; imageFacts?: unknown; workup?: unknown };
    if (typeof parsed.summary === "string") {
      return parsed.summary.length > 180 ? `${parsed.summary.slice(0, 177)}...` : parsed.summary;
    }
    if (Array.isArray(parsed.imageFacts)) {
      return `Extracted image facts: ${parsed.imageFacts.slice(0, 3).join("; ")}`;
    }
    if (Array.isArray(parsed.workup)) {
      return `Organized workup facts: ${parsed.workup.slice(0, 3).join("; ")}`;
    }
  } catch {
    // Some providers return non-JSON despite the response contract. Fall through to a clipped summary.
  }

  if (label === "Coordinator") {
    return "Merged agent outputs into the final MDM review packet.";
  }

  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

async function runProviderChain({
  provider,
  apiKey,
  callProvider,
  buildPayload,
  imageDataUri,
  concurrency,
  startGate,
}: {
  provider: "cerebras" | "openrouter";
  apiKey: string;
  callProvider: ProviderCaller;
  buildPayload: (messages: ReturnType<typeof buildAgentMessages>) => ChatPayload;
  imageDataUri: string;
  concurrency: number;
  startGate?: Promise<void>;
}): Promise<ProviderChainResult> {
  const results: ProviderCallResult[] = new Array(cerebrasAgents.length);
  let nextIndex = 0;

  await startGate;
  const started = Date.now();

  async function worker() {
    while (nextIndex < cerebrasAgents.length) {
      const index = nextIndex;
      nextIndex += 1;
      const agent = cerebrasAgents[index];
      const messages = buildAgentMessages(
        agent.id,
        demoEncounter,
        sourceCards,
        agent.id === "image-evidence" ? imageDataUri : undefined,
      );
      results[index] = await callProvider(buildPayload(messages), apiKey);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  const totalMs = Date.now() - started;

  return {
    results,
    totalMs,
    traces:
      provider === "cerebras"
        ? results.map((result, index) => ({
            id: cerebrasAgents[index].id,
            label: cerebrasAgents[index].label,
            provider,
            status: "complete",
            elapsedMs: result.totalMs,
            summary: summarize(cerebrasAgents[index].label, result.json),
          }))
        : undefined,
  };
}

export async function runReviewRace(options: RunReviewRaceOptions = {}): Promise<RaceResult> {
  const { cerebrasApiKey, openRouterApiKey } = options;

  if (!cerebrasApiKey || !openRouterApiKey) {
    return fallbackWithReason("Live provider keys are not configured.");
  }

  const callCerebrasProvider = options.callCerebrasProvider ?? callCerebras;
  const callOpenRouterProvider = options.callOpenRouterProvider ?? callOpenRouter;
  const imageDataUri = getMockResultImageDataUri();
  let releaseStartGate!: () => void;
  const startGate = new Promise<void>((resolve) => {
    releaseStartGate = resolve;
  });

  try {
    const cerebrasPromise = runProviderChain({
      provider: "cerebras",
      apiKey: cerebrasApiKey,
      callProvider: callCerebrasProvider,
      buildPayload: buildCerebrasPayload,
      imageDataUri,
      concurrency: 2,
      startGate,
    });
    const openRouterPromise = runProviderChain({
      provider: "openrouter",
      apiKey: openRouterApiKey,
      callProvider: callOpenRouterProvider,
      buildPayload: buildOpenRouterPayload,
      imageDataUri,
      concurrency: 8,
      startGate,
    });

    releaseStartGate();
    const [cerebrasChain, openRouterChain] = await Promise.all([cerebrasPromise, openRouterPromise]);

    const cerebrasResults = cerebrasChain.results;
    const openRouterResults = openRouterChain.results;
    const cerebrasTotalMs = cerebrasChain.totalMs;
    const openRouterTotalMs = openRouterChain.totalMs;
    const coordinatorText = extractText(cerebrasResults[cerebrasResults.length - 1]?.json);
    const tokenMetrics = aggregateTokenMetrics(cerebrasResults);
    const gpuTokenMetrics = aggregateTokenMetrics(openRouterResults);

    return {
      encounter: demoEncounter,
      sourceCards,
      agents: cerebrasChain.traces ?? [],
      cerebras: {
        provider: "cerebras",
        model: CEREBRAS_MODEL,
        totalMs: cerebrasTotalMs,
        usedFallback: false,
        ...tokenMetrics,
      },
      openrouter: {
        provider: "openrouter",
        model: OPENROUTER_MODEL,
        totalMs: openRouterTotalMs,
        usedFallback: false,
        ...gpuTokenMetrics,
      },
      speedup: calculateSpeedup(cerebrasTotalMs, openRouterTotalMs),
      packet: parseReviewPacket(coordinatorText),
    };
  } catch (error) {
    console.warn(
      "Live provider call failed safely:",
      error instanceof Error ? error.message : "unknown provider error",
    );
    return fallbackWithReason("Live provider call failed safely.");
  }
}
