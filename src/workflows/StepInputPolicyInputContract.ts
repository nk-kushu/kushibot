import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class StepInputPolicyInputContract implements IResultContract<StepInputPolicyInput> {
  readonly id = "step-input-policy-view"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<StepInputPolicyInput>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 262144) return this.invalid();
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
         !this.keys(row,["workflow","stepId","viewRef","request","dependencies"]) ||
         !this.object(row.workflow) ||
         !this.keys(row.workflow,["id","version"]) ||
         !this.validId(row.workflow.id) ||
         !this.validId(row.workflow.version) ||
         !this.validId(row.stepId) ||
         !this.ref(row.viewRef) ||
         !Array.isArray(row.dependencies) ||
         row.dependencies.length > 16) return this.invalid();
    const ids = new Set<string>();
    for (const dependency of row.dependencies) { if (!this.object(dependency) ||
         !this.keys(dependency,["stepId","attemptId","receiptRef","result"]) ||
         !this.validId(dependency.stepId) ||
         ids.has(dependency.stepId as string) ||
         !this.validId(dependency.attemptId) ||
         !this.ref(dependency.receiptRef) ||
         new TextEncoder().encode(JSON.stringify(dependency.result)).byteLength > 65536) return this.invalid(); ids.add(dependency.stepId as string); }
    return {valid:true,value:checked.value as unknown as StepInputPolicyInput};
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private ref(value: unknown): boolean { return typeof value === "string" && value.length > 0 && value.length <= 256; }
  private invalid(): ValidationResult<never> { return {valid:false,issues:[{path:[],code:"INVALID_STEP_VIEW",message:"Step input view is invalid."}]}; }
}
