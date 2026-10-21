import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { AcceptedStepResult } from "./AcceptedStepResult.js";
export type StepInputPolicyInput = Readonly<{ workflow: RegistrationRef; stepId: string; viewRef: string; request: JsonValue; dependencies: readonly AcceptedStepResult[] }>;
