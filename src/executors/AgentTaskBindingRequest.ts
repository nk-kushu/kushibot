import type { TaskInput } from "./TaskInput.js";
import type { AgentTaskAssignment } from "./AgentTaskAssignment.js";
import type { AgentTaskMode } from "./AgentTaskMode.js";
export type AgentTaskBindingRequest = Readonly<{ input: TaskInput; assignment: AgentTaskAssignment; mode: AgentTaskMode }>;
