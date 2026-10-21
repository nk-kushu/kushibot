import type { ContextCompressionOutcome } from "./ContextCompressionOutcome.js";
import type { ContextCompositionInput } from "../ContextCompositionInput.js";
import type { IContextSnapshotPublisher } from "./IContextSnapshotPublisher.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
import { ContextCompositionInputContract } from "../ContextCompositionInputContract.js";
import { ContextCompressionError } from "../../../errors/ContextCompressionError.js";
export class ContextSummaryInstaller {
  constructor(private readonly publisher: IContextSnapshotPublisher, private readonly contract: ContextCompositionInputContract) {}
  async install(prepared: Extract<ContextCompressionOutcome, { status: "prepared" }>, context: IExecutionContext): Promise<ContextCompositionInput> {
    if (context.scope.scopeId !== prepared.original.scope.scopeId || context.scope.projectId !== prepared.original.scope.projectId || context.scope.workspaceId !== prepared.original.scope.workspaceId) throw new ContextCompressionError();
    const selected = new Set(prepared.replacedIds); const optional = []; let inserted = false;
    for (const source of prepared.original.optionalFragments) { if (!selected.has(source.id)) optional.push(source); else if (!inserted) { optional.push(prepared.fragment); inserted = true; } }
    if (!inserted) throw new ContextCompressionError();
    const { snapshotRef, ...prior } = prepared.original;
    const candidate = Object.freeze({ ...prior, optionalFragments: Object.freeze(optional) });
    if (!(await this.contract.validate({ ...candidate, snapshotRef })).valid) throw new ContextCompressionError();
    const newRef = await this.publisher.publish({ parentSnapshotRef: snapshotRef, summaryArtifact: prepared.artifact, candidate }, context);
    if (newRef === snapshotRef) throw new ContextCompressionError();
    const checked = await this.contract.validate({ ...candidate, snapshotRef: newRef });
    if (!checked.valid) throw new ContextCompressionError();
    return checked.value;
  }
}
