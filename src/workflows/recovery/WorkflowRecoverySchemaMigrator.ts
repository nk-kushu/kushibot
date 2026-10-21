import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase.js";
import type { WorkflowRunStatements } from "../WorkflowRunStatements.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { IRecoveryLease } from "./IRecoveryLease.js";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError.js";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue.js";
export class WorkflowRecoverySchemaMigrator{
 constructor(private readonly database:ISqlDatabase,private readonly sql:WorkflowRunStatements,private readonly codec:IRecordCodec<WorkflowRunSnapshot>){}
 async migrate(lease:IRecoveryLease):Promise<void>{if(!await lease.assertHeld())throw new ExecutionRecoveryError();const key=[lease.scope.scopeId,lease.scope.projectId,lease.runId];await this.database.migrationTransaction(async tx=>{if((await tx.query(this.sql.lock,key)).affectedRows!==1)throw new ExecutionRecoveryError();const rows=(await tx.query(this.sql.read,key)).rows;if(rows.length!==1||typeof rows[0].payload!=="string")throw new ExecutionRecoveryError();const old=JSON.parse(rows[0].payload);if(old===null||typeof old!=="object")throw new ExecutionRecoveryError();let payload=rows[0].payload;if(old.schemaVersion===1){if(["reconciliations","recoveries","recoveryFence"].some(key=>key in old))throw new ExecutionRecoveryError();payload=await this.codec.encode({...old,schemaVersion:2,reconciliations:[],recoveries:[],recoveryFence:null});}const run=await this.codec.decode(payload);if(run.runId!==lease.runId||same(run.scope)!==same(lease.scope)||(run.engineOwner?.ownerToken??null)!==lease.previousOwnerToken)throw new ExecutionRecoveryError();if((await tx.query(this.sql.update,[payload,...key])).affectedRows!==1)throw new ExecutionRecoveryError();});}
}
