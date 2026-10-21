import type { SubAgentClaim } from "./SubAgentClaim.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
export type SubAgentRecord = Readonly<{ claim: SubAgentClaim; outcome: ExecutionOutcome<JsonValue> | null }>;
