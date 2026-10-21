import type { GuardCheckInput } from "./GuardCheckInput.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IGuardCheck {
  readonly id: string; readonly version: string;
  evaluate(input: GuardCheckInput, context: IExecutionContext): Promise<unknown>;
}
