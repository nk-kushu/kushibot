import type { IAgentRunStoreFactory } from "./IAgentRunStoreFactory.js";
import type { IAgentRunStores } from "./IAgentRunStores.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { UsageLedgerStatements } from "../usage/UsageLedgerStatements.js";
import type { WorkflowRunStatements } from "../workflows/WorkflowRunStatements.js";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { SqlUsageLedgerStore } from "../usage/SqlUsageLedgerStore.js";
import { UsageLedgerSnapshotContract } from "../usage/UsageLedgerSnapshotContract.js";
import { SqlWorkflowRunStore } from "../workflows/SqlWorkflowRunStore.js";
import { WorkflowRunSnapshotContract } from "../workflows/WorkflowRunSnapshotContract.js";
import { WorkflowDefinitionContract } from "../workflows/WorkflowDefinitionContract.js";
import { StepInputPolicyInputContract } from "../workflows/StepInputPolicyInputContract.js";
import { StepAttemptReceiptContract } from "../workflows/StepAttemptReceiptContract.js";
import { StepResultAcceptanceContract } from "../workflows/StepResultAcceptanceContract.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { InMemoryAgentSessionJournal } from "./memory/InMemoryAgentSessionJournal.js";

export type SqlAgentStoreOptions = Readonly<{
  database: ISqlDatabase;
  workflow: WorkflowRunStatements;
  usage: UsageLedgerStatements;
}>;

/**
 * Workflow and usage state that outlives the process, so `Agent.resume` can reopen a run.
 * The session journal stays in memory: a session never continues across processes, because a
 * run only waits between sessions.
 */
export class SqlAgentStoreFactory implements IAgentRunStoreFactory {
  constructor(private readonly options: SqlAgentStoreOptions) {}

  async create(run: Readonly<{ runId: string; scope: ExecutionScopeRef }>): Promise<IAgentRunStores> {
    const { database, workflow, usage } = this.options;
    const json = new JsonValueContract();
    const outcomes = new ExecutionOutcomeContract(json, json);
    const receipts = new StepAttemptReceiptContract(
      json,
      outcomes,
      new StepResultAcceptanceContract(json),
    );
    const journal = new InMemoryAgentSessionJournal();
    return {
      workflow: new SqlWorkflowRunStore(
        database,
        workflow,
        new JsonRecordCodec(
          new WorkflowRunSnapshotContract(
            json,
            new WorkflowDefinitionContract(json),
            new StepInputPolicyInputContract(json),
            receipts,
            outcomes,
          ),
          json,
          // The limit the snapshot contract itself enforces; keep step results compact.
          2_097_152,
        ),
        run.scope.scopeId,
        run.scope.projectId,
        run.runId,
      ),
      usage: new SqlUsageLedgerStore(
        database,
        usage,
        run.scope,
        run.runId,
        new JsonRecordCodec(new UsageLedgerSnapshotContract(json), json, 2_097_152),
      ),
      journal,
      readJournal: async () => journal.snapshot(),
    };
  }
}
