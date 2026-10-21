import type { IAgentMemoryStore } from "../../memory/IAgentMemoryStore.js";
import type { MemoryProposal } from "../../memory/MemoryProposal.js";
import type { MemoryRecord } from "../../memory/MemoryRecord.js";
import type { KnowledgeValidationDecision } from "../../memory/KnowledgeValidationDecision.js";
import type { MemoryInvalidation } from "../../memory/MemoryInvalidation.js";
import type { MemoryStatements } from "./MemoryStatements.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../sql/ISqlExecutor.js";
import { canonicalWorkflowValue as canonical } from "../../workflows/canonicalWorkflowValue.js";
import { AgentMemoryError } from "../../errors/AgentMemoryError.js";
export class SqlAgentMemoryStore implements IAgentMemoryStore {
 readonly scope:ExecutionScopeRef;private readonly scopeKey:readonly string[];
 constructor(private readonly db:ISqlDatabase,private readonly sql:MemoryStatements,private readonly codec:IRecordCodec<MemoryRecord>,scope:ExecutionScopeRef){
  if(![scope.scopeId,scope.projectId,...(scope.workspaceId===undefined?[]:[scope.workspaceId])].every(value=>this.id(value)))throw new AgentMemoryError();
  this.scope=Object.freeze({...scope});this.scopeKey=Object.freeze([scope.scopeId,scope.projectId,scope.workspaceId??""]);
 }
 async initialize():Promise<void>{await this.db.migrationTransaction(async tx=>{await tx.query(this.sql.schema,[]);await tx.query(this.sql.index,[]);});}
 async propose(proposal:MemoryProposal):Promise<MemoryRecord>{const payload=await this.codec.encode({schemaVersion:1,revision:0,proposal,decision:null,invalidation:null}),value=await this.codec.decode(payload);this.bind(value);return this.db.transaction(async tx=>{await tx.query(this.sql.insert,[...this.scopeKey,proposal.id,proposal.topic,"pending",payload]);const saved=await this.load(tx,proposal.id);if(saved===null||canonical(saved.proposal)!==canonical(value.proposal))throw new AgentMemoryError();return saved;});}
 get(id:string):Promise<MemoryRecord|null>{return this.load(this.db,id);}
 decide(id:string,revision:number,decision:KnowledgeValidationDecision):Promise<MemoryRecord>{return this.change(id,record=>{if(record.decision!==null){if(canonical(record.decision)!==canonical(decision))throw new AgentMemoryError();return record;}if(record.revision!==revision||record.invalidation!==null)throw new AgentMemoryError();return {...record,revision:record.revision+1,decision};});}
 invalidate(id:string,revision:number,invalidation:MemoryInvalidation):Promise<MemoryRecord>{return this.change(id,record=>{if(record.invalidation!==null){if(canonical(record.invalidation)!==canonical(invalidation))throw new AgentMemoryError();return record;}if(record.revision!==revision||record.decision?.status!=="accepted")throw new AgentMemoryError();return {...record,revision:record.revision+1,invalidation};});}
 async listAccepted(topic:string,afterId:string|null,limit:number):Promise<readonly MemoryRecord[]>{if(!this.id(topic)||(afterId!==null&&!this.id(afterId))||!Number.isSafeInteger(limit)||limit<1||limit>32)throw new AgentMemoryError();const result=await this.db.query(this.sql.list,[...this.scopeKey,topic,afterId??"",limit]);if(result.rows.length>limit)throw new AgentMemoryError();const values:MemoryRecord[]=[];let last=afterId??"";for(const row of result.rows){const record=await this.row(row);if(record.proposal.topic!==topic||this.state(record)!=="accepted"||record.proposal.id<=last)throw new AgentMemoryError();last=record.proposal.id;values.push(record);}return Object.freeze(values);}
 private async change(id:string,change:(record:MemoryRecord)=>MemoryRecord):Promise<MemoryRecord>{if(!this.id(id))throw new AgentMemoryError();return this.db.transaction(async tx=>{if((await tx.query(this.sql.lock,[...this.scopeKey,id])).affectedRows!==1)throw new AgentMemoryError();const old=await this.load(tx,id);if(old===null)throw new AgentMemoryError();const next=change(old),payload=await this.codec.encode(next),checked=await this.codec.decode(payload);this.bind(checked);if(canonical(checked.proposal)!==canonical(old.proposal))throw new AgentMemoryError();if((await tx.query(this.sql.update,[this.state(checked),payload,...this.scopeKey,id])).affectedRows!==1)throw new AgentMemoryError();return checked;});}
 private async load(tx:ISqlExecutor,id:string):Promise<MemoryRecord|null>{if(!this.id(id))throw new AgentMemoryError();const rows=(await tx.query(this.sql.read,[...this.scopeKey,id])).rows;if(rows.length===0)return null;if(rows.length!==1)throw new AgentMemoryError();const record=await this.row(rows[0]);if(record.proposal.id!==id)throw new AgentMemoryError();return record;}
 private async row(row:Readonly<Record<string,unknown>>):Promise<MemoryRecord>{if(typeof row.payload!=="string")throw new AgentMemoryError();const record=await this.codec.decode(row.payload);this.bind(record);if(row.memory_id!==record.proposal.id||row.topic!==record.proposal.topic||row.state!==this.state(record))throw new AgentMemoryError();return record;}
 private bind(record:MemoryRecord):void{if(canonical(record.proposal.scope)!==canonical(this.scope))throw new AgentMemoryError();}
 private state(record:MemoryRecord):string{return record.invalidation!==null?"invalidated":record.decision?.status??"pending";}
 private id(value:unknown):value is string{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
}
