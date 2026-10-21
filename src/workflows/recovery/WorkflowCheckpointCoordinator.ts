import type { IWorkflowRunStore } from "../IWorkflowRunStore.js";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore.js";
import type { IRecoveryBarrier } from "./IRecoveryBarrier.js";
import type { ICheckpointParticipant } from "./ICheckpointParticipant.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { ArtifactRef } from "../../artifacts/ArtifactRef.js";
import { ExecutionCheckpointStore } from "./ExecutionCheckpointStore.js";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue.js";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError.js";
export class WorkflowCheckpointCoordinator{
 constructor(private readonly runs:IWorkflowRunStore,private readonly usage:IUsageLedgerStore,private readonly barrier:IRecoveryBarrier,private readonly artifacts:ExecutionCheckpointStore,private readonly participants:readonly ICheckpointParticipant[],private readonly ids:IIdGenerator){}
 async capture(context:IExecutionContext):Promise<ArtifactRef>{const observed=await this.runs.read();if(context.identity.runId!==observed.runId||same(context.scope)!==same(observed.scope))throw new ExecutionRecoveryError();const lease=await this.barrier.acquire(observed,context);if(lease===null)throw new ExecutionRecoveryError();try{if(lease.runId!==observed.runId||same(lease.scope)!==same(observed.scope)||lease.previousOwnerToken!==(observed.engineOwner?.ownerToken??null)||!await lease.assertHeld())throw new ExecutionRecoveryError();const owner=this.ids.nextId();if(observed.outcome===null)await this.runs.mutate(run=>run.fenceRecovery(observed.revision,lease.previousOwnerToken,owner,lease.proofRef));const run=await this.runs.read(),usage=await this.usage.read(),participants=[];for(const participant of this.participants)participants.push({registration:participant.registration,reference:await participant.capture(run,context)});if(!await lease.assertHeld()||same(run)!==same(await this.runs.read())||same(usage)!==same(await this.usage.read()))throw new ExecutionRecoveryError();const reference=await this.artifacts.save(run,usage,this.ids.nextId(),lease.proofRef,participants,context.signal);if(!await lease.assertHeld())throw new ExecutionRecoveryError();if(run.outcome===null)await this.runs.mutate(value=>value.recoveryCheckpoint(owner,run.revision,"artifact:"+reference.artifactId));return reference;}finally{await lease.release();}}
}
