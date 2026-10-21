import type { ContextSummaryRecord } from "./ContextSummaryRecord.js";
import type { ArtifactRef } from "../../../artifacts/ArtifactRef.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
export interface IContextSummaryStore { save(record: ContextSummaryRecord, context: IExecutionContext): Promise<ArtifactRef>; }
