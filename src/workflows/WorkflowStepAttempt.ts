import type { StepAttemptClaim } from "./StepAttemptClaim.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
export type WorkflowStepAttempt=Readonly<{claim:StepAttemptClaim;attemptNumber:number;stage:"claimed"|"prepared"|"dispatching"|"outcome"|"committed";input:JsonValue|null;outcome:ExecutionOutcome<JsonValue>|null;receipt:StepAttemptReceipt|null}>;
