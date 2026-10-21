import type { IPolicy } from "../contracts/IPolicy.js";
import type { ExecutionLimitInput } from "./ExecutionLimitInput.js";
import type { ExecutionLimitDecision } from "./ExecutionLimitDecision.js";
export class ExecutionLimitPolicy implements IPolicy<ExecutionLimitInput, ExecutionLimitDecision> {
  async apply(_input: ExecutionLimitInput): Promise<ExecutionLimitDecision> {
    return Object.freeze({ action: "stop", reason: Object.freeze({ code: "limit-reached" as const, message: "The next operation exceeds its remaining allowance." }) });
  }
}
