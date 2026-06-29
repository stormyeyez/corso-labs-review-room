import type { EncounterPacket } from "@/lib/types";

export const demoEncounter: EncounterPacket = {
  id: "synthetic-ed-chest-pain-001",
  title: "Synthetic ED Chest Pain Encounter",
  triage:
    "54-year-old man presents to the ED with pressure-like central chest discomfort for approximately 2 hours. Symptoms began while walking to his car. No syncope reported.",
  vitals:
    "BP 152/88, HR 96, RR 18, SpO2 98% on room air, Temp 98.4 F. Patient appears uncomfortable but is speaking in full sentences.",
  clinicianNotes:
    "Clinician assessment notes pressure-like chest discomfort with mild diaphoresis. No focal neurologic deficit. No tearing pain, no pulse deficit documented, and no unilateral leg swelling documented. Risk factors include hypertension and family history of coronary disease.",
  workupResults:
    "ECG obtained. High-sensitivity troponin resulted. Chest radiograph resulted. Basic metabolic panel and CBC available. Aspirin given in ED. Repeat troponin planned based on clinical pathway.",
  reassessment:
    "Symptoms improved after ED treatment. Patient remains hemodynamically stable. Clinician documents ACS considered; PE and aortic dissection reviewed as dangerous alternatives based on available facts.",
  workingConcerns:
    "ACS remains on the working differential. PE/aortic dissection are considered less likely from available facts but require clinician judgment and documentation of reasoning boundaries.",
};
