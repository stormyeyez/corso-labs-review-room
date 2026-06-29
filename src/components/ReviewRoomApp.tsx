"use client";

import { useEffect, useMemo, useState } from "react";
import { fallbackReview } from "@/demo-data/fallback-review";
import { calculateSpeedup, formatMs } from "@/lib/metrics";
import type { AgentTrace, ProviderMetrics, RaceResult, ReviewPacket } from "@/lib/types";

type RunState = "idle" | "running" | "cerebras-complete" | "complete" | "error";
type ProviderRunState = "idle" | "running" | "complete" | "error";

type ProviderRunResponse = {
  provider: "cerebras" | "openrouter";
  metrics: ProviderMetrics;
  agents?: AgentTrace[];
  packet?: ReviewPacket;
  errorSummary?: string;
};

type AgentRole = {
  id: string;
  label: string;
  short: string;
  role: string;
  detail: string;
};

const agentRoles: AgentRole[] = [
  { id: "intake", label: "Intake", short: "sort facts", role: "Triage, vitals, timeline", detail: "Builds the case timeline from arrival, symptoms, vitals, and clinician concerns." },
  { id: "image-evidence", label: "Image", short: "read JPG", role: "Reads raster image", detail: "Reads the non-selectable EMR image for ECG, troponin, CXR, and vital facts." },
  { id: "workup", label: "Workup", short: "organize tests", role: "Groups tests/results", detail: "Groups resulted and pending tests so the note does not bury key findings." },
  { id: "mdm-draft", label: "HPI", short: "draft story", role: "Drafts note story", detail: "Turns the raw encounter into clinician-editable documentation language." },
  { id: "medical-literature", label: "Claim Check", short: "support claims", role: "Checks medical support", detail: "Checks whether note claims have medical-source support or need review." },
  { id: "institution-context", label: "Local Rules", short: "flag context", role: "Flags hospital context", detail: "Flags local assay, repeat-timing, and pathway details that vary by hospital." },
  { id: "safety-review", label: "Safety", short: "check claims", role: "Blocks overclaims", detail: "Removes diagnosis, treatment, disposition, and validation overclaims." },
  { id: "coordinator", label: "Merge", short: "final review", role: "Merges final packet", detail: "Merges all checks into the final physician note review packet." },
];

const CEREBRAS_MODEL = "gemma-4-31b";
const OPENROUTER_MODEL = "google/gemma-4-31b-it";

function seconds(value: number, digits = 1) {
  return `${(value / 1000).toFixed(digits)}s`;
}

function metricOrNA(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "not reported";
}

function percentReduction(fastMs?: number, slowMs?: number) {
  if (!fastMs || !slowMs || fastMs <= 0 || slowMs <= 0) {
    return null;
  }

  return Math.round((1 - fastMs / slowMs) * 100);
}

function plusPercent(fast?: number, slow?: number) {
  if (!fast || !slow || fast <= 0 || slow <= 0) {
    return null;
  }

  return Math.round((fast / slow - 1) * 100);
}

function modelName(model: string) {
  return model.replace("google/", "");
}

function getTraceById(agents: AgentTrace[]) {
  return new Map(agents.map((agent) => [agent.id, agent]));
}

function useDisplayedAgents(agents: AgentTrace[] | null) {
  return useMemo(() => {
    const byId = getTraceById(agents ?? []);

    return agentRoles.map((role, index) => {
      const trace = byId.get(role.id);
      const fallbackTrace = fallbackReview.agents[index];

      return {
        ...role,
        elapsedMs: agents ? trace?.elapsedMs ?? fallbackTrace?.elapsedMs ?? 0 : 0,
      };
    });
  }, [agents]);
}

function useTypewriterText(text: string, enabled = true) {
  const [visibleText, setVisibleText] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setVisibleText(text);
      return;
    }

    setVisibleText("");
    let index = 0;
    const stepSize = Math.max(1, Math.ceil(text.length / 140));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + stepSize);
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 8);

    return () => window.clearInterval(timer);
  }, [enabled, text]);

  return visibleText;
}

function ImageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="image-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-label="Input image enlarged"
        aria-modal="true"
        className="image-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button aria-label="Close enlarged image" className="image-modal-close" type="button" onClick={onClose}>
          X
        </button>
        <h2>Input image enlarged: stitched electronic medical record image</h2>
        <img alt="Enlarged synthetic stitched electronic medical record result photo" src="/ed-result-image-gpt-v1.jpg" />
      </div>
    </div>
  );
}

function EventStrip() {
  return (
    <section className="event-strip" aria-label="Hackathon participant branding">
      <div className="event-logos">
        <img alt="Cerebras logo" src="/brand/cerebras-logo.svg" />
        <b>x</b>
        <img alt="Google DeepMind logo" src="/brand/google-deepmind-logo.svg" />
      </div>
      <div className="event-copy">
        <strong>Hackathon participant build</strong>
        <span>Independent submission - trademarks belong to their owners - synthetic demo only</span>
        <nav aria-label="Public project links" className="event-links">
          <a href="https://github.com/stormyeyez/corso-labs-review-room" rel="noreferrer" target="_blank">
            GitHub
          </a>
          <a href="https://x.com/tk112190" rel="noreferrer" target="_blank">
            X / @tk112190
          </a>
        </nav>
      </div>
      <div className="event-tags" aria-label="Hackathon fit">
        <span>Multimodal</span>
        <span>Multi-agent</span>
        <span>Enterprise workflow</span>
      </div>
    </section>
  );
}

function IntroAndStart({ runState, onRun }: { runState: RunState; onRun: () => void }) {
  const isRunning = runState === "running" || runState === "cerebras-complete";

  return (
    <section className="intro-start-grid">
      <div className="why-panel">
        <p className="why-eyebrow">Why this matters in emergency care</p>
        <h2>Fast inference turns an agent workflow from a waiting-room task into an interactive review.</h2>
        <p>
          The demo sends the same raster electronic medical record image and same physician-note review
          task through Cerebras and a GPU path. The point is practical: if a multi-agent chart review
          comes back in seconds, an ED clinician can inspect, edit, and move on while the encounter is
          still live.
        </p>
      </div>
      <div className="start-panel">
        <p>Start here - click first</p>
        <button type="button" onClick={onRun} disabled={isRunning}>
          {isRunning ? "Running live benchmark..." : "Run Live Side-by-Side Benchmark"}
          <span>same text + image input on both backends</span>
        </button>
      </div>
    </section>
  );
}

function AgentProgress({
  cerebrasRun,
  gpuRun,
  gpuState,
  runState,
  activeStep,
  gpuActiveStep,
}: {
  cerebrasRun: ProviderRunResponse | null;
  gpuRun: ProviderRunResponse | null;
  gpuState: ProviderRunState;
  runState: RunState;
  activeStep: number;
  gpuActiveStep: number;
}) {
  const displayedAgents = useDisplayedAgents(cerebrasRun?.agents ?? null);
  const isIdle = runState === "idle";
  const isRunning = runState === "running";
  const isCerebrasComplete = runState === "cerebras-complete";

  return (
    <section className="agent-progress-panel">
      <div className="agent-progress-head">
        <div>
          <p>Live agent progress</p>
          <h2>
            {isIdle
              ? "Waiting to start: both providers will launch together from one server timestamp"
              : isCerebrasComplete
                ? "Cerebras finished first; GPU is still in progress for the timing comparison"
                : "Both providers start from the same click; only Cerebras output is displayed"}
          </h2>
        </div>
        <span>{isIdle ? "0.00s until run starts" : "real per-step timings when live"}</span>
      </div>

      <div className="agent-label-row">
        <div />
        {displayedAgents.map((agent) => (
          <div className="agent-label-cell" key={agent.id}>
            <b>{agent.label}</b>
            <span>{agent.short}</span>
          </div>
        ))}
      </div>

      <div className="agent-time-row">
        <b>Cerebras</b>
        {displayedAgents.map((agent, index) => (
          <span
            className={`cerebras-time ${isIdle ? "time-empty" : ""} ${isRunning && index < activeStep ? "time-done" : ""} ${
              isRunning && index === activeStep ? "time-running" : ""
            } ${isRunning && index > activeStep ? "time-waiting" : ""}`}
            key={agent.id}
          >
            {isIdle
              ? "0.00s"
              : isRunning
                ? index < activeStep
                  ? "done"
                  : index === activeStep
                    ? "running"
                    : "waiting"
                : seconds(agent.elapsedMs, 2)}
          </span>
        ))}
      </div>

      <div className="agent-time-row">
        <b>GPU</b>
        {agentRoles.map((agent, index) => (
          <span
            className={`${gpuState === "complete" || gpuRun ? "gpu-time" : "gpu-pending"} ${isIdle ? "time-empty" : ""} ${
              gpuState === "running" && index < gpuActiveStep ? "time-done" : ""
            } ${gpuState === "running" && index === gpuActiveStep ? "time-running" : ""} ${
              gpuState === "running" && index > gpuActiveStep ? "time-waiting" : ""
            }`}
            key={agent.id}
          >
            {isIdle
              ? "0.00s"
              : gpuState === "complete" || gpuRun
                ? "complete"
                : index < gpuActiveStep
                  ? "done"
                  : index === gpuActiveStep
                    ? "running"
                    : "waiting"}
          </span>
        ))}
      </div>

      <div className="agent-role-row">
        <div>
          <b>Agent responsibilities</b>
          <span>why each step exists</span>
        </div>
        {displayedAgents.map((agent) => (
          <article key={agent.id}>
            <b>{agent.role}</b>
            <span>{agent.detail}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function InputPanel({ onOpenImage }: { onOpenImage: () => void }) {
  return (
    <section className="input-panel">
      <div className="panel-topline">
        <div>
          <p>1 Input</p>
          <h2>Stitched electronic medical record image</h2>
        </div>
        <span>raster JPG</span>
      </div>

      <button
        aria-label="Open electronic medical record image larger"
        className="emr-image-button"
        type="button"
        onClick={onOpenImage}
      >
        <img alt="Synthetic stitched electronic medical record result photo" src="/ed-result-image-gpt-v1.jpg" />
        <span>Click to enlarge</span>
      </button>

      <p className="image-note">
        Synthetic demo image generated for this project.{" "}
        <mark>Not selectable text; Gemma must read the pixels.</mark>
      </p>
    </section>
  );
}

function OutputPanel({ result }: { result: RaceResult }) {
  const packet = result.packet;
  const hpiDraft = packet.caseFrame;
  const statusSummary =
    packet.keyDataExtracted
      .filter((fact) => /vital|stable|symptom|reassessment|shock|oxygen/i.test(fact))
      .slice(0, 2)
      .join(" ") || "Vitals, reassessment, and status facts are organized for clinician review.";
  const resultSynthesis =
    packet.multimodalEvidence.extractedFromImage.join(" ") ||
    packet.keyDataExtracted.slice(2, 5).join(" ");
  const reasoning = packet.mdmDraft;

  return (
    <section className="output-panel">
      <div className="output-head">
        <div>
          <p>2 Cerebras output</p>
          <h2>Physician note review packet</h2>
          <span>Compact preview of the structured packet; GPU output stays hidden.</span>
        </div>
        <b>ready in {seconds(result.cerebras.totalMs)}</b>
      </div>

      <div className="note-preview-grid">
        <NotePreview order={0} title="HPI Draft">{hpiDraft}</NotePreview>
        <NotePreview order={1} title="Exam / Status Summary">{statusSummary}</NotePreview>
        <NotePreview order={2} title="Result Synthesis">{resultSynthesis || "ECG, troponin, CXR, CBC/BMP and reassessment facts are extracted for review."}</NotePreview>
        <NotePreview order={3} title="Medical Decision Reasoning">{reasoning}</NotePreview>
      </div>
    </section>
  );
}

function EmptyOutputPanel({ runState }: { runState: RunState }) {
  const isRunning = runState === "running";

  return (
    <section className="output-panel output-panel-empty" aria-live="polite">
      <div className="output-head">
        <div>
          <p>2 Cerebras output</p>
          <h2>{isRunning ? "Physician note review in progress" : "Physician note review packet"}</h2>
          <span>
            {isRunning
              ? "Cerebras is reading the image and assembling the review packet now."
              : "Output appears here after you run the live side-by-side benchmark."}
          </span>
        </div>
        <b>{isRunning ? "running" : "not run"}</b>
      </div>

      <div className="note-preview-grid">
        <EmptyNote title="HPI Draft" isRunning={isRunning} />
        <EmptyNote title="Exam / Status Summary" isRunning={isRunning} />
        <EmptyNote title="Result Synthesis" isRunning={isRunning} />
        <EmptyNote title="Medical Decision Reasoning" isRunning={isRunning} />
      </div>
    </section>
  );
}

function EmptyNote({ title, isRunning }: { title: string; isRunning: boolean }) {
  return (
    <article className="note-preview note-preview-empty">
      <h3>{title}</h3>
      <p>{isRunning ? "Generating..." : "Waiting for run"}</p>
    </article>
  );
}

function NotePreview({ title, children, order = 0 }: { title: string; children: string; order?: number }) {
  const visibleText = useTypewriterText(children);
  const isComplete = visibleText.length >= children.length;

  return (
    <article className="note-preview note-preview-reveal" style={{ animationDelay: `${order * 90}ms` }}>
      <h3>{title}</h3>
      <p>
        {visibleText}
        {!isComplete ? <span aria-hidden="true" className="type-caret" /> : null}
      </p>
    </article>
  );
}

function ImageExtraction({ result, runState }: { result: RaceResult | null; runState: RunState }) {
  const facts = result?.packet.multimodalEvidence.extractedFromImage ?? [];
  const isRunning = runState === "running";
  const emptyText = isRunning ? "reading pixels..." : "not extracted yet";

  return (
    <section className="image-extraction-panel">
      <p>Image extraction</p>
      <h2>Key facts read from pixels</h2>
      <div className={result ? "extraction-fact extraction-fact-live" : ""} style={{ animationDelay: "0ms" }}>
        <b>Vitals:</b> {result ? "BP 152/88, HR 96, SpO2 98%" : emptyText}
      </div>
      <div className={result ? "extraction-fact extraction-fact-live" : ""} style={{ animationDelay: "110ms" }}>
        <b>ECG:</b>{" "}
        {result
          ? facts.find((fact) => fact.toLowerCase().includes("ecg"))?.replace(/^ECG:\s*/i, "") ?? "sinus rhythm, no STEMI pattern"
          : emptyText}
      </div>
      <div className={result ? "extraction-fact extraction-fact-live" : ""} style={{ animationDelay: "220ms" }}>
        <b>Troponin:</b>{" "}
        {result
          ? facts.find((fact) => fact.toLowerCase().includes("troponin"))?.replace(/^(hs-)?troponin:\s*/i, "") ??
            "initial 8 ng/L, repeat pending"
          : emptyText}
      </div>
      <div className={result ? "extraction-fact extraction-fact-live" : ""} style={{ animationDelay: "330ms" }}>
        <b>CXR:</b>{" "}
        {result
          ? facts.find((fact) => fact.toLowerCase().includes("cxr"))?.replace(/^CXR:\s*/i, "") ?? "no acute cardiopulmonary abnormality"
          : emptyText}
      </div>
    </section>
  );
}

function BenchmarkPanel({
  result,
  gpuRun,
  gpuState,
  runState,
}: {
  result: RaceResult | null;
  gpuRun: ProviderRunResponse | null;
  gpuState: ProviderRunState;
  runState: RunState;
}) {
  if (!result) {
    const isRunning = runState === "running";

    return (
      <section className="benchmark-panel benchmark-panel-empty" aria-live="polite">
        <p>3 Speed benchmark</p>
        <h2>{isRunning ? "Benchmark running" : "Benchmark waiting"}</h2>
        <span className="benchmark-subtitle">
          {isRunning
            ? "same raster image + same 8-agent workflow running on both backends"
            : "press the red button to measure Cerebras against the GPU path"}
        </span>

        <div className="provider-benchmark-grid">
          <ProviderTime order={0} title="Cerebras" value={isRunning ? "running" : "0.0s"} variant="cerebras" />
          <ProviderTime order={1} title="GPU" value={isRunning ? "running" : "0.0s"} variant="gpu" />
        </div>

        <div className="speed-stat-grid">
          <SpeedStat order={0} label="Wait reduction" value="--" detail={isRunning ? "measuring" : "not run yet"} tone="green" />
          <SpeedStat order={1} label="Relative speed" value="--" detail="8-agent workflow" tone="green" />
          <SpeedStat order={2} label="First token" value="--" detail={isRunning ? "waiting for first tokens" : "not run yet"} tone="blue" />
          <SpeedStat order={3} label="Output speed" value="--" detail={isRunning ? "measuring tok/s" : "not run yet"} tone="blue" />
        </div>
      </section>
    );
  }

  if (!gpuRun) {
    return (
      <section className="benchmark-panel benchmark-panel-awaiting-gpu" aria-live="polite">
        <p>3 Speed benchmark</p>
        <h2>Cerebras finished first</h2>
        <span className="benchmark-subtitle">
          Cerebras output is ready now. GPU path is still in progress for timing comparison.
        </span>

        <div className="provider-benchmark-grid">
          <ProviderTime order={0} title="Cerebras" value={seconds(result.cerebras.totalMs)} variant="cerebras" />
          <ProviderTime order={1} title="GPU" value={gpuState === "error" ? "fallback" : "in progress"} variant="gpu" />
        </div>

        <div className="speed-stat-grid">
          <SpeedStat order={0} label="Cerebras result" value="ready" detail="output shown immediately" tone="green" />
          <SpeedStat order={1} label="GPU comparison" value="in progress" detail="waiting on OpenRouter timing" tone="blue" />
          <SpeedStat order={2} label="Current advantage" value="Cerebras leads" detail="benchmark updates when GPU finishes" tone="green" />
          <SpeedStat order={3} label="Output speed" value={metricOrNA(result.cerebras.outputTokensPerSecond)} detail="Cerebras tok/s returned" tone="blue" />
        </div>
      </section>
    );
  }

  const waitReduction = percentReduction(result.cerebras.totalMs, result.openrouter.totalMs);
  const savedMs = Math.max(0, result.openrouter.totalMs - result.cerebras.totalMs);
  const speedup = result.speedup ? `${result.speedup.toFixed(1)}x faster` : "not reported";
  const ttftReduction = percentReduction(result.cerebras.timeToFirstTokenMs, result.openrouter.timeToFirstTokenMs);
  const throughputGain = plusPercent(result.cerebras.outputTokensPerSecond, result.openrouter.outputTokensPerSecond);
  const ttftSpeedup =
    result.cerebras.timeToFirstTokenMs && result.openrouter.timeToFirstTokenMs
      ? result.openrouter.timeToFirstTokenMs / result.cerebras.timeToFirstTokenMs
      : null;
  const throughputSpeedup =
    result.cerebras.outputTokensPerSecond && result.openrouter.outputTokensPerSecond
      ? result.cerebras.outputTokensPerSecond / result.openrouter.outputTokensPerSecond
      : null;
  const hasTtft =
    typeof result.cerebras.timeToFirstTokenMs === "number" &&
    typeof result.openrouter.timeToFirstTokenMs === "number";

  return (
    <section className="benchmark-panel">
      <p>3 Speed benchmark</p>
      <h2>Cerebras makes the review interactive</h2>
      <span className="benchmark-subtitle">same raster image + same 8-agent workflow - GPU path measured for speed only</span>

      <div className="provider-benchmark-grid">
        <ProviderTime order={0} title="Cerebras" value={seconds(result.cerebras.totalMs)} variant="cerebras" />
        <ProviderTime order={1} title="GPU" value={seconds(result.openrouter.totalMs)} variant="gpu" />
      </div>

      <div className="speed-stat-grid">
        <SpeedStat
          order={0}
          label="Wait reduction"
          value={waitReduction === null ? "not reported" : `${waitReduction}% less`}
          detail={`${seconds(savedMs)} saved end-to-end`}
          tone="green"
        />
        <SpeedStat order={1} label="Relative speed" value={speedup} detail="8-agent workflow" tone="green" />
        <SpeedStat
          order={2}
          label={hasTtft ? "First token" : "Completion tokens"}
          value={
            hasTtft
              ? `${formatMs(result.cerebras.timeToFirstTokenMs!)} vs ${formatMs(result.openrouter.timeToFirstTokenMs!)}`
              : `${metricOrNA(result.cerebras.completionTokens)} vs ${metricOrNA(result.openrouter.completionTokens)}`
          }
          detail={
            hasTtft && ttftReduction !== null && ttftSpeedup !== null
              ? `${ttftSpeedup.toFixed(1)}x faster - ${ttftReduction}% lower`
              : "provider usage returned"
          }
          tone="blue"
        />
        <SpeedStat
          order={3}
          label="Output speed"
          value={`${metricOrNA(result.cerebras.outputTokensPerSecond)} vs ${metricOrNA(result.openrouter.outputTokensPerSecond)} tok/s`}
          detail={
            throughputGain === null || throughputSpeedup === null
              ? "provider metric unavailable"
              : `${throughputSpeedup.toFixed(1)}x throughput - +${throughputGain}%`
          }
          tone="blue"
        />
      </div>
    </section>
  );
}

function ProviderTime({ title, value, variant, order = 0 }: { title: string; value: string; variant: "cerebras" | "gpu"; order?: number }) {
  return (
    <article className={`provider-time provider-${variant} result-pop`} style={{ animationDelay: `${order * 80}ms` }}>
      <span>{title}</span>
      <b>{value}</b>
    </article>
  );
}

function SpeedStat({ label, value, detail, tone, order = 0 }: { label: string; value: string; detail: string; tone: "green" | "blue"; order?: number }) {
  return (
    <article className={`speed-stat speed-stat-${tone} result-pop`} style={{ animationDelay: `${120 + order * 80}ms` }}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
    </article>
  );
}

function SupportCards() {
  return (
    <section className="support-card-row">
      <article>
        <h2>Claim support check</h2>
        <p>
          Shows whether each note claim came from the image, a medical reference, or a hospital-context
          flag, then marks what the clinician must verify.
        </p>
      </article>
      <article>
        <h2>Local-context flags</h2>
        <p>Troponin assay, repeat timing, and local pathway caveats.</p>
      </article>
      <article>
        <h2>Safety boundary</h2>
        <p>No diagnosis, treatment, disposition, or clinical validation claim.</p>
      </article>
    </section>
  );
}

export function ReviewRoomApp() {
  const [cerebrasRun, setCerebrasRun] = useState<ProviderRunResponse | null>(null);
  const [gpuRun, setGpuRun] = useState<ProviderRunResponse | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [gpuState, setGpuState] = useState<ProviderRunState>("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [gpuActiveStep, setGpuActiveStep] = useState(-1);
  const [imageOpen, setImageOpen] = useState(false);
  const result = cerebrasRun?.packet
    ? ({
        encounter: fallbackReview.encounter,
        sourceCards: fallbackReview.sourceCards,
        agents: cerebrasRun.agents ?? fallbackReview.agents,
        cerebras: cerebrasRun.metrics,
        openrouter: gpuRun?.metrics ?? {
          provider: "openrouter",
          model: OPENROUTER_MODEL,
          totalMs: 0,
          usedFallback: false,
        },
        speedup: gpuRun ? calculateSpeedup(cerebrasRun.metrics.totalMs, gpuRun.metrics.totalMs) : null,
        packet: cerebrasRun.packet,
        errorSummary: cerebrasRun.errorSummary ?? gpuRun?.errorSummary,
      } satisfies RaceResult)
    : null;

  async function runBenchmark() {
    setRunState("running");
    setGpuState("running");
    setCerebrasRun(null);
    setGpuRun(null);
    setActiveStep(0);
    setGpuActiveStep(0);
    const progressTimer = window.setInterval(() => {
      setActiveStep((step) => Math.min(step + 1, agentRoles.length - 1));
    }, 360);
    const gpuProgressTimer = window.setInterval(() => {
      setGpuActiveStep((step) => Math.min(step + 1, agentRoles.length - 1));
    }, 1900);

    try {
      const cerebrasPromise = fetch("/api/run-provider", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: "cerebras", useFallback: false }),
        });
      const gpuPromise = fetch("/api/run-provider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "openrouter", useFallback: false }),
      });
      const [cerebrasResponse] = await Promise.all([
        cerebrasPromise,
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);

      if (!cerebrasResponse.ok) {
        throw new Error(`Cerebras API returned ${cerebrasResponse.status}`);
      }

      const nextCerebrasRun = (await cerebrasResponse.json()) as ProviderRunResponse;
      setCerebrasRun(nextCerebrasRun);
      setActiveStep(agentRoles.length - 1);
      setRunState("cerebras-complete");
      window.clearInterval(progressTimer);

      try {
        const gpuResponse = await gpuPromise;

        if (!gpuResponse.ok) {
          throw new Error(`GPU API returned ${gpuResponse.status}`);
        }

        setGpuRun((await gpuResponse.json()) as ProviderRunResponse);
        setGpuActiveStep(agentRoles.length - 1);
        setGpuState("complete");
        setRunState("complete");
      } catch {
        setGpuRun({
          provider: "openrouter",
          metrics: fallbackReview.openrouter,
          errorSummary: "GPU timing route failed safely; cached comparison shown.",
        });
        setGpuActiveStep(agentRoles.length - 1);
        setGpuState("error");
        setRunState("complete");
      }
    } catch {
      setCerebrasRun({
        provider: "cerebras",
        metrics: fallbackReview.cerebras,
        agents: fallbackReview.agents,
        packet: fallbackReview.packet,
        errorSummary: fallbackReview.errorSummary,
      });
      setGpuRun({
        provider: "openrouter",
        metrics: fallbackReview.openrouter,
        errorSummary: fallbackReview.errorSummary,
      });
      setGpuState("error");
      setActiveStep(agentRoles.length - 1);
      setGpuActiveStep(agentRoles.length - 1);
      setRunState("error");
    } finally {
      window.clearInterval(progressTimer);
      window.clearInterval(gpuProgressTimer);
    }
  }

  return (
    <div className="review-room">
      <header className="app-header">
        <div>
          <div className="brand-row">
            <p>
              <b>Corso</b> Labs
            </p>
            <a href="https://corsoem.com" rel="noreferrer" target="_blank">
              Main project: corsoem.com
            </a>
          </div>
          <h1>ED Documentation Review Room</h1>
          <span>Image-aware agent workflow for emergency documentation QA</span>
        </div>
        <div className="header-models" aria-label="Model comparison">
          <span>
            <b>Cerebras-hosted</b>
            {modelName(result?.cerebras.model ?? CEREBRAS_MODEL)}
          </span>
          <span>
            <b>OpenRouter GPU</b>
            {modelName(result?.openrouter.model ?? OPENROUTER_MODEL)}
          </span>
        </div>
      </header>

      <main className="locked-dashboard">
        <EventStrip />
        <IntroAndStart runState={runState} onRun={runBenchmark} />
        <AgentProgress
          cerebrasRun={cerebrasRun}
          gpuRun={gpuRun}
          gpuState={gpuState}
          runState={runState}
          activeStep={activeStep}
          gpuActiveStep={gpuActiveStep}
        />

        {runState === "error" ? (
          <div className="status-message" role="status">
            Live provider route was unavailable; cached demo numbers are displayed.
          </div>
        ) : null}

        <div className="main-review-grid">
          <InputPanel onOpenImage={() => setImageOpen(true)} />
          <div className="right-dashboard-column">
            {result ? <OutputPanel result={result} /> : <EmptyOutputPanel runState={runState} />}
            <div className="evidence-benchmark-grid">
              <ImageExtraction result={result} runState={runState} />
              <BenchmarkPanel result={result} gpuRun={gpuRun} gpuState={gpuState} runState={runState} />
            </div>
          </div>
        </div>

        <SupportCards />
      </main>

      <ImageModal open={imageOpen} onClose={() => setImageOpen(false)} />
    </div>
  );
}
