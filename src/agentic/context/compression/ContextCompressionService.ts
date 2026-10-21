import type { IPolicy } from "../../../contracts/IPolicy.js";
import type { IClock } from "../../../contracts/runtime/IClock.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
import type { IModelInputSizer } from "../../model/IModelInputSizer.js";
import type { ContextCompositionInput } from "../ContextCompositionInput.js";
import type { ContextFragment } from "../ContextFragment.js";
import type { IContextSnapshotVerifier } from "../IContextSnapshotVerifier.js";
import type { CompressionPolicyInput } from "./CompressionPolicyInput.js";
import type { CompressionDecision } from "./CompressionDecision.js";
import type { IContextSummaryProvider } from "./IContextSummaryProvider.js";
import type { ISummaryAcceptanceVerifier } from "./ISummaryAcceptanceVerifier.js";
import type { IContextSummaryStore } from "./IContextSummaryStore.js";
import type { ContextSummaryRecord } from "./ContextSummaryRecord.js";
import type { ContextCompressionOutcome } from "./ContextCompressionOutcome.js";
import { ContextCompositionInputContract } from "../ContextCompositionInputContract.js";
import { StableContextFormatter } from "../StableContextFormatter.js";
import { DynamicContextFormatter } from "../DynamicContextFormatter.js";
import { SummaryProposalContract } from "./SummaryProposalContract.js";
import { JsonValueContract } from "../../../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../../../execution-control/ExecutionBoundaryGuard.js";
import { ContextCompressionError } from "../../../errors/ContextCompressionError.js";
export class ContextCompressionService {
  constructor(private readonly inputContract: ContextCompositionInputContract, private readonly snapshots: IContextSnapshotVerifier,
    private readonly policy: IPolicy<CompressionPolicyInput, CompressionDecision>, private readonly provider: IContextSummaryProvider,
    private readonly acceptance: ISummaryAcceptanceVerifier, private readonly store: IContextSummaryStore,
    private readonly stable: StableContextFormatter, private readonly dynamic: DynamicContextFormatter,
    private readonly sizer: IModelInputSizer, private readonly json: JsonValueContract, private readonly clock: IClock,
    private readonly maxSummaryBytes: number) {
    if (!Number.isSafeInteger(maxSummaryBytes) || maxSummaryBytes < 1 || maxSummaryBytes > 8192) throw new ContextCompressionError();
  }
  async compress(raw: ContextCompositionInput, context: IExecutionContext): Promise<ContextCompressionOutcome> {
    const checked = await this.inputContract.validate(raw); if (!checked.valid) throw new ContextCompressionError();
    const original = checked.value;
    if (original.scope.scopeId !== context.scope.scopeId || original.scope.projectId !== context.scope.projectId || original.scope.workspaceId !== context.scope.workspaceId || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(context.identity.operationId)) throw new ContextCompressionError();
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const before = controls.check(); if (before !== null) return { status: "stopped", original, reason: before };
    if (!await this.snapshots.verify(original, context)) return { status: "unchanged", original, code: "SOURCE_SNAPSHOT_UNVERIFIED" };
    const decision = await this.policy.apply({ candidates: Object.freeze(original.optionalFragments.map(source => Object.freeze({ id: source.id, kind: source.kind, priority: source.priority }))), maxSources: 8 });
    if (!Array.isArray(decision.sourceIds) || decision.sourceIds.length > 8 || new Set(decision.sourceIds).size !== decision.sourceIds.length) throw new ContextCompressionError();
    const sources = decision.sourceIds.map(id => original.optionalFragments.find(source => source.id === id));
    if (sources.some(source => source === undefined || (source.kind !== "source" && source.kind !== "observation"))) throw new ContextCompressionError();
    if (sources.length < 2) return { status: "unchanged", original, code: "INSUFFICIENT_ORIGINAL_SOURCES" };
    const requestedIds = new Set(decision.sourceIds);
    const ordered = original.optionalFragments.filter(source => requestedIds.has(source.id));
    const start = original.optionalFragments.findIndex(source => requestedIds.has(source.id));
    if (original.optionalFragments.slice(start, start + ordered.length).some(source => !requestedIds.has(source.id))) return { status: "unchanged", original, code: "NONCONTIGUOUS_SOURCE_WINDOW" };
    const request = Object.freeze({ sources: Object.freeze(ordered), maxSummaryBytes: this.maxSummaryBytes });
    const preCall = controls.check(); if (preCall !== null) return { status: "stopped", original, reason: preCall };
    let proposed: import("./SummaryProviderOutcome.js").SummaryProviderOutcome;
    try { proposed = await this.provider.propose(request, context); }
    catch { return { status: "uncertain", original, pendingOperationRefs: Object.freeze([...new Set([...original.assignment.pendingOperationRefs, context.identity.operationId])]) }; }
    if (proposed.status === "uncertain") return { status: "uncertain", original, pendingOperationRefs: Object.freeze([...new Set([...original.assignment.pendingOperationRefs, proposed.operationId])]) };
    if (proposed.status === "stopped") return { status: "stopped", original, reason: proposed.reason };
    const afterCall = controls.check(); if (afterCall !== null) return { status: "stopped", original, reason: afterCall };
    if (proposed.status !== "proposed") return { status: "unchanged", original, code: "SUMMARY_UNAVAILABLE" };
    const proposal = await new SummaryProposalContract(request, this.json).validate(proposed.value);
    if (!proposal.valid || !await this.acceptance.verify(proposal.value, request, context)) return { status: "unchanged", original, code: "SUMMARY_NOT_ACCEPTED" };
    if (!await this.snapshots.verify(original, context)) return { status: "unchanged", original, code: "SOURCE_SNAPSHOT_BECAME_STALE" };
    const preSave = controls.check(); if (preSave !== null) return { status: "stopped", original, reason: preSave };
    const summary: ContextSummaryRecord = Object.freeze({ schemaVersion: 1, summaryId: context.identity.operationId, sourceSnapshotRef: original.snapshotRef, scope: original.scope,
      acceptanceId: this.acceptance.id, acceptanceVersion: this.acceptance.version, generatorId: this.provider.id, generatorVersion: this.provider.version, sources: Object.freeze(request.sources.map(source => Object.freeze({ id: source.id, sourceRef: source.sourceRef, revisionRef: source.revisionRef }))),
      points: proposal.value.points, unresolved: original.assignment.unresolved, pendingOperationRefs: original.assignment.pendingOperationRefs });
    const text = JSON.stringify({ derived: true, points: summary.points, sources: summary.sources, unresolved: summary.unresolved, pendingOperationRefs: summary.pendingOperationRefs });
    if (new TextEncoder().encode(text).byteLength > 8192) return { status: "unchanged", original, code: "DERIVED_CONTEXT_TOO_LARGE" };
    const artifact = await this.store.save(summary, context);
    if (!/^[a-zA-Z0-9_.:-]{1,240}$/.test(artifact.artifactId) || !/^[a-f0-9]{64}$/.test(artifact.digest)) throw new ContextCompressionError();
    const fragment: ContextFragment = Object.freeze({ id: `summary:${summary.summaryId}`, kind: "summary", revisionRef: artifact.digest, sourceRef: `artifact:${artifact.artifactId}`, text, priority: Math.max(...request.sources.map(source => source.priority)) });
    const selected = new Set(decision.sourceIds); const optional: ContextFragment[] = []; let inserted = false;
    for (const source of original.optionalFragments) { if (!selected.has(source.id)) optional.push(source); else if (!inserted) { optional.push(fragment); inserted = true; } }
    const instructions = this.stable.format(original);
    const beforeMessages = this.dynamic.format(original, original.optionalFragments), afterMessages = this.dynamic.format(original, optional);
    const beforeTokens = await this.sizer.upperBound({ instructions, messages: beforeMessages }), afterTokens = await this.sizer.upperBound({ instructions, messages: afterMessages });
    if (![beforeTokens, afterTokens].every(value => Number.isSafeInteger(value) && value > 0)) throw new ContextCompressionError();
    const sizedStop = controls.check(); if (sizedStop !== null) return { status: "stopped", original, reason: sizedStop, savedArtifact: artifact };
    if (afterTokens >= beforeTokens || new TextEncoder().encode(JSON.stringify(afterMessages)).byteLength >= new TextEncoder().encode(JSON.stringify(beforeMessages)).byteLength) return { status: "unchanged", original, code: "NO_MEASURED_SAVING", savedArtifact: artifact };
    const postSaveStop = controls.check(); if (postSaveStop !== null) return { status: "stopped", original, reason: postSaveStop, savedArtifact: artifact };
    if (!await this.snapshots.verify(original, context)) return { status: "unchanged", original, code: "SOURCE_SNAPSHOT_BECAME_STALE", savedArtifact: artifact };
    const finalStop = controls.check(); if (finalStop !== null) return { status: "stopped", original, reason: finalStop, savedArtifact: artifact };
    return Object.freeze({ status: "prepared", measurement: Object.freeze({ beforeInputTokenUpperBound: beforeTokens, afterInputTokenUpperBound: afterTokens, beforeMessageBytes: new TextEncoder().encode(JSON.stringify(beforeMessages)).byteLength, afterMessageBytes: new TextEncoder().encode(JSON.stringify(afterMessages)).byteLength }), original, summary, artifact, fragment, replacedIds: Object.freeze([...decision.sourceIds]) });
  }
}
