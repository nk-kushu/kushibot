import type { StepRunSnapshot } from "./StepRunSnapshot.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import { ExecutionLifecycle } from "../domain/lifecycle/ExecutionLifecycle.js";
import { stepRunLifecycle } from "../domain/lifecycle/stepRunLifecycle.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";
export class StepRun{
  private constructor(private state:StepRunSnapshot,private readonly lifecycle:ExecutionLifecycle){}
  static create(stepId:string,stepRunId:string):StepRun{const lifecycle=ExecutionLifecycle.create(stepRunLifecycle,stepRunId);return new StepRun(Object.freeze({stepId,stepRunId,invalidated:false,attemptId:null,lifecycle:lifecycle.snapshot()}),lifecycle);}
  static async restore(state:StepRunSnapshot):Promise<StepRun>{const lifecycle=await ExecutionLifecycle.restore(stepRunLifecycle,state.lifecycle);if(state.stepRunId!==state.lifecycle.executionId)throw new WorkflowRunError();return new StepRun(state,lifecycle);}
  snapshot():StepRunSnapshot{return Object.freeze({...this.state,lifecycle:this.lifecycle.snapshot()});}
  start(attemptId:string):void{if(this.state.invalidated||
        this.state.attemptId!==null)throw new WorkflowRunError();this.lifecycle.transition("active");this.state=Object.freeze({...this.state,attemptId});}
  pending(ref:string):void{this.lifecycle.recordPendingOperation(ref);}
  reconciled(ref:string):void{this.lifecycle.recordReconciledOperation(ref);}
  retain(ref:string):void{this.lifecycle.retainPendingOperation(ref);}
  requestCancellation():void{if(!["completed","failed","stopped","cancelled"].includes(this.lifecycle.snapshot().status)&&!this.lifecycle.snapshot().cancellationRequested)this.lifecycle.requestCancellation();}
  enterRecovery():void{const status=this.lifecycle.snapshot().status;if(["created","completed","failed","stopped","cancelled"].includes(status))return;if(status==="active")this.lifecycle.transition("interrupted");if(this.lifecycle.snapshot().status!=="recovering")this.lifecycle.transition("recovering");}
  readyAfterRecovery(receipt:StepAttemptReceipt|null,stop=false):void{if(["created","completed","failed","stopped","cancelled"].includes(this.lifecycle.snapshot().status))return;if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();if(receipt!==null){this.close(receipt);return;}if(stop){if(this.lifecycle.snapshot().cancellationRequested){this.lifecycle.transition("stopping");this.lifecycle.transition("cancelled");}else this.lifecycle.transition("stopped");return;}if(this.lifecycle.snapshot().cancellationRequested)throw new WorkflowRunError();this.lifecycle.transition("active");}
  close(receipt:StepAttemptReceipt):void{
    if(receipt.attemptId!==this.state.attemptId)throw new WorkflowRunError();
    if(this.lifecycle.snapshot().pendingOperationRefs.length>0){if(this.lifecycle.snapshot().status==="active")this.lifecycle.transition("interrupted");return;}
    if(this.lifecycle.snapshot().cancellationRequested){if(this.lifecycle.snapshot().status!=="stopping")this.lifecycle.transition("stopping");this.lifecycle.transition("cancelled");return;}
    if(this.lifecycle.snapshot().status==="recovering")this.lifecycle.transition("active");
    if(receipt.acceptance.status==="accepted"){this.lifecycle.transition("completed",{acceptedResultRef:receipt.receiptRef});return;}
    if(receipt.outcome.status==="failed"){this.lifecycle.transition("failed");return;}
    if(receipt.outcome.status==="stopped"&&receipt.outcome.reason.code==="cancelled"){this.lifecycle.requestCancellation();this.lifecycle.transition("cancelled");return;}
    this.lifecycle.transition("stopped");
  }
  invalidate():void{if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();this.state=Object.freeze({...this.state,invalidated:true});}
}
