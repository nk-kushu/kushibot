import type { SummaryRequest } from "./SummaryRequest.js";
import type { SummaryProviderOutcome } from "./SummaryProviderOutcome.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
export interface IContextSummaryProvider {
  readonly id: string; readonly version: string;
  propose(request: SummaryRequest, context: IExecutionContext): Promise<SummaryProviderOutcome>;
}
