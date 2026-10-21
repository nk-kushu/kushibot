import type { SummaryRequest } from "./SummaryRequest.js";
import type { SummaryProposal } from "./SummaryProposal.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
export interface ISummaryAcceptanceVerifier { readonly id: string; readonly version: string; verify(proposal: SummaryProposal, request: SummaryRequest, context: IExecutionContext): Promise<boolean>; }
