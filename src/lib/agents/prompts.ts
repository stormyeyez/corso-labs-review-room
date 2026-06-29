import type { EncounterPacket, SourceCard } from "@/lib/types";
import type { ChatMessage } from "@/lib/providers/chat-types";

export type AgentKind =
  | "intake"
  | "image-evidence"
  | "workup"
  | "mdm-draft"
  | "medical-literature"
  | "institution-context"
  | "safety-review"
  | "coordinator"
  | "openrouter-gpu";

const safetyContract = [
  "Use synthetic demo data only.",
  "Do not diagnose or recommend treatment.",
  "Produce concise clinician-controlled documentation QA output.",
  "Return JSON only.",
].join(" ");

function formatEncounter(encounter: EncounterPacket): string {
  return [
    `Title: ${encounter.title}`,
    `Triage: ${encounter.triage}`,
    `Vitals: ${encounter.vitals}`,
    `Clinician notes: ${encounter.clinicianNotes}`,
    `Workup results: ${encounter.workupResults}`,
    `Reassessment: ${encounter.reassessment}`,
    `Working concerns: ${encounter.workingConcerns}`,
  ].join("\n");
}

function formatSourceCards(cards: SourceCard[]): string {
  return cards
    .map((card) => {
      return [
        `ID: ${card.id}`,
        `Title: ${card.title}`,
        `Kind: ${card.kind}`,
        `Summary: ${card.summary}`,
        `Supports: ${card.supports.join(" | ")}`,
        `Caution: ${card.caution}`,
      ].join("\n");
    })
    .join("\n\n");
}

function baseMessages(task: string, encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: `${safetyContract} You are a hackathon demo agent for ED documentation QA, not a clinical decision-maker.`,
    },
    {
      role: "user",
      content: [
        task,
        "",
        "Synthetic encounter:",
        formatEncounter(encounter),
        "",
        "Curated public-safe source cards:",
        formatSourceCards(sourceCards),
      ].join("\n"),
    },
  ];
}

export function buildIntakePrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    'Intake Agent: extract chief concern, timing, risk context, vitals, and supplied clinician concerns. Return {"summary": string, "facts": string[]}.',
    encounter,
    sourceCards,
  );
}

export function buildImagePrompt(
  encounter: EncounterPacket,
  sourceCards: SourceCard[],
  imageDataUri?: string,
): ChatMessage[] {
  const prompt =
    'Image Evidence Agent: read the supplied synthetic result image and extract ECG, troponin, and CXR facts. Return {"summary": string, "imageFacts": string[]}.';

  if (!imageDataUri) {
    return baseMessages(prompt, encounter, sourceCards);
  }

  return [
    {
      role: "system",
      content: `${safetyContract} You are reviewing a synthetic demo image only.`,
    },
    {
      role: "user",
      content: [
        { type: "text", text: `${prompt}\n\nSynthetic encounter:\n${formatEncounter(encounter)}` },
        { type: "image_url", image_url: { url: imageDataUri } },
      ],
    },
  ];
}

export function buildWorkupPrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    'Workup Agent: organize reviewed tests, pending serial interpretation, reassessment, and uncertainty boundaries. Return {"summary": string, "workup": string[]}.',
    encounter,
    sourceCards,
  );
}

export function buildMdmPrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    'MDM Draft Agent: draft clinician-editable MDM QA language without diagnosis or treatment instructions. Return {"summary": string, "mdmDraft": string}.',
    encounter,
    sourceCards,
  );
}

export function buildMedicalLiteraturePrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    'Medical Literature Check Agent: match MDM claims to source-card IDs and flag unsupported claims. Return {"summary": string, "matches": [{"claim": string, "sourceCardId": string}]}.',
    encounter,
    sourceCards,
  );
}

export function buildInstitutionContextPrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    'Institution Context Check Agent: identify interpretation points that depend on local assay, workflow, or policy context. Return {"summary": string, "flags": string[]}.',
    encounter,
    sourceCards,
  );
}

export function buildSafetyPrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    'Safety Review Agent: remove overclaims, diagnosis automation, treatment recommendations, PHI implications, and production-readiness claims. Return {"summary": string, "safetyChecks": string[]}.',
    encounter,
    sourceCards,
  );
}

export function buildCoordinatorPrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    [
      "Coordinator Agent: create the final review packet JSON.",
      "Required top-level keys: caseFrame, keyDataExtracted, mdmDraft, medicalLiteratureMatches, institutionDependentFlags, multimodalEvidence, needsClinicianVerification, safetyOverclaimCheck.",
      "medicalLiteratureMatches entries must include claim, matchedSourceCardId, usedInMdm, and verification.",
    ].join(" "),
    encounter,
    sourceCards,
  );
}

export function buildOpenRouterGpuPrompt(encounter: EncounterPacket, sourceCards: SourceCard[]): ChatMessage[] {
  return baseMessages(
    "OpenRouter GPU comparison path: produce the same final review packet JSON for timing comparison against the Cerebras multi-agent chain.",
    encounter,
    sourceCards,
  );
}

export function buildAgentMessages(
  kind: AgentKind,
  encounter: EncounterPacket,
  sourceCards: SourceCard[],
  imageDataUri?: string,
): ChatMessage[] {
  switch (kind) {
    case "intake":
      return buildIntakePrompt(encounter, sourceCards);
    case "image-evidence":
      return buildImagePrompt(encounter, sourceCards, imageDataUri);
    case "workup":
      return buildWorkupPrompt(encounter, sourceCards);
    case "mdm-draft":
      return buildMdmPrompt(encounter, sourceCards);
    case "medical-literature":
      return buildMedicalLiteraturePrompt(encounter, sourceCards);
    case "institution-context":
      return buildInstitutionContextPrompt(encounter, sourceCards);
    case "safety-review":
      return buildSafetyPrompt(encounter, sourceCards);
    case "coordinator":
      return buildCoordinatorPrompt(encounter, sourceCards);
    case "openrouter-gpu":
      return buildOpenRouterGpuPrompt(encounter, sourceCards);
  }
}
