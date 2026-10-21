import type { GuardSelection } from "./GuardSelection.js";
import type { SkillGuidance } from "./SkillGuidance.js";
import { GuardRegistry } from "./GuardRegistry.js";
import { GuardConfigurationError } from "../errors/GuardConfigurationError.js";
export class GuardGuidanceComposer {
  private readonly conflicts: readonly (readonly [string, string])[];
  constructor(private readonly registry: GuardRegistry, conflicts: readonly (readonly [string, string])[]) {
    if (conflicts.length > 64) throw new GuardConfigurationError();
    this.conflicts = Object.freeze(conflicts.map(pair => { registry.guard(pair[0]); registry.guard(pair[1]); return Object.freeze([pair[0], pair[1]] as const); }));
  }
  compose(selection: GuardSelection): readonly SkillGuidance[] {
    if (selection.unresolvedGuardIds.length > 0 || selection.pendingOperationRefs.length > 0) throw new GuardConfigurationError();
    const active = new Set(selection.guards.map(guard => guard.id));
    if (this.conflicts.some(pair => active.has(pair[0]) && active.has(pair[1]))) throw new GuardConfigurationError();
    return Object.freeze([...selection.guards].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(selected => {
      const guard = this.registry.guard(selected.id); if (guard.version !== selected.version) throw new GuardConfigurationError();
      return Object.freeze({ guardId: guard.id, guardVersion: guard.version, instructions: guard.instructions, ruleIds: Object.freeze(guard.rules.map(rule => rule.id)) });
    }));
  }
}
