import type { SourceCard } from "@/lib/types";

export const sourceCards: SourceCard[] = [
  {
    id: "ed-chest-pain-evaluation",
    title: "ED chest pain evaluation",
    kind: "medical_literature",
    summary:
      "ED chest pain documentation should preserve symptom timing, risk context, ECG review, troponin testing, dangerous alternative diagnoses considered, reassessment, and disposition reasoning.",
    supports: [
      "Chest pain MDM should include ECG and troponin review when ACS is considered.",
      "Dangerous alternatives can be documented as considered without overstating exclusion.",
    ],
    caution:
      "This card is a public-safe demo summary, not a substituted guideline or clinician decision rule.",
  },
  {
    id: "serial-ecg-troponin-review",
    title: "Serial ECG and troponin review",
    kind: "medical_literature",
    summary:
      "Serial ECG/troponin context is commonly relevant when ED clinicians evaluate possible ACS and need to document timing, repeat testing, and interpretation limits.",
    supports: [
      "Initial troponin alone may not be the full documentation story.",
      "ECG summary can be used in MDM when the clinician remains responsible for interpretation.",
    ],
    caution:
      "Actual troponin interpretation depends on assay, timing, delta rules, and clinical context.",
  },
  {
    id: "mdm-documentation-elements",
    title: "MDM documentation elements",
    kind: "medical_literature",
    summary:
      "A useful ED MDM note organizes reviewed data, risk reasoning, treatment or reassessment response, differential considerations, and the clinician's uncertainty boundaries.",
    supports: [
      "MDM language should be editable by the clinician.",
      "Documentation QA can flag missing reasoning elements without making decisions.",
    ],
    caution:
      "The app should not present generated prose as final chart language without clinician review.",
  },
  {
    id: "institution-troponin-assay-context",
    title: "Institution troponin assay context",
    kind: "institution_context",
    summary:
      "Troponin units, reference ranges, assay-specific cutoffs, and delta pathways can vary by institution and lab platform.",
    supports: [
      "A troponin-related MDM claim may need local assay context.",
      "Institution-dependent interpretation should be flagged rather than guessed.",
    ],
    caution:
      "No local hospital policy or real assay table is included in this public demo.",
  },
  {
    id: "institution-ecg-workflow-context",
    title: "Institution ECG workflow context",
    kind: "institution_context",
    summary:
      "Some ECG workflow details, routing, cardiology overread timing, and alert pathways are institution-specific.",
    supports: [
      "Documentation can note ECG review while avoiding unsupported workflow claims.",
      "Institution-specific workflow should be flagged for verification.",
    ],
    caution:
      "This demo uses a synthetic ECG summary and does not represent a real hospital pathway.",
  },
  {
    id: "clinician-verification-boundary",
    title: "Clinician verification boundary",
    kind: "medical_literature",
    summary:
      "A documentation QA assistant can organize facts and highlight gaps while preserving clinician control over diagnosis, treatment, and final documentation.",
    supports: [
      "Generated MDM draft language should remain clinician-editable.",
      "Safety checks should remove autonomous diagnosis or treatment recommendations.",
    ],
    caution:
      "The app is not clinically validated and does not replace clinician judgment.",
  },
];
