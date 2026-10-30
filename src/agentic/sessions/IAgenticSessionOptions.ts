import type { IAgentTurn } from "./IAgentTurn.js";
import type { IAgentToolCall } from "./IAgentToolCall.js";
import type { AgentActionParser } from "./AgentActionParser.js";
import type { ISessionJournal } from "./ISessionJournal.js";
import type { CompletionInput } from "./CompletionInput.js";
import type { CompletionDecision } from "./CompletionDecision.js";
import type { IPolicy } from "../../contracts/IPolicy.js";
import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore.js";
import type { IScopedDebugRecorder } from "../../events/debug/IScopedDebugRecorder.js";

export interface IAgenticSessionOptions<TResult> {
  readonly sessionId: string;
  readonly maxTurns: number;
  readonly model: IAgentTurn;
  readonly tools: IAgentToolCall;
  readonly parser: AgentActionParser;
  readonly result: IResultContract<TResult>;
  readonly acceptance: IPolicy<CompletionInput<TResult>, CompletionDecision>;
  readonly journal: ISessionJournal;
  readonly ledger: IUsageLedgerStore;
  readonly budgetScopeId: string;
  readonly ids: IIdGenerator;
  readonly clock: IClock;
  /** Traces each turn, the action the model chose and the acceptance decision; records nothing by default. */
  readonly debug?: IScopedDebugRecorder;
}
