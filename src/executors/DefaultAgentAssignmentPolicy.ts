import type { IPolicy } from "../contracts/IPolicy.js";
import type { TaskInput } from "./TaskInput.js";
import type { AgentTaskAssignment } from "./AgentTaskAssignment.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
export class DefaultAgentAssignmentPolicy implements IPolicy<TaskInput,AgentTaskAssignment> {
  constructor(private readonly instructions: string) { if (!instructions.trim() || instructions.length > 4096) throw new ExecutorContractError(); }
  async apply(_input: TaskInput): Promise<AgentTaskAssignment> { return Object.freeze({ instructions: this.instructions }); }
}
