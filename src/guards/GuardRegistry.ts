import type { GuardDefinition } from "./GuardDefinition.js";
import type { IGuardCheck } from "./IGuardCheck.js";
import { GuardConfigurationError } from "../errors/GuardConfigurationError.js";
export class GuardRegistry {
  private readonly guards = new Map<string, GuardDefinition>();
  private readonly checks = new Map<string, IGuardCheck>();
  registerCheck(check: IGuardCheck): void {
    this.id(check.id); this.id(check.version);
    if (this.checks.has(check.id) || this.checks.size >= 32) throw new GuardConfigurationError();
    this.checks.set(check.id, check);
  }
  registerGuard(guard: GuardDefinition): void {
    this.id(guard.id); this.id(guard.version); this.text(guard.description, 512); this.text(guard.instructions, 8192);
    if (this.guards.has(guard.id) || this.guards.size >= 16 || !Array.isArray(guard.rules) || guard.rules.length < 1 || guard.rules.length > 16 || new Set(guard.rules.map(rule => rule.id)).size !== guard.rules.length) throw new GuardConfigurationError();
    const rules = guard.rules.map(rule => {
      this.id(rule.id); this.text(rule.requirement, 1024);
      if (!rule.id.startsWith(guard.id + ".") || typeof rule.blocking !== "boolean" || !Array.isArray(rule.checkIds) || rule.checkIds.length < 1 || rule.checkIds.length > 8 || new Set(rule.checkIds).size !== rule.checkIds.length) throw new GuardConfigurationError();
      for (const id of rule.checkIds) this.check(id);
      return Object.freeze({ id: rule.id, requirement: rule.requirement, blocking: rule.blocking, checkIds: Object.freeze([...rule.checkIds]) });
    });
    if (new Set(rules.flatMap(rule => [...rule.checkIds])).size > 8) throw new GuardConfigurationError();
    this.guards.set(guard.id, Object.freeze({ id: guard.id, version: guard.version, description: guard.description, instructions: guard.instructions, rules: Object.freeze(rules) }));
  }
  guard(id: string): GuardDefinition { const value = this.guards.get(id); if (value === undefined) throw new GuardConfigurationError(); return value; }
  check(id: string): IGuardCheck { const value = this.checks.get(id); if (value === undefined) throw new GuardConfigurationError(); return value; }
  private id(value: unknown): void { if (typeof value !== "string" || !/^[a-zA-Z0-9_.-]{1,64}$/.test(value)) throw new GuardConfigurationError(); }
  private text(value: unknown, max: number): void { if (typeof value !== "string" || value.trim().length === 0 || new TextEncoder().encode(value).byteLength > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new GuardConfigurationError(); }
}
