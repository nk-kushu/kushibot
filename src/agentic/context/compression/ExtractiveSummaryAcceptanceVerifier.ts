import type { ISummaryAcceptanceVerifier } from "./ISummaryAcceptanceVerifier.js";
import type { SummaryRequest } from "./SummaryRequest.js";
import type { SummaryProposal } from "./SummaryProposal.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
export class ExtractiveSummaryAcceptanceVerifier implements ISummaryAcceptanceVerifier {
  readonly id = "exact-source-coverage"; readonly version = "1";
  async verify(proposal: SummaryProposal, request: SummaryRequest, _context: IExecutionContext): Promise<boolean> {
    const sources = new Map(request.sources.map(source => [source.id, source.text]));
    const covered = new Set<string>();
    for (const point of proposal.points) for (const id of point.sourceIds) { if (!sources.has(id) || sources.get(id) !== point.text) return false; covered.add(id); }
    return covered.size === sources.size;
  }
}
