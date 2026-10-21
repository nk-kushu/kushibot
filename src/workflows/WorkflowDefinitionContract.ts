import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { WorkflowDefinition } from "./WorkflowDefinition.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class WorkflowDefinitionContract implements IResultContract<WorkflowDefinition> {
  readonly id = "workflow-definition"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<WorkflowDefinition>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 131072) return this.invalid();
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
         !this.keys(row,["id","version","steps","transitions","maxTotalAttempts"]) ||
         !this.validId(row.id) ||
         !this.validId(row.version) ||
         !Array.isArray(row.steps) ||
         row.steps.length < 1 ||
         row.steps.length > 64 ||
         !Array.isArray(row.transitions) ||
         row.transitions.length > 32 ||
         !Number.isSafeInteger(row.maxTotalAttempts) ||
         (row.maxTotalAttempts as number) < row.steps.length ||
         (row.maxTotalAttempts as number) > 128) return this.invalid();
    for (const step of row.steps) if (!this.object(step) ||
         !this.keys(step,["id","dependencies","executor","inputPolicy","acceptancePolicy","maxAttempts"]) ||
         !this.validId(step.id) ||
         !Array.isArray(step.dependencies) ||
         step.dependencies.length > 16 ||
         !step.dependencies.every(id => this.validId(id)) ||
         new Set(step.dependencies).size !== step.dependencies.length ||
         !this.metadata(step.executor) ||
         !this.reference(step.inputPolicy) ||
         !this.reference(step.acceptancePolicy) ||
         !Number.isSafeInteger(step.maxAttempts) ||
         (step.maxAttempts as number) < 1 ||
         (step.maxAttempts as number) > 8) return this.invalid();
    const definition = checked.value as unknown as WorkflowDefinition;
    const ids = new Set(definition.steps.map(step => step.id));
    if (ids.size !== definition.steps.length || definition.steps.some(step => step.dependencies.some(id => !ids.has(id) || id === step.id))) return this.invalid();
    const visited = new Set<string>();
    while (visited.size < ids.size) { const ready = definition.steps.filter(step => !visited.has(step.id) && step.dependencies.every(id => visited.has(id))); if (ready.length === 0) return this.invalid(); for (const step of ready) visited.add(step.id); }
    const transitionIds = new Set<string>();
    for (const transition of row.transitions) {
      if (!this.object(transition) ||
         !this.keys(transition,["id","fromStepId","toStepId","policy","maxTraversals"]) ||
         !this.validId(transition.id) ||
         transitionIds.has(transition.id as string) ||
         !ids.has(transition.fromStepId as string) ||
         !ids.has(transition.toStepId as string) ||
         !this.reference(transition.policy) ||
         !Number.isSafeInteger(transition.maxTraversals) ||
         (transition.maxTraversals as number) < 1 ||
         (transition.maxTraversals as number) > 8) return this.invalid();
      transitionIds.add(transition.id as string);
    }
    return { valid: true, value: definition };
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private reference(value: unknown): boolean { return this.object(value) && this.keys(value,["id","version"]) && this.validId(value.id) && this.validId(value.version); }
  private metadata(value: unknown): boolean { const keys = ["id","version","inputContractId","inputContractVersion","resultContractId","resultContractVersion"]; return this.object(value) && this.keys(value,keys) && keys.every(key => this.validId(value[key])); }
  private invalid(): ValidationResult<never> { return { valid:false,issues:[{path:[],code:"INVALID_WORKFLOW_DEFINITION",message:"Workflow definition is malformed or violates graph/limit rules."}] }; }
}
