import type { StepAttemptClaim } from "../../src/workflows/StepAttemptClaim.js";
import type { StepAttemptReceipt } from "../../src/workflows/StepAttemptReceipt.js";
import type { JsonValue } from "../../src/contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../../src/contracts/outcomes/ExecutionOutcome.js";
export type MemoryStepAttemptEntry={claim:StepAttemptClaim;attemptNumber:number;stage:"claimed"|"prepared"|"dispatching"|"outcome";input:JsonValue|null;outcome:ExecutionOutcome<JsonValue>|null;receipt:StepAttemptReceipt|null};
