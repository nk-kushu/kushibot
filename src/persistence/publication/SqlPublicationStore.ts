import type { IPublicationStore } from "../../publication/IPublicationStore.js";
import type { ChangeProposal } from "../../publication/ChangeProposal.js";
import type { PublicationRecord } from "../../publication/PublicationRecord.js";
import type { PublicationCommand } from "../../publication/PublicationCommand.js";
import type { PublicationEffectOutcome } from "../../publication/PublicationEffectOutcome.js";
import type { PublicationStatements } from "./PublicationStatements.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../sql/ISqlExecutor.js";
import { canonicalWorkflowValue as same } from "../../workflows/canonicalWorkflowValue.js";
import { PublicationError } from "../../errors/PublicationError.js";
export class SqlPublicationStore implements IPublicationStore{
 readonly scope:ExecutionScopeRef;private readonly key:readonly string[];
 constructor(private readonly db:ISqlDatabase,private readonly sql:PublicationStatements,private readonly codec:IRecordCodec<PublicationRecord>,scope:ExecutionScopeRef){if(![scope.scopeId,scope.projectId,...(scope.workspaceId===undefined?[]:[scope.workspaceId])].every(v=>this.id(v)))throw new PublicationError();this.scope=Object.freeze({...scope});this.key=Object.freeze([scope.scopeId,scope.projectId,scope.workspaceId??""]);}
 async initialize():Promise<void>{await this.db.migrationTransaction(async tx=>{await tx.query(this.sql.schema,[]);});}
 async create(proposal:ChangeProposal):Promise<PublicationRecord>{const payload=await this.codec.encode({schemaVersion:1,revision:0,proposal,command:null,effect:null}),checked=await this.codec.decode(payload);this.bind(checked);return this.db.transaction(async tx=>{await tx.query(this.sql.insert,[...this.key,checked.proposal.id,payload]);const saved=await this.load(tx,checked.proposal.id);if(saved===null||same(saved.proposal)!==same(checked.proposal))throw new PublicationError();return saved;});}
 get(id:string):Promise<PublicationRecord|null>{return this.load(this.db,id);}
 claim(id:string,command:PublicationCommand):Promise<Readonly<{claimed:boolean;record:PublicationRecord}>>{return this.change(id,record=>record.command!==null?{record,result:false}:{record:{...record,revision:1,command},result:true}).then(value=>({claimed:value.result,record:value.record}));}
 async finish(id:string,operationId:string,effect:Exclude<PublicationEffectOutcome,Readonly<{status:"unknown"}>>):Promise<PublicationRecord>{const changed=await this.change(id,record=>{if(record.command?.operationId!==operationId)throw new PublicationError();if(record.effect!==null){if(same(record.effect)!==same(effect))throw new PublicationError();return {record,result:false};}return {record:{...record,revision:2,effect},result:true};});return changed.record;}
 private async change(id:string,change:(record:PublicationRecord)=>Readonly<{record:PublicationRecord;result:boolean}>):Promise<Readonly<{record:PublicationRecord;result:boolean}>>{if(!this.id(id))throw new PublicationError();return this.db.transaction(async tx=>{if((await tx.query(this.sql.lock,[...this.key,id])).affectedRows!==1)throw new PublicationError();const old=await this.load(tx,id);if(old===null)throw new PublicationError();const value=change(old),payload=await this.codec.encode(value.record),record=await this.codec.decode(payload);this.bind(record);if(same(record.proposal)!==same(old.proposal))throw new PublicationError();if((await tx.query(this.sql.update,[record.command?.operationId??null,payload,...this.key,id])).affectedRows!==1)throw new PublicationError();return {record,result:value.result};});}
 private async load(tx:ISqlExecutor,id:string):Promise<PublicationRecord|null>{if(!this.id(id))throw new PublicationError();const rows=(await tx.query(this.sql.read,[...this.key,id])).rows;if(rows.length===0)return null;if(rows.length!==1||typeof rows[0].payload!=="string")throw new PublicationError();const record=await this.codec.decode(rows[0].payload);this.bind(record);if(record.proposal.id!==id||rows[0].proposal_id!==id||rows[0].operation_id!==(record.command?.operationId??null))throw new PublicationError();return record;}
 private bind(record:PublicationRecord):void{if(same(record.proposal.scope)!==same(this.scope))throw new PublicationError();}
 private id(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
}
