import type { ToolCallRequest } from "./ToolCallRequest.js";
import type { ToolDispatchOutcome } from "./ToolDispatchOutcome.js";
import type { IToolAuthorizer } from "./IToolAuthorizer.js";
import type { IToolOperationJournal } from "./operations/IToolOperationJournal.js";
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import { ToolOperationError } from "../errors/ToolOperationError.js";
import { ToolRegistry } from "./ToolRegistry.js";
import { BoundedToolRunner } from "./BoundedToolRunner.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec.js";
import { zeroUsage } from "../usage/zeroUsage.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
export class ToolDispatcher {
  private readonly allowed: ReadonlySet<string>;
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly registry: ToolRegistry, private readonly authorizer: IToolAuthorizer,
    private readonly journal: IToolOperationJournal, private readonly ledger: IUsageLedgerStore,
    private readonly budgetScopeId: string, scope: ExecutionScopeRef, allowedToolIds: readonly string[],
    private readonly clock: IClock, private readonly ids: IIdGenerator, private readonly runner: BoundedToolRunner,
    private readonly json: JsonValueContract, private readonly timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 || allowedToolIds.length > 64) throw new ToolOperationError();
    this.allowed = new Set(allowedToolIds); this.scope = Object.freeze({ ...scope });
  }
  async dispatch(request: ToolCallRequest, context: IExecutionContext): Promise<ToolDispatchOutcome> {
    request = Object.freeze({ ...request });
    context = Object.freeze({ ...context, identity: Object.freeze({ ...context.identity }), scope: Object.freeze({ ...context.scope }) });
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(request.operationId) || request.operationId !== context.identity.operationId ||
        context.scope.scopeId !== this.scope.scopeId || context.scope.projectId !== this.scope.projectId || context.scope.workspaceId !== this.scope.workspaceId) return { status: "rejected", code: "TOOL_SCOPE_OR_ID_INVALID" };
    const registered = this.registry.resolve(request.toolId);
    if (registered === null || !this.allowed.has(request.toolId)) return { status: "rejected", code: "TOOL_NOT_AVAILABLE" };
    const guard = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const initial = guard.check(); if (initial !== null) return { status: "stopped", reason: initial };
    const { descriptor, implementation } = registered;
    const argsCodec = new JsonRecordCodec(this.json, this.json, descriptor.maxArgumentBytes);
    let raw;
    try { raw = await argsCodec.decode(await argsCodec.encode(request.arguments)); }
    catch { return { status: "rejected", code: "TOOL_ARGUMENTS_INVALID" }; }
    const args = await implementation.argumentsContract.validate(raw);
    if (!args.valid) return { status: "rejected", code: "TOOL_ARGUMENTS_INVALID" };
    const canonicalArgs = await argsCodec.decode(await argsCodec.encode(args.value));
    if (!await this.authorizer.authorize(descriptor, canonicalArgs, context)) return { status: "rejected", code: "TOOL_FORBIDDEN" };
    const beforeClaim = guard.check(); if (beforeClaim !== null) return { status: "stopped", reason: beforeClaim };
    const command = Object.freeze({ operationId: request.operationId, ownerToken: this.ids.nextId(),
      requestKey: JSON.stringify({ toolId: descriptor.id, version: descriptor.version, scope: this.scope, budgetScopeId: this.budgetScopeId, arguments: canonicalArgs }) });
    const claim = await this.journal.claim(command);
    if (claim.kind === "pending") return { status: "uncertain", operationId: request.operationId };
    if (claim.kind === "completed") {
      if (claim.observation.toolId !== descriptor.id || claim.observation.toolVersion !== descriptor.version) return { status: "uncertain", operationId: request.operationId };
      const savedCodec = new JsonRecordCodec(implementation.resultContract, this.json, descriptor.maxOutputBytes);
      try {
        const value = await savedCodec.decode(await savedCodec.encode(claim.observation.value));
        return { status: "completed", observation: Object.freeze({ ...claim.observation, value }), replayed: true };
      } catch { return { status: "rejected", code: "TOOL_RECEIPT_INCOMPATIBLE" }; }
    }
    const reservation = await this.ledger.mutate(ledger => ledger.reserve(request.operationId, this.budgetScopeId, { ...zeroUsage, toolCalls: 1 }));
    if (!reservation.admitted) {
      await this.journal.releaseBeforeDispatch(command);
      return { status: "stopped", reason: { code: "limit-reached", message: "Tool-call allowance unavailable." } };
    }
    if (reservation.replayed) return { status: "uncertain", operationId: request.operationId };
    // Recheck permission after asynchronous admission; the adapter must still enforce the actual resource boundary.
    const stop = guard.check();
    if (stop !== null || !await this.authorizer.authorize(descriptor, canonicalArgs, context)) {
      await this.ledger.mutate(ledger => ledger.settle(request.operationId, zeroUsage));
      await this.journal.releaseBeforeDispatch(command);
      return stop === null ? { status: "rejected", code: "TOOL_FORBIDDEN" } : { status: "stopped", reason: stop };
    }
    const run = await this.runner.run(implementation, canonicalArgs, context, this.timeoutMs);
    if (run.kind === "not-started") {
      await this.ledger.mutate(ledger => ledger.settle(request.operationId, zeroUsage));
      await this.journal.releaseBeforeDispatch(command);
      const reason = guard.check();
      return reason === null ? { status: "rejected", code: "TOOL_RUNNER_BUSY" } : { status: "stopped", reason };
    }
    // Invocation count is known even if the operation's effects or output are uncertain.
    await this.ledger.mutate(ledger => ledger.settle(request.operationId, { ...zeroUsage, toolCalls: 1 }));
    if (run.kind === "uncertain") return { status: "uncertain", operationId: request.operationId };
    const outputCodec = new JsonRecordCodec(implementation.resultContract, this.json, descriptor.maxOutputBytes);
    let value;
    try { value = await outputCodec.decode(await outputCodec.encode(run.value)); }
    catch { return { status: "uncertain", operationId: request.operationId }; }
    const observation = Object.freeze({ operationId: request.operationId, toolId: descriptor.id, toolVersion: descriptor.version, value });
    await this.journal.complete(command, observation);
    // A received/saved observation may arrive after cancellation; the caller must check controls before continuing.
    return { status: "completed", observation, replayed: false };
  }
}
