import type { JsonValue } from "../contracts/persistence/JsonValue.js";
export type AcceptedStepResult = Readonly<{ stepId: string; attemptId: string; receiptRef: string; result: JsonValue }>;
