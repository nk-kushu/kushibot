import type { KnowledgeSourceRef } from "./KnowledgeSourceRef.js";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IKnowledgeSourceReader {
 read(source:KnowledgeSourceRef,context:IExecutionContext):Promise<KnowledgeSourceObservation>;
}
