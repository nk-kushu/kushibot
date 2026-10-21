import type { IWorkflowRunStore } from "./IWorkflowRunStore.js";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { WorkflowRunStatements } from "./WorkflowRunStatements.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor.js";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec.js";
import { WorkflowRun } from "./WorkflowRun.js";
import { canonicalWorkflowValue } from "./canonicalWorkflowValue.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";
export class SqlWorkflowRunStore implements IWorkflowRunStore{
  private readonly key:readonly string[];private binding:string|null=null;
  constructor(private readonly database:ISqlDatabase,
    private readonly sql:WorkflowRunStatements,
    private readonly codec:IRecordCodec<WorkflowRunSnapshot>,scopeId:string,projectId:string,runId:string){if(![scopeId,projectId,runId].every(id=>/^[A-Za-z0-9_.:-]{1,128}$/.test(id)))throw new WorkflowRunError();this.key=Object.freeze([scopeId,projectId,runId]);}
  async initialize(initial:WorkflowRunSnapshot):Promise<void>{if(initial.attempts.length!==0||
        initial.steps.length!==0||
        initial.engineOwner!==null||
        initial.outcome!==null||
        initial.lifecycle.status!=="created")throw new WorkflowRunError();const payload=await this.codec.encode(initial),binding=this.bind(initial);await this.database.migrationTransaction(async tx=>{await tx.query(this.sql.schema,[]);await tx.query(this.sql.insert,[...this.key,payload]);if(this.bind(await this.load(tx))!==binding)throw new WorkflowRunError();});this.binding=binding;}
  async read():Promise<WorkflowRunSnapshot>{if(this.binding===null)throw new WorkflowRunError();const snapshot=await this.load(this.database);if(this.bind(snapshot)!==this.binding)throw new WorkflowRunError();return snapshot;}
  mutate<T>(change:(run:WorkflowRun)=>T):Promise<T>{if(this.binding===null)throw new WorkflowRunError();return this.database.transaction(async tx=>{if((await tx.query(this.sql.lock,this.key)).affectedRows!==1)throw new WorkflowRunError();const snapshot=await this.load(tx);if(this.bind(snapshot)!==this.binding)throw new WorkflowRunError();const run=await WorkflowRun.restore(snapshot),result=change(run);if(result!==null&&(typeof result==="object"||
        typeof result==="function")&&"then" in result)throw new WorkflowRunError();const payload=await this.codec.encode(run.snapshot());if((await tx.query(this.sql.update,[payload,...this.key])).affectedRows!==1)throw new WorkflowRunError();return result;});}
  private async load(tx:ISqlExecutor):Promise<WorkflowRunSnapshot>{const rows=(await tx.query(this.sql.read,this.key)).rows;if(rows.length!==1||
        typeof rows[0].payload!=="string")throw new WorkflowRunError();const snapshot=await this.codec.decode(rows[0].payload);if(snapshot.scope.scopeId!==this.key[0]||
        snapshot.scope.projectId!==this.key[1]||
        snapshot.runId!==this.key[2])throw new WorkflowRunError();return snapshot;}
  private bind(snapshot:WorkflowRunSnapshot):string{return canonicalWorkflowValue({schemaVersion:snapshot.schemaVersion,runId:snapshot.runId,scope:snapshot.scope,definition:snapshot.definition,request:snapshot.request,completionPolicy:snapshot.completionPolicy,budgetScopeId:snapshot.budgetScopeId,deadlineEpochMs:snapshot.deadlineEpochMs});}
}
