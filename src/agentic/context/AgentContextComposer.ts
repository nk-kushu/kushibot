import type { IPolicy } from "../../contracts/IPolicy.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { ModelProfile } from "../../models/ModelProfile.js";
import type { ModelRequest } from "../model/ModelRequest.js";
import type { IModelInputSizer } from "../model/IModelInputSizer.js";
import type { ContextLimits } from "./ContextLimits.js";
import type { ContextCompositionInput } from "./ContextCompositionInput.js";
import type { ContextCompositionOutcome } from "./ContextCompositionOutcome.js";
import type { ContextPolicyInput } from "./ContextPolicyInput.js";
import type { ContextPolicyDecision } from "./ContextPolicyDecision.js";
import type { ContextFragment } from "./ContextFragment.js";
import type { IContextSnapshotVerifier } from "./IContextSnapshotVerifier.js";
import { ContextCompositionInputContract } from "./ContextCompositionInputContract.js";
import { StableContextFormatter } from "./StableContextFormatter.js";
import { DynamicContextFormatter } from "./DynamicContextFormatter.js";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard.js";
import { ModelRequestValidator } from "../model/ModelRequestValidator.js";
import { ContextCompositionError } from "../../errors/ContextCompositionError.js";
export class AgentContextComposer {
  private readonly profile: ModelProfile; private readonly limits: ContextLimits;
  constructor(profile: ModelProfile, limits: ContextLimits, private readonly contract: ContextCompositionInputContract,
    private readonly verifier: IContextSnapshotVerifier, private readonly policy: IPolicy<ContextPolicyInput, ContextPolicyDecision>,
    private readonly stable: StableContextFormatter, private readonly dynamic: DynamicContextFormatter,
    private readonly sizer: IModelInputSizer, private readonly validator: ModelRequestValidator, private readonly clock: IClock) {
    if (![limits.maxInputTokens, limits.maxOutputTokens, limits.maxRequestBytes].every(value => Number.isSafeInteger(value) && value > 0) ||
        !Number.isSafeInteger(limits.maxOptionalFragments) || limits.maxOptionalFragments < 0 || limits.maxOptionalFragments > 32 ||
        limits.maxOutputTokens > profile.maxOutputTokens || limits.maxInputTokens > profile.contextTokens - limits.maxOutputTokens || limits.maxRequestBytes > profile.maxRequestBytes) throw new ContextCompositionError();
    this.profile = Object.freeze({ ...profile }); this.limits = Object.freeze({ ...limits });
  }
  async compose(raw: ContextCompositionInput, context: IExecutionContext): Promise<ContextCompositionOutcome> {
    const checked = await this.contract.validate(raw); if (!checked.valid) throw new ContextCompositionError();
    const input = checked.value;
    if (input.scope.scopeId !== context.scope.scopeId || input.scope.projectId !== context.scope.projectId || input.scope.workspaceId !== context.scope.workspaceId) throw new ContextCompositionError();
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const before = controls.check(); if (before !== null) return { status: "stopped", reason: before };
    if (!await this.verifier.verify(input, context)) return { status: "unverified", code: "CONTEXT_SNAPSHOT_UNVERIFIED" };
    const verifiedStop = controls.check(); if (verifiedStop !== null) return { status: "stopped", reason: verifiedStop };
    const instructions = this.stable.format(input);
    const mandatory = await this.request(input, instructions, []);
    const sizedStop = controls.check(); if (sizedStop !== null) return { status: "stopped", reason: sizedStop };
    if (!this.fits(mandatory)) return { status: "limit-reached", code: "REQUIRED_CONTEXT_TOO_LARGE" };
    const decision = await this.policy.apply(Object.freeze({ candidates: Object.freeze(input.optionalFragments.map(fragment => Object.freeze({ id: fragment.id, kind: fragment.kind, priority: fragment.priority }))), maxFragments: this.limits.maxOptionalFragments }));
    const selectedStop = controls.check(); if (selectedStop !== null) return { status: "stopped", reason: selectedStop };
    const offered = new Map(input.optionalFragments.map(fragment => [fragment.id, fragment]));
    if (!Array.isArray(decision.orderedOptionalIds) || decision.orderedOptionalIds.length > this.limits.maxOptionalFragments || new Set(decision.orderedOptionalIds).size !== decision.orderedOptionalIds.length || decision.orderedOptionalIds.some(id => !offered.has(id))) throw new ContextCompositionError();
    const selected = decision.orderedOptionalIds.map(id => offered.get(id)!); const dropped: string[] = [];
    let request = mandatory;
    if (selected.length > 0) {
      for (;;) {
        const stop = controls.check(); if (stop !== null) return { status: "stopped", reason: stop };
        request = await this.request(input, instructions, selected);
        if (this.fits(request)) break;
        const removed = selected.pop(); if (removed !== undefined) dropped.push(removed.id);
        if (selected.length === 0) { request = mandatory; break; }
      }
    }
    const after = controls.check(); if (after !== null) return { status: "stopped", reason: after };
    if (!await this.verifier.verify(input, context)) return { status: "unverified", code: "CONTEXT_SNAPSHOT_UNVERIFIED" };
    const finalStop = controls.check(); if (finalStop !== null) return { status: "stopped", reason: finalStop };
    const ready = this.validator.validate(request, this.profile);
    const kept = new Set(selected.map(fragment => fragment.id));
    return Object.freeze({ status: "ready", context: Object.freeze({ request: ready, profile: this.profile, snapshotRef: input.snapshotRef, instructionRevision: input.instructions.revision,
      included: Object.freeze([...input.requiredFragments, ...selected].map(fragment => Object.freeze({ id: fragment.id, sourceRef: fragment.sourceRef, revisionRef: fragment.revisionRef }))),
      omittedOptionalIds: Object.freeze(input.optionalFragments.filter(fragment => !kept.has(fragment.id)).map(fragment => fragment.id)), droppedForSizeIds: Object.freeze(dropped) }) });
  }
  private async request(input: ContextCompositionInput, instructions: string, optional: readonly ContextFragment[]): Promise<ModelRequest> {
    const messages = this.dynamic.format(input, optional);
    const inputTokenUpperBound = await this.sizer.upperBound({ instructions, messages });
    if (!Number.isSafeInteger(inputTokenUpperBound) || inputTokenUpperBound < 1) throw new ContextCompositionError();
    return Object.freeze({ instructions, messages, inputTokenUpperBound, maxOutputTokens: this.limits.maxOutputTokens, promptCacheKey: null });
  }
  private fits(request: ModelRequest): boolean { return request.inputTokenUpperBound <= this.limits.maxInputTokens && new TextEncoder().encode(JSON.stringify(request)).byteLength <= this.limits.maxRequestBytes; }
}
