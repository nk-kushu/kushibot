import type { IContextSummaryProvider } from "./IContextSummaryProvider.js";
import type { SummaryRequest } from "./SummaryRequest.js";
import type { SummaryProviderOutcome } from "./SummaryProviderOutcome.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
export class DuplicateObservationSummaryProvider implements IContextSummaryProvider {
  readonly id = "exact-duplicate-extraction"; readonly version = "1";
  async propose(request: SummaryRequest, _context: IExecutionContext): Promise<SummaryProviderOutcome> {
    const groups = new Map<string, string[]>();
    for (const source of request.sources) { const ids = groups.get(source.text) ?? []; ids.push(source.id); groups.set(source.text, ids); }
    return { status: "proposed", value: { points: [...groups].map(([text, sourceIds]) => ({ text, sourceIds })) } };
  }
}
