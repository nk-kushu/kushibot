import type { MemoryProposal } from "./MemoryProposal.js";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation.js";
export type KnowledgeValidationInput=Readonly<{proposal:MemoryProposal;observation:KnowledgeSourceObservation;nowEpochMs:number}>;
