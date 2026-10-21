import type { GuardSelection } from "./GuardSelection.js";
import type { GuardTarget } from "./GuardTarget.js";
import type { GuardCheckRecord } from "./GuardCheckRecord.js";
import type { GuardRunOutcome } from "./GuardRunOutcome.js";
import type { IGuardTargetVerifier } from "./IGuardTargetVerifier.js";
import type { IGuardEvidenceVerifier } from "./IGuardEvidenceVerifier.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import { GuardRegistry } from "./GuardRegistry.js";
import { GuardCheckResultContract } from "./GuardCheckResultContract.js";
import { BoundedGuardCheckRunner } from "./BoundedGuardCheckRunner.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { GuardConfigurationError } from "../errors/GuardConfigurationError.js";
export class GuardRunner {
  constructor(private readonly registry: GuardRegistry, private readonly targets: IGuardTargetVerifier,
    private readonly evidence: IGuardEvidenceVerifier, private readonly executor: BoundedGuardCheckRunner,
    private readonly json: JsonValueContract, private readonly clock: IClock, private readonly ids: IIdGenerator) {}
  async run(selection: GuardSelection, targetInput: GuardTarget, context: IExecutionContext): Promise<GuardRunOutcome> {
    if (selection.schemaVersion !== 1 || selection.guards.length > 16 || new Set(selection.guards.map(guard => guard.id)).size !== selection.guards.length ||
        targetInput.workspaceId !== context.scope.workspaceId || !/^[a-zA-Z0-9_.:/-]{1,128}$/.test(targetInput.revisionRef) || !Array.isArray(targetInput.artifactRefs) || targetInput.artifactRefs.length > 32 ||
        targetInput.artifactRefs.some(ref => typeof ref !== "string" || !/^[a-zA-Z0-9_.:/-]{1,256}$/.test(ref))) throw new GuardConfigurationError();
    const target = Object.freeze({ ...targetInput, artifactRefs: Object.freeze([...targetInput.artifactRefs]) });
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    let stopReason = controls.check(); const records: GuardCheckRecord[] = [];
    const pending = new Set(selection.pendingOperationRefs);
    if (stopReason === null && !await this.targets.verify(target, context)) throw new GuardConfigurationError();
    let attempts = 0;
    for (const selected of selection.guards) {
      const guard = this.registry.guard(selected.id); if (guard.version !== selected.version) throw new GuardConfigurationError();
      for (const checkId of new Set(guard.rules.flatMap(rule => [...rule.checkIds]))) {
        const check = this.registry.check(checkId); const operationId = this.ids.nextId();
        const input = Object.freeze({ guardId: guard.id, guardVersion: guard.version, checkId, checkVersion: check.version,
          ruleIds: Object.freeze(guard.rules.filter(rule => rule.checkIds.includes(checkId)).map(rule => rule.id)), target });
        let status: GuardCheckRecord["status"] = "unavailable"; let result: GuardCheckRecord["result"] = null;
        stopReason = stopReason ?? controls.check();
        if (stopReason === null && pending.size === 0 && attempts < 32) {
          attempts++;
          const checkContext = Object.freeze({ ...context, identity: Object.freeze({ ...context.identity, parentOperationId: context.identity.operationId, operationId }) });
          const executed = await this.executor.run(check, input, checkContext);
          if (executed.status === "uncertain") { status = "uncertain"; pending.add(operationId); }
          if (executed.status === "returned") {
            const canonical = await this.json.validate(executed.value);
            if (canonical.valid && new TextEncoder().encode(JSON.stringify(canonical.value)).byteLength <= 32768) {
              const refs = this.references(canonical.value);
              const validated = await new GuardCheckResultContract(input, refs, this.json).validate(canonical.value);
              if (validated.valid && await this.evidence.verify(refs, input, checkContext) && await this.targets.verify(target, context)) { result = validated.value; status = "completed"; }
            }
          }
        }
        records.push(Object.freeze({ guardId: guard.id, guardVersion: guard.version, checkId, checkVersion: check.version, operationId, revisionRef: target.revisionRef, status, result }));
      }
    }
    return Object.freeze({ report: Object.freeze({ schemaVersion: 1 as const, selection, target, checks: Object.freeze(records), pendingOperationRefs: Object.freeze([...pending]) }), stopReason: stopReason ?? controls.check() });
  }
  private references(value: unknown): readonly string[] {
    if (value === null || typeof value !== "object" || !Array.isArray((value as { findings?: unknown }).findings)) return [];
    const result = new Set<string>();
    for (const finding of (value as { findings: unknown[] }).findings) {
      if (finding === null || typeof finding !== "object" || !Array.isArray((finding as { evidenceRefs?: unknown }).evidenceRefs)) continue;
      for (const ref of (finding as { evidenceRefs: unknown[] }).evidenceRefs) if (typeof ref === "string" && /^[a-zA-Z0-9_.:/-]{1,256}$/.test(ref)) result.add(ref);
    }
    return Object.freeze([...result]);
  }
}
