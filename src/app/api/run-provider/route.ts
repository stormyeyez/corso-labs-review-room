import { NextResponse } from "next/server";
import { fallbackReview } from "@/demo-data/fallback-review";
import {
  runCerebrasReview,
  runOpenRouterTiming,
  type ProviderReviewResult,
} from "@/lib/agents/run-review";

export const runtime = "nodejs";
export const maxDuration = 60;

type RunProviderBody = {
  provider?: "cerebras" | "openrouter";
  useFallback?: boolean;
};

const MAX_PROVIDER_RUNS_PER_SERVER = 40;
let providerRunsRemaining = MAX_PROVIDER_RUNS_PER_SERVER;

function consumeProviderRun(): boolean {
  if (providerRunsRemaining <= 0) {
    return false;
  }

  providerRunsRemaining -= 1;
  return true;
}

function fallbackProvider(provider: "cerebras" | "openrouter", reason: string): ProviderReviewResult {
  if (provider === "cerebras") {
    return {
      provider,
      metrics: fallbackReview.cerebras,
      agents: fallbackReview.agents,
      packet: fallbackReview.packet,
      errorSummary: `${fallbackReview.errorSummary} ${reason}`,
    };
  }

  return {
    provider,
    metrics: fallbackReview.openrouter,
    errorSummary: `${fallbackReview.errorSummary} ${reason}`,
  };
}

async function readBody(request: Request): Promise<RunProviderBody> {
  try {
    const body = (await request.json()) as RunProviderBody;

    return {
      provider: body.provider === "openrouter" ? "openrouter" : "cerebras",
      useFallback: body.useFallback === true,
    };
  } catch {
    return {
      provider: "cerebras",
    };
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const provider = body.provider ?? "cerebras";

  if (body.useFallback) {
    return NextResponse.json(fallbackProvider(provider, "Fallback requested."));
  }

  if (!consumeProviderRun()) {
    return NextResponse.json(fallbackProvider(provider, "Live demo run limit reached; showing cached demo results."));
  }

  try {
    if (provider === "cerebras") {
      const apiKey = process.env.CEREBRAS_API_KEY;

      if (!apiKey) {
        return NextResponse.json(fallbackProvider(provider, "Cerebras key is not configured."));
      }

      return NextResponse.json(await runCerebrasReview({ apiKey }));
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackProvider(provider, "OpenRouter key is not configured."));
    }

    return NextResponse.json(await runOpenRouterTiming({ apiKey }));
  } catch {
    return NextResponse.json(fallbackProvider(provider, "Live provider call failed safely."));
  }
}
