import type { MemoryProposal } from "./MemoryProposal.js";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision.js";
import type { MemoryInvalidation } from "./MemoryInvalidation.js";
export type MemoryRecord=Readonly<{
 schemaVersion:1;revision:number;proposal:MemoryProposal;
 decision:KnowledgeValidationDecision|null;invalidation:MemoryInvalidation|null;
}>;
