import type { IWorkflowRunStore } from "../IWorkflowRunStore.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { RunAbortRegistry } from "./RunAbortRegistry.js";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue.js";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError.js";
export class WorkflowCancellationService{
 constructor(private readonly store:IWorkflowRunStore,private readonly aborts:RunAbortRegistry){}
 async request(context:IExecutionContext):Promise<Readonly<{status:"requested"|"already-terminal";runId:string;pendingOperationRefs:readonly string[]}>>{const snapshot=await this.store.read();if(context.identity.runId!==snapshot.runId||same(context.scope)!==same(snapshot.scope))throw new ExecutionRecoveryError();if(snapshot.outcome!==null)return {status:"already-terminal",runId:snapshot.runId,pendingOperationRefs:[]};await this.store.mutate(run=>run.requestDurableCancellation());this.aborts.abort(snapshot.runId);const saved=await this.store.read();return {status:"requested",runId:saved.runId,pendingOperationRefs:saved.lifecycle.pendingOperationRefs};}
}
