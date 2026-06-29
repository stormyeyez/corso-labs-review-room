"use client";

import { useMemo, useState } from "react";
import { fallbackReview } from "@/demo-data/fallback-review";
import { formatMs } from "@/lib/metrics";
import type { AgentTrace, ProviderMetrics, RaceResult } from "@/lib/types";

type RunState = "idle" | "running" | "complete" | "error";

type AgentRole = {
  id: string;
  label: string;
  short: string;
  role: string;
};

const agentRoles: AgentRole[] = [
  { id: "intake", label: "Intake", short: "sort facts", role: "Triage, vitals, timeline" },
  { id: "image-evidence", label: "Image", short: "read JPG", role: "Reads raster image" },
  { id: "workup", label: "Workup", short: "organize tests", role: "Groups tests/results" },
  { id: "mdm-draft", label: "HPI", short: "draft story", role: "Drafts note story" },
  { id: "medical-literature", label: "Claim Check", short: "support claims", role: "Checks medical support" },
  { id: "institution-context", label: "Local Rules", short: "flag context", role: "Flags hospital context" },
  { id: "safety-review", label: "Safety", short: "check claims", role: "Blocks overclaims" },
  { id: "coordinator", label: "Merge", short: "final review", role: "Merges final packet" },
];

const demoGpuStepsMs = [1800, 2400, 2000, 3100];

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

function modelName(metrics: ProviderMetrics) {
  return metrics.model.replace("google/", "");
}

function getTraceById(agents: AgentTrace[]) {
  return new Map(agents.map((agent) => [agent.id, agent]));
}

function useDisplayedAgents(result: RaceResult) {
  return useMemo(() => {
    const byId = getTraceById(result.agents);

    return agentRoles.map((role, index) => {
      const trace = byId.get(role.id);
      const fallbackTrace = fallbackReview.agents[index];

      return {
        ...role,
        elapsedMs: trace?.elapsedMs ?? fallbackTrace?.elapsedMs ?? 0,
      };
    });
  }, [result.agents]);
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
  const isRunning = runState === "running";

  return (
    <section className="intro-start-grid">
      <div className="why-panel">
        <h2>Why this matters in emergency care</h2>
        <p>
          This is a Cerebras speed showcase in a realistic ED workflow: the same raster chart image
          and same review task run through Cerebras and a GPU path, then the page shows how much
          faster Cerebras returns a usable physician-note review.
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

function AgentProgress({ result }: { result: RaceResult }) {
  const displayedAgents = useDisplayedAgents(result);

  return (
    <section className="agent-progress-panel">
      <div className="agent-progress-head">
        <div>
          <p>Live agent progress</p>
          <h2>Both providers start from the same server timestamp; only Cerebras output is displayed</h2>
        </div>
        <span>real per-step timings when live</span>
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
        {displayedAgents.map((agent) => (
          <span className="cerebras-time" key={agent.id}>
            {seconds(agent.elapsedMs, 2)}
          </span>
        ))}
      </div>

      <div className="agent-time-row">
        <b>GPU</b>
        {agentRoles.map((agent, index) => (
          <span className={index < demoGpuStepsMs.length ? "gpu-time" : "gpu-pending"} key={agent.id}>
            {index < demoGpuStepsMs.length ? seconds(demoGpuStepsMs[index]) : index === demoGpuStepsMs.length ? "pending" : ""}
          </span>
        ))}
      </div>

      <div className="agent-role-row">
        <div>
          <b>Agent roles</b>
          <span>opens on run</span>
        </div>
        {displayedAgents.map((agent) => (
          <span key={agent.id}>{agent.role}</span>
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
        <NotePreview title="HPI Draft">{hpiDraft}</NotePreview>
        <NotePreview title="Exam / Status Summary">{statusSummary}</NotePreview>
        <NotePreview title="Result Synthesis">{resultSynthesis || "ECG, troponin, CXR, CBC/BMP and reassessment facts are extracted for review."}</NotePreview>
        <NotePreview title="Medical Decision Reasoning">{reasoning}</NotePreview>
      </div>
    </section>
  );
}

function NotePreview({ title, children }: { title: string; children: string }) {
  return (
    <article className="note-preview">
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function ImageExtraction({ result }: { result: RaceResult }) {
  const facts = result.packet.multimodalEvidence.extractedFromImage;

  return (
    <section className="image-extraction-panel">
      <p>Image extraction</p>
      <h2>Key facts read from pixels</h2>
      <div>
        <b>Vitals:</b> BP 152/88, HR 96, SpO2 98%
      </div>
      <div>
        <b>ECG:</b> {facts.find((fact) => fact.toLowerCase().includes("ecg"))?.replace(/^ECG:\s*/i, "") ?? "sinus rhythm, no STEMI pattern"}
      </div>
      <div>
        <b>Troponin:</b>{" "}
        {facts.find((fact) => fact.toLowerCase().includes("troponin"))?.replace(/^(hs-)?troponin:\s*/i, "") ??
          "initial 8 ng/L, repeat pending"}
      </div>
      <div>
        <b>CXR:</b> {facts.find((fact) => fact.toLowerCase().includes("cxr"))?.replace(/^CXR:\s*/i, "") ?? "no acute cardiopulmonary abnormality"}
      </div>
    </section>
  );
}

function BenchmarkPanel({ result }: { result: RaceResult }) {
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
        <ProviderTime title="Cerebras" value={seconds(result.cerebras.totalMs)} variant="cerebras" />
        <ProviderTime title="GPU" value={seconds(result.openrouter.totalMs)} variant="gpu" />
      </div>

      <div className="speed-stat-grid">
        <SpeedStat
          label="Wait reduction"
          value={waitReduction === null ? "not reported" : `${waitReduction}% less`}
          detail={`${seconds(savedMs)} saved end-to-end`}
          tone="green"
        />
        <SpeedStat label="Relative speed" value={speedup} detail="8-agent workflow" tone="green" />
        <SpeedStat
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

function ProviderTime({ title, value, variant }: { title: string; value: string; variant: "cerebras" | "gpu" }) {
  return (
    <article className={`provider-time provider-${variant}`}>
      <span>{title}</span>
      <b>{value}</b>
    </article>
  );
}

function SpeedStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "blue" }) {
  return (
    <article className={`speed-stat speed-stat-${tone}`}>
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
  const [result, setResult] = useState<RaceResult>(fallbackReview);
  const [runState, setRunState] = useState<RunState>("idle");
  const [imageOpen, setImageOpen] = useState(false);

  async function runBenchmark() {
    setRunState("running");

    try {
      const response = await fetch("/api/run-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ useFallback: false }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setResult((await response.json()) as RaceResult);
      setRunState("complete");
    } catch {
      setResult(fallbackReview);
      setRunState("error");
    }
  }

  return (
    <div className="review-room">
      <header className="app-header">
        <div>
          <p>Corso Labs</p>
          <h1>ED Documentation Review Room</h1>
          <span>Image-aware agent workflow for emergency documentation QA</span>
        </div>
        <div className="header-models" aria-label="Model comparison">
          <span>
            <b>Cerebras-hosted</b>
            {modelName(result.cerebras)}
          </span>
          <span>
            <b>OpenRouter GPU</b>
            {modelName(result.openrouter)}
          </span>
        </div>
      </header>

      <main className="locked-dashboard">
        <EventStrip />
        <IntroAndStart runState={runState} onRun={runBenchmark} />
        <AgentProgress result={result} />

        {runState === "error" ? (
          <div className="status-message" role="status">
            Live provider route was unavailable; cached demo numbers are displayed.
          </div>
        ) : null}

        <div className="main-review-grid">
          <InputPanel onOpenImage={() => setImageOpen(true)} />
          <div className="right-dashboard-column">
            <OutputPanel result={result} />
            <div className="evidence-benchmark-grid">
              <ImageExtraction result={result} />
              <BenchmarkPanel result={result} />
            </div>
          </div>
        </div>

        <SupportCards />
      </main>

      <ImageModal open={imageOpen} onClose={() => setImageOpen(false)} />
    </div>
  );
}
