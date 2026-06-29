export type ProviderName = "cerebras" | "openrouter";

export type SourceCardKind = "medical_literature" | "institution_context";

export type SourceCard = {
  id: string;
  title: string;
  kind: SourceCardKind;
  summary: string;
  supports: string[];
  caution: string;
};

export type EncounterPacket = {
  id: string;
  title: string;
  triage: string;
  vitals: string;
  clinicianNotes: string;
  workupResults: string;
  reassessment: string;
  workingConcerns: string;
};

export type AgentTrace = {
  id: string;
  label: string;
  provider: ProviderName;
  status: "pending" | "running" | "complete" | "fallback" | "error";
  elapsedMs: number;
  summary: string;
};

export type ProviderMetrics = {
  provider: ProviderName;
  model: string;
  totalMs: number;
  timeToFirstTokenMs?: number;
  outputTokensPerSecond?: number;
  promptTokens?: number;
  completionTokens?: number;
  usedFallback: boolean;
};

export type ClaimSourceCard = {
  claim: string;
  matchedSourceCardId: string;
  usedInMdm: boolean;
  verification: "supported" | "clinician_review" | "institution_context";
};

export type ReviewPacket = {
  caseFrame: string;
  keyDataExtracted: string[];
  mdmDraft: string;
  medicalLiteratureMatches: ClaimSourceCard[];
  institutionDependentFlags: string[];
  multimodalEvidence: {
    extractedFromImage: string[];
    usedDownstreamIn: string[];
  };
  needsClinicianVerification: string[];
  safetyOverclaimCheck: string[];
};

export type RaceResult = {
  encounter: EncounterPacket;
  sourceCards: SourceCard[];
  agents: AgentTrace[];
  cerebras: ProviderMetrics;
  openrouter: ProviderMetrics;
  speedup: number | null;
  packet: ReviewPacket;
  errorSummary?: string;
};
