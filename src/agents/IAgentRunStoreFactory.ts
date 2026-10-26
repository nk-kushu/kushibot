import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { IAgentRunStores } from "./IAgentRunStores.js";

export interface IAgentRunStoreFactory {
  create(run: Readonly<{ runId: string; scope: ExecutionScopeRef }>): Promise<IAgentRunStores>;
}
