import type { IAgentMemoryStore } from "./IAgentMemoryStore.js";
import type { ContextFragment } from "../agentic/context/ContextFragment.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import { MemoryEvidenceVerifier } from "./MemoryEvidenceVerifier.js";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue.js";
import { AgentMemoryError } from "../errors/AgentMemoryError.js";
export class MemoryContextFragmentVerifier {
 constructor(private readonly store:IAgentMemoryStore,private readonly evidence:MemoryEvidenceVerifier){}
 async verify(fragment:ContextFragment,context:IExecutionContext):Promise<boolean>{
  if(canonical(context.scope)!==canonical(this.store.scope))throw new AgentMemoryError();if(fragment.kind!=="memory"||!fragment.sourceRef.startsWith("memory:"))return false;const id=fragment.sourceRef.slice(7);if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(id))return false;const record=await this.store.get(id);if(record===null)return false;const item=await this.evidence.verify(record,context);return item!==null&&canonical(item.fragment)===canonical(fragment);
 }
}
