import type { IPublicationStore } from "./IPublicationStore.js";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { PublicationRecord } from "./PublicationRecord.js";
import { ChangeProposalContract } from "./ChangeProposalContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue.js";
import { PublicationError } from "../errors/PublicationError.js";
export class ChangeProposalService{
 constructor(private readonly store:IPublicationStore,private readonly json:JsonValueContract,private readonly digest:IArtifactDigest,private readonly proposals:ChangeProposalContract,private readonly clock:IClock){}
 async create(body:unknown,context:IExecutionContext):Promise<PublicationRecord>{if(same(context.scope)!==same(this.store.scope))throw new PublicationError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);if(guard.check()!==null)throw new PublicationError();const checked=await this.json.validate(body);if(!checked.valid||checked.value===null||typeof checked.value!=="object"||Array.isArray(checked.value)||"digest" in checked.value)throw new PublicationError();const hash=await this.digest.hash(new TextEncoder().encode(JSON.stringify(checked.value))),proposal=await this.proposals.validate({...checked.value,digest:hash});if(!proposal.valid||same(proposal.value.scope)!==same(this.store.scope)||guard.check()!==null)throw new PublicationError();return this.store.create(proposal.value);}
}
