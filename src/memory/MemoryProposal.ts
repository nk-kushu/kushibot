import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { KnowledgeSourceRef } from "./KnowledgeSourceRef.js";
export type MemoryProposal=Readonly<{
 id:string;scope:ExecutionScopeRef;topic:string;statement:string;source:KnowledgeSourceRef;
 createdAtEpochMs:number;expiresAtEpochMs:number;
}>;
