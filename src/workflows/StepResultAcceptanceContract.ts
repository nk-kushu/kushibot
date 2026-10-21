import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { StepResultAcceptance } from "./StepResultAcceptance.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class StepResultAcceptanceContract implements IResultContract<StepResultAcceptance>{
  readonly id="step-result-acceptance";readonly version="1";
  constructor(private readonly json:JsonValueContract){}
  async validate(raw:unknown):Promise<ValidationResult<StepResultAcceptance>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;const row=checked.value as unknown as Record<string,unknown>;
    if(row!==null&&typeof row==="object"&&!Array.isArray(row)){
      if(row.status==="accepted"&&Object.keys(row).length===1)return {valid:true,value:checked.value as unknown as StepResultAcceptance};
      if((row.status==="rejected"||
        row.status==="not-evaluated")&&Object.keys(row).length===3&&typeof row.code==="string"&&/^[A-Z0-9_:-]{1,128}$/.test(row.code)&&typeof row.message==="string"&&row.message.length>0&&row.message.length<=1024)return {valid:true,value:checked.value as unknown as StepResultAcceptance};
    }
    return {valid:false,issues:[{path:[],code:"INVALID_STEP_ACCEPTANCE",message:"Step acceptance decision is invalid."}]};
  }
}
