import type { IPolicy } from "../../../contracts/IPolicy.js";
import type { IClock } from "../../../contracts/runtime/IClock.js";
import type { ExecutionScopeRef } from "../../../contracts/runtime/ExecutionScopeRef.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
import type { ComposedAgentContext } from "../../context/ComposedAgentContext.js";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput.js";
import type { PromptCachePolicyDecision } from "./PromptCachePolicyDecision.js";
import type { PromptCachePreparedOutcome } from "./PromptCachePreparedOutcome.js";
import { ModelRequestValidator } from "../ModelRequestValidator.js";
import { ExecutionBoundaryGuard } from "../../../execution-control/ExecutionBoundaryGuard.js";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError.js";
export class PromptCacheRequestPreparer {
  private readonly scope: ExecutionScopeRef;
  constructor(scope: ExecutionScopeRef, private readonly maxRequestBytes: number,
    private readonly policy: IPolicy<PromptCachePolicyInput, PromptCachePolicyDecision>,
    private readonly validator: ModelRequestValidator, private readonly clock: IClock) {
    if (!Number.isSafeInteger(maxRequestBytes) || maxRequestBytes < 1) throw new PromptCacheConfigurationError();
    this.scope = Object.freeze({ ...scope });
  }
  async prepare(composed: ComposedAgentContext, context: IExecutionContext): Promise<PromptCachePreparedOutcome> {
    if (context.scope.scopeId !== this.scope.scopeId || context.scope.projectId !== this.scope.projectId || context.scope.workspaceId !== this.scope.workspaceId || this.maxRequestBytes > composed.profile.maxRequestBytes) throw new PromptCacheConfigurationError();
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const before = controls.check(); if (before !== null) return { status: "stopped", reason: before };
    const decision = await this.policy.apply(Object.freeze({ profile: composed.profile, instructionRevision: composed.instructionRevision, instructions: composed.request.instructions }));
    const after = controls.check(); if (after !== null) return { status: "stopped", reason: after };
    if (decision.kind === "unsupported") return { status: "unsupported", code: decision.code };
    const request = Object.freeze({ ...composed.request, promptCacheKey: decision.kind === "keyed" ? decision.key : null });
    if (new TextEncoder().encode(JSON.stringify(request)).byteLength > this.maxRequestBytes) return { status: "limit-reached", code: "CACHE_METADATA_EXCEEDS_REQUEST_LIMIT" };
    const validated = this.validator.validate(request, composed.profile);
    return Object.freeze({ status: "ready", context: Object.freeze({ ...composed, request: validated }) });
  }
}
