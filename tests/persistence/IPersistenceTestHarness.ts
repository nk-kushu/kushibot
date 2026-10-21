import type { ExecutionScopeRef } from "../../src/contracts/runtime/ExecutionScopeRef.js";
import type { PersistenceServices } from "../../src/persistence/PersistenceServices.js";

export interface IPersistenceTestHarness {
  open(scope: ExecutionScopeRef): Promise<PersistenceServices>;
  close(): Promise<void>;
}
