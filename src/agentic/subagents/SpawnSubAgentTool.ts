import type { ITool } from "../../tools/ITool.js";
import type { ToolDescriptor } from "../../tools/ToolDescriptor.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { SubAgentArgumentsContract } from "./SubAgentArgumentsContract.js";
import { SubAgentCoordinator } from "./SubAgentCoordinator.js";
import { subAgentRequestSchema } from "./subAgentRequestSchema.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class SpawnSubAgentTool implements ITool {
  readonly descriptor: ToolDescriptor = Object.freeze({ id: "spawn-sub-agent", version: "1", description: "Run one focused sub-agent sequentially with narrower inherited capabilities; return its completed, partial, or pending outcome.", inputSchema: subAgentRequestSchema, maxArgumentBytes: 16384, maxOutputBytes: 65536 });
  constructor(private readonly coordinator: SubAgentCoordinator, readonly argumentsContract: SubAgentArgumentsContract, readonly resultContract: JsonValueContract) {}
  async execute(argumentsValue: JsonValue, context: IExecutionContext): Promise<JsonValue> {
    const response = await this.coordinator.spawn(argumentsValue,context);
    const checked = await this.resultContract.validate(response); if (!checked.valid) throw new SubAgentCoordinationError();
    return checked.value;
  }
}
