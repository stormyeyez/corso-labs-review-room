import { NextResponse } from "next/server";
import { fallbackReview } from "@/demo-data/fallback-review";
import type { RaceResult } from "@/lib/types";
import { runReviewRace, type RunReviewRaceOptions } from "@/lib/agents/run-review";

export const runtime = "nodejs";

type RunReviewBody = {
  useFallback?: boolean;
};

type ProviderEnv = {
  CEREBRAS_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
};

type ResolveReviewRaceOptions = {
  body?: RunReviewBody;
  env?: ProviderEnv;
  runRace?: (options: RunReviewRaceOptions) => Promise<RaceResult>;
  consumeLiveRun?: () => boolean;
};

const MAX_LIVE_RUNS_PER_SERVER = 20;
let liveRunsRemaining = MAX_LIVE_RUNS_PER_SERVER;

function fallbackWithReason(reason: string): RaceResult {
  return {
    ...fallbackReview,
    errorSummary: `${fallbackReview.errorSummary} ${reason}`,
  };
}

function consumeLiveRun(): boolean {
  if (liveRunsRemaining <= 0) {
    return false;
  }

  liveRunsRemaining -= 1;
  return true;
}

export async function resolveReviewRace(options: ResolveReviewRaceOptions = {}): Promise<RaceResult> {
  const body = options.body ?? {};
  const env = options.env ?? {
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  };
  const runRace = options.runRace ?? runReviewRace;
  const takeLiveRun = options.consumeLiveRun ?? consumeLiveRun;

  if (body.useFallback) {
    return fallbackReview;
  }

  const cerebrasApiKey = env.CEREBRAS_API_KEY;
  const openRouterApiKey = env.OPENROUTER_API_KEY;

  if (!cerebrasApiKey || !openRouterApiKey) {
    return fallbackWithReason("Live provider keys are not configured.");
  }

  if (!takeLiveRun()) {
    return fallbackWithReason("Live demo run limit reached; showing cached demo results.");
  }

  try {
    return await runRace({
      cerebrasApiKey,
      openRouterApiKey,
    });
  } catch {
    return fallbackWithReason("Live provider call failed safely.");
  }
}

async function readBody(request: Request): Promise<RunReviewBody> {
  try {
    const body = (await request.json()) as RunReviewBody;
    return {
      useFallback: body.useFallback === true,
    };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const result = await resolveReviewRace({
    body: await readBody(request),
  });

  return NextResponse.json(result);
}
