import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { StepResultAcceptanceContract } from "./StepResultAcceptanceContract.js";
export class StepAttemptReceiptContract implements IResultContract<StepAttemptReceipt>{
  readonly id="step-attempt-receipt";readonly version="1";
  constructor(private readonly json:JsonValueContract,private readonly outcomes:ExecutionOutcomeContract<JsonValue>,private readonly acceptance:StepResultAcceptanceContract){}
  async validate(raw:unknown):Promise<ValidationResult<StepAttemptReceipt>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>131072)return this.invalid();const row=checked.value as unknown as Record<string,unknown>;
    if(!this.object(row)||
        !this.keys(row,["attemptId","stepRunId","runId","stepId","attemptNumber","workflow","executor","viewRef","receiptRef","outcome","acceptance"])||
        ![row.attemptId,row.stepRunId,row.runId,row.stepId].every(value=>this.validId(value))||
        !Number.isSafeInteger(row.attemptNumber)||
        (row.attemptNumber as number)<1||
        (row.attemptNumber as number)>8||
        !this.reference(row.workflow)||
        !this.metadata(row.executor)||
        !this.ref(row.viewRef)||
        !this.ref(row.receiptRef))return this.invalid();
    const outcome=await this.outcomes.validate(row.outcome),acceptance=await this.acceptance.validate(row.acceptance);if(!outcome.valid||
        !acceptance.valid||
        (outcome.value.status!=="completed"&&acceptance.value.status!=="not-evaluated"))return this.invalid();
    return {valid:true,value:Object.freeze({...checked.value as unknown as StepAttemptReceipt,outcome:outcome.value,acceptance:acceptance.value})};
  }
  private object(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  private keys(row:Record<string,unknown>,keys:readonly string[]):boolean{return Object.keys(row).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(row,key));}
  private validId(value:unknown):boolean{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
  private ref(value:unknown):boolean{return typeof value==="string"&&value.length>0&&value.length<=256;}
  private reference(value:unknown):boolean{return this.object(value)&&this.keys(value,["id","version"])&&this.validId(value.id)&&this.validId(value.version);}
  private metadata(value:unknown):boolean{const keys=["id","version","inputContractId","inputContractVersion","resultContractId","resultContractVersion"];return this.object(value)&&this.keys(value,keys)&&keys.every(key=>this.validId(value[key]));}
  private invalid():ValidationResult<never>{return {valid:false,issues:[{path:[],code:"INVALID_STEP_RECEIPT",message:"Step attempt receipt is invalid."}]};}
}
