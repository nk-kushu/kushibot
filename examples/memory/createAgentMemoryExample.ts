import type { ISqlDatabase, MemoryStatements, ExecutionScopeRef, IKnowledgeSourceReader, IClock } from "../../src/index.js";
import { JsonValueContract, JsonRecordCodec, MemoryProposalContract, MemoryRecordContract, SqlAgentMemoryStore, ExactSourceKnowledgePolicy, MemoryKnowledgeService, MemoryEvidenceVerifier, MemoryRetrievalService, MemoryContextFragmentVerifier } from "../../src/index.js";
export async function createAgentMemoryExample(database:ISqlDatabase,sql:MemoryStatements,scope:ExecutionScopeRef,sources:IKnowledgeSourceReader,clock:IClock){
 const json=new JsonValueContract(),proposals=new MemoryProposalContract(json),records=new MemoryRecordContract(json,proposals);
 const codec=new JsonRecordCodec(records,json,16384),store=new SqlAgentMemoryStore(database,sql,codec,scope);await store.initialize();
 const knowledge=new MemoryKnowledgeService(store,sources,new ExactSourceKnowledgePolicy(),proposals,records,json,clock),evidence=new MemoryEvidenceVerifier(store,sources,json,clock);
 return Object.freeze({store,knowledge,retrieval:new MemoryRetrievalService(store,evidence,clock),contextVerifier:new MemoryContextFragmentVerifier(store,evidence)});
}
