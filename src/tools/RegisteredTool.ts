import type { ToolDescriptor } from "./ToolDescriptor.js";
import type { ITool } from "./ITool.js";
export type RegisteredTool = Readonly<{ descriptor: ToolDescriptor; implementation: ITool }>;
