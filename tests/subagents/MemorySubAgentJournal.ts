import type { ISubAgentJournal } from "../../src/agentic/subagents/ISubAgentJournal.js";
import type { SubAgentClaim } from "../../src/agentic/subagents/SubAgentClaim.js";
import type { SubAgentClaimOutcome } from "../../src/agentic/subagents/SubAgentClaimOutcome.js";
import type { SubAgentRunSnapshot } from "../../src/agentic/subagents/SubAgentRunSnapshot.js";
import type { ExecutionOutcome } from "../../src/contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../../src/contracts/persistence/JsonValue.js";
import { SubAgentState } from "../../src/agentic/subagents/SubAgentState.js";
export class MemorySubAgentJournal implements ISubAgentJournal {
  private readonly state: SubAgentState;
  constructor(initial: SubAgentRunSnapshot) { this.state = new SubAgentState(initial); }
  async claim(input: SubAgentClaim): Promise<SubAgentClaimOutcome> { return this.state.claim(input); }
  async complete(childId: string, outcome: ExecutionOutcome<JsonValue>): Promise<void> { this.state.complete(childId,outcome); }
  async read(): Promise<SubAgentRunSnapshot> { return this.state.snapshot(); }
  snapshot(): SubAgentRunSnapshot { return this.state.snapshot(); }
}
