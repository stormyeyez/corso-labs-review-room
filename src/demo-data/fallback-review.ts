import { demoEncounter } from "./encounter";
import { sourceCards } from "./source-cards";
import { calculateSpeedup } from "@/lib/metrics";
import type { RaceResult } from "@/lib/types";

const cerebrasTotalMs = 3900;
const openRouterTotalMs = 16200;

export const fallbackReview: RaceResult = {
  encounter: demoEncounter,
  sourceCards,
  agents: [
    {
      id: "intake",
      label: "Intake",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 340,
      summary: "Extracted triage, vitals, symptom timing, and clinician-stated concerns.",
    },
    {
      id: "image-evidence",
      label: "Image",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 520,
      summary: "Read synthetic ECG, troponin, and CXR facts from the raster image.",
    },
    {
      id: "workup",
      label: "Workup",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 410,
      summary: "Organized ECG, troponin, CXR, reassessment, and pending serial testing context.",
    },
    {
      id: "mdm-draft",
      label: "HPI",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 780,
      summary: "Drafted clinician-editable documentation language without making decisions.",
    },
    {
      id: "medical-literature",
      label: "Claim Check",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 550,
      summary: "Checked output claims against curated medical reference support.",
    },
    {
      id: "institution-context",
      label: "Local Rules",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 480,
      summary: "Flagged troponin assay and workflow interpretation as institution-dependent.",
    },
    {
      id: "safety-review",
      label: "Safety",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 390,
      summary: "Removed diagnosis automation language and preserved clinician verification boundaries.",
    },
    {
      id: "coordinator",
      label: "Merge",
      provider: "cerebras",
      status: "fallback",
      elapsedMs: 430,
      summary: "Merged agent outputs into the final MDM review packet.",
    },
  ],
  cerebras: {
    provider: "cerebras",
    model: "gemma-4-31b",
    totalMs: cerebrasTotalMs,
    timeToFirstTokenMs: 180,
    outputTokensPerSecond: 1950,
    promptTokens: 3100,
    completionTokens: 950,
    usedFallback: true,
  },
  openrouter: {
    provider: "openrouter",
    model: "google/gemma-4-31b-it",
    totalMs: openRouterTotalMs,
    timeToFirstTokenMs: 950,
    outputTokensPerSecond: 470,
    promptTokens: 3100,
    completionTokens: 900,
    usedFallback: true,
  },
  speedup: calculateSpeedup(cerebrasTotalMs, openRouterTotalMs),
  packet: {
    caseFrame:
      "Synthetic 54-year-old man with pressure-like chest discomfort, stable vital signs, ECG/troponin/CXR reviewed, symptoms improved after ED treatment, ACS remains a documented concern while other dangerous causes are reviewed with stated limits.",
    keyDataExtracted: [
      "Chest pressure for approximately 2 hours with risk factors.",
      "Stable oxygenation and no shock physiology in supplied vitals.",
      "Mock result image states ECG without STEMI pattern.",
      "Mock result image states initial hs-troponin is available.",
      "Mock result image states CXR has no acute cardiopulmonary finding.",
    ],
    mdmDraft:
      "MDM draft for clinician editing: Patient evaluated for acute chest discomfort with ACS considered. ECG, initial hs-troponin, chest radiograph, vitals, treatment response, and reassessment were reviewed. Symptoms improved after ED treatment. Serial troponin interpretation and final risk assessment require clinician review and institution-specific assay context. PE and aortic dissection were considered less likely from the supplied facts, with final reasoning left to the clinician.",
    medicalLiteratureMatches: [
      {
        claim: "ECG and troponin review are relevant when ACS is considered in ED chest pain documentation.",
        matchedSourceCardId: "serial-ecg-troponin-review",
        usedInMdm: true,
        verification: "supported",
      },
      {
        claim: "MDM should preserve dangerous alternative diagnoses considered without overstating exclusion.",
        matchedSourceCardId: "ed-chest-pain-evaluation",
        usedInMdm: true,
        verification: "clinician_review",
      },
      {
        claim: "Generated language remains clinician-editable and not final chart text.",
        matchedSourceCardId: "clinician-verification-boundary",
        usedInMdm: true,
        verification: "supported",
      },
    ],
    institutionDependentFlags: [
      "Troponin interpretation depends on local assay, units, reference range, and delta pathway.",
      "ECG workflow or overread timing may depend on institution-specific process.",
    ],
    multimodalEvidence: {
      extractedFromImage: [
      "ECG: sinus rhythm with no STEMI pattern noted in synthetic summary.",
      "Troponin: initial 8 ng/L, repeat pending; serial interpretation requires assay context.",
      "CXR: no acute cardiopulmonary abnormality.",
      ],
      usedDownstreamIn: [
        "Key Data Extracted",
        "MDM Draft",
        "Medical Literature Check",
        "Safety Review",
      ],
    },
    needsClinicianVerification: [
      "Final diagnosis and disposition decision.",
      "Troponin interpretation using the actual local assay and timing.",
      "Whether PE/aortic dissection reasoning is complete for the actual patient context.",
    ],
    safetyOverclaimCheck: [
      "No autonomous diagnosis made.",
      "No treatment recommendation made.",
      "No claim of clinical validation or production readiness.",
      "Institution-dependent interpretation is flagged rather than guessed.",
    ],
  },
  errorSummary:
    "Cached demo result shown. Configure server-side provider keys for live race results.",
};
