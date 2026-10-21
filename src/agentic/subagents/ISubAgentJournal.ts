import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot.js";
import type { SubAgentClaim } from "./SubAgentClaim.js";
import type { SubAgentClaimOutcome } from "./SubAgentClaimOutcome.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
export interface ISubAgentJournal {
  read(): Promise<SubAgentRunSnapshot>;
  claim(input: SubAgentClaim): Promise<SubAgentClaimOutcome>;
  complete(childId: string, outcome: ExecutionOutcome<JsonValue>): Promise<void>;
}
