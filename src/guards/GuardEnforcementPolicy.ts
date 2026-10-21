import type { IPolicy } from "../contracts/IPolicy.js";
import type { GuardEnforcementInput } from "./GuardEnforcementInput.js";
import type { GuardEnforcementDecision } from "./GuardEnforcementDecision.js";
import { GuardRegistry } from "./GuardRegistry.js";
export class GuardEnforcementPolicy implements IPolicy<GuardEnforcementInput, GuardEnforcementDecision> {
  private readonly required: readonly string[];
  constructor(private readonly registry: GuardRegistry, requiredIds: readonly string[]) { this.required = Object.freeze([...requiredIds]); for (const id of requiredIds) registry.guard(id); }
  async apply(input: GuardEnforcementInput): Promise<GuardEnforcementDecision> {
    const { report, expectedTarget } = input; const reasons = new Set<string>(); const blocking = new Set<string>(); const warnings = new Set<string>(); let incomplete = false;
    if (input.stopReason !== null) { reasons.add("EXECUTION_STOPPED"); incomplete = true; }
    if (report.schemaVersion !== 1 || !this.sameTarget(report.target, expectedTarget)) { reasons.add("TARGET_MISMATCH"); incomplete = true; }
    if (report.selection.unresolvedGuardIds.length > 0 || report.pendingOperationRefs.length > 0 || report.selection.pendingOperationRefs.length > 0) { reasons.add("COVERAGE_OR_OPERATIONS_UNRESOLVED"); incomplete = true; }
    const selected = new Map(report.selection.guards.map(guard => [guard.id, guard]));
    if (selected.size !== report.selection.guards.length) { reasons.add("SELECTION_AMBIGUOUS"); incomplete = true; }
    for (const id of this.required) if (!selected.has(id)) { reasons.add("REQUIRED_GUARD_MISSING"); incomplete = true; }
    for (const selectedGuard of selected.values()) {
      const guard = this.registry.guard(selectedGuard.id);
      if (guard.version !== selectedGuard.version) { reasons.add("GUARD_VERSION_MISMATCH"); incomplete = true; continue; }
      for (const rule of guard.rules) {
        let failed = false, unknown = false;
        for (const checkId of rule.checkIds) {
          const check = this.registry.check(checkId);
          const matching = report.checks.filter(item => item.guardId === guard.id && item.checkId === checkId);
          const record = matching[0];
          const finding = record?.result?.findings.filter(item => item.ruleId === rule.id);
          if (matching.length !== 1 || record.status !== "completed" || record.guardVersion !== guard.version || record.checkVersion !== check.version || record.revisionRef !== expectedTarget.revisionRef || record.result?.revisionRef !== expectedTarget.revisionRef || finding?.length !== 1) { unknown = true; continue; }
          if (finding[0].verdict === "fail") failed = true;
          if (finding[0].verdict === "unknown" || finding[0].evidenceRefs.length === 0) unknown = true;
        }
        if (rule.blocking && failed) reasons.add("BLOCKING_RULE_FAILED");
        if (rule.blocking && (failed || unknown)) blocking.add(rule.id);
        if (!rule.blocking && (failed || unknown)) warnings.add(rule.id);
        if (rule.blocking && unknown) { incomplete = true; reasons.add("REQUIRED_CHECK_COVERAGE_MISSING"); }
      }
    }
    return Object.freeze({ action: incomplete ? "stop" : blocking.size > 0 ? "request-fix" : "accept", blockingRuleIds: Object.freeze([...blocking]), warningRuleIds: Object.freeze([...warnings]), reasonCodes: Object.freeze([...reasons]) });
  }
  private sameTarget(a: GuardEnforcementInput["expectedTarget"], b: GuardEnforcementInput["expectedTarget"]): boolean {
    return a.workspaceId === b.workspaceId && a.revisionRef === b.revisionRef && a.artifactRefs.length === b.artifactRefs.length && new Set(a.artifactRefs).size === a.artifactRefs.length && a.artifactRefs.every(ref => b.artifactRefs.includes(ref));
  }
}
