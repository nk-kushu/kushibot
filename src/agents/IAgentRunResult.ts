import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { UsageLedgerSnapshot } from "../usage/UsageLedgerSnapshot.js";
import type { WorkflowRunSnapshot } from "../workflows/WorkflowRunSnapshot.js";
import type { WorkflowEngineOutcome } from "../workflows/WorkflowEngineOutcome.js";

export interface IAgentRunResult<TResult> {
  readonly runId: string;
  readonly result: TResult | null;
  readonly outcome: WorkflowEngineOutcome;
  readonly snapshot: WorkflowRunSnapshot;
  readonly usage: UsageLedgerSnapshot;
  readonly journal: readonly unknown[];
  readonly artifacts: Readonly<Record<string, JsonValue>>;
}
