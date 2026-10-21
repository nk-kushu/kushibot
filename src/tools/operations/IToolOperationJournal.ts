import type { ToolOperationClaim } from "./ToolOperationClaim.js";
import type { ToolOperationClaimResult } from "./ToolOperationClaimResult.js";
import type { ToolObservation } from "../ToolObservation.js";
export interface IToolOperationJournal {
  initialize(): Promise<void>;
  claim(command: ToolOperationClaim): Promise<ToolOperationClaimResult>;
  releaseBeforeDispatch(command: ToolOperationClaim): Promise<void>;
  complete(command: ToolOperationClaim, observation: ToolObservation): Promise<void>;
}
