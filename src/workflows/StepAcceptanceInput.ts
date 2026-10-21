import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
export type StepAcceptanceInput = Readonly<{ view:StepInputPolicyInput; input:JsonValue; candidate:JsonValue; execution:IExecutionContext }>;
