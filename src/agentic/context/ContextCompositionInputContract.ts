import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { ContextCompositionInput } from "./ContextCompositionInput.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
export class ContextCompositionInputContract implements IResultContract<ContextCompositionInput> {
  readonly id = "context-composition-input"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(input: unknown): Promise<ValidationResult<ContextCompositionInput>> {
    const checked = await this.json.validate(input); if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (!this.record(value) || !this.keys(value, ["snapshotRef", "scope", "instructions", "guidance", "requiredRules", "assignment", "requiredFragments", "optionalFragments"]) || !this.idValue(value.snapshotRef) ||
        !this.record(value.scope) || !this.idValue(value.scope.scopeId) || !this.idValue(value.scope.projectId) || Object.keys(value.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
        (value.scope.workspaceId !== undefined && !this.idValue(value.scope.workspaceId)) || !this.record(value.instructions) || !this.keys(value.instructions, ["revision", "text"]) || !this.idValue(value.instructions.revision) || !this.text(value.instructions.text, 16384, false) ||
        !this.record(value.assignment) || !this.keys(value.assignment, ["goal", "acceptanceCriteria", "unresolved", "pendingOperationRefs"]) || !this.text(value.assignment.goal, 4096, false) ||
        !this.strings(value.assignment.acceptanceCriteria, 32, 1024) || !this.strings(value.assignment.unresolved, 32, 1024) || !this.strings(value.assignment.pendingOperationRefs, 32, 256) ||
        !Array.isArray(value.requiredRules) || value.requiredRules.length > 256 || value.requiredRules.some(item => !this.record(item) || !this.keys(item, ["guardId", "guardVersion", "ruleId", "requirement"]) || !this.idValue(item.guardId) || !this.idValue(item.guardVersion) || !this.idValue(item.ruleId) || !this.text(item.requirement, 1024, false)) ||
        !Array.isArray(value.guidance) || value.guidance.length > 16 || value.guidance.some(item => !this.guidance(item)) ||
        !Array.isArray(value.requiredFragments) || value.requiredFragments.length > 16 || !Array.isArray(value.optionalFragments) || value.optionalFragments.length > 32 ||
        [...value.requiredFragments, ...value.optionalFragments].some(item => !this.fragment(item)) || new TextEncoder().encode(JSON.stringify(value)).byteLength > 262144) return this.invalid();
    const fragments = [...value.requiredFragments, ...value.optionalFragments] as Readonly<{ id: string }>[];
    if (new Set(fragments.map(item => item.id)).size !== fragments.length || new Set(value.guidance.map(item => (item as { guardId: string }).guardId)).size !== value.guidance.length) return this.invalid();
    const structured = value as unknown as ContextCompositionInput;
    const rules = new Map(structured.requiredRules.map(rule => [JSON.stringify([rule.guardId, rule.ruleId]), rule]));
    if (rules.size !== structured.requiredRules.length || structured.requiredRules.some(rule => !structured.guidance.some(guide => guide.guardId === rule.guardId && guide.guardVersion === rule.guardVersion && guide.ruleIds.includes(rule.ruleId))) ||
        structured.guidance.some(guide => guide.ruleIds.some(ruleId => !rules.has(JSON.stringify([guide.guardId, ruleId]))))) return this.invalid();
    return { valid: true, value: structured };
  }
  private fragment(value: unknown): boolean {
    return this.record(value) && this.keys(value, ["id", "kind", "revisionRef", "sourceRef", "text", "priority"]) && this.idValue(value.id) && this.idValue(value.revisionRef) && this.idValue(value.sourceRef) &&
      ["source", "observation", "memory", "summary", "handoff"].includes(String(value.kind)) && this.text(value.text, 8192, true) && typeof value.priority === "number" && Number.isSafeInteger(value.priority) && value.priority >= 0 && value.priority <= 100;
  }
  private guidance(value: unknown): boolean { return this.record(value) && this.keys(value, ["guardId", "guardVersion", "instructions", "ruleIds"]) && this.idValue(value.guardId) && this.idValue(value.guardVersion) && this.text(value.instructions, 8192, false) && this.strings(value.ruleIds, 16, 128); }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private keys(value: Record<string, unknown>, expected: readonly string[]): boolean { return Object.keys(value).length === expected.length && expected.every(key => Object.hasOwnProperty.call(value, key)); }
  private idValue(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9_.:/-]{1,256}$/.test(value); }
  private strings(value: unknown, maxItems: number, maxBytes: number): boolean { return Array.isArray(value) && value.length <= maxItems && value.every(item => this.text(item, maxBytes, false)) && new Set(value).size === value.length; }
  private text(value: unknown, max: number, allowEmpty: boolean): value is string { return typeof value === "string" && (allowEmpty || value.trim().length > 0) && new TextEncoder().encode(value).byteLength <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) && !/[\uD800-\uDFFF]/u.test(value); }
  private invalid(): ValidationResult<ContextCompositionInput> { return { valid: false, issues: [{ path: [], code: "invalid-context-input", message: "Context snapshot violates the bounded schema." }] }; }
}
