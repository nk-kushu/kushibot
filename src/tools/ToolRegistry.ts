import type { ITool } from "./ITool.js";
import type { RegisteredTool } from "./RegisteredTool.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ToolOperationError } from "../errors/ToolOperationError.js";
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  constructor(private readonly json: JsonValueContract) {}
  async register(tool: ITool): Promise<void> {
    const d = { ...tool.descriptor };
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(d.id) || !/^[a-zA-Z0-9_.-]{1,32}$/.test(d.version) ||
        typeof d.description !== "string" || new TextEncoder().encode(d.description).byteLength > 1024 ||
        ![d.maxArgumentBytes, d.maxOutputBytes].every(value => Number.isSafeInteger(value) && value > 0 && value <= 65536)) throw new ToolOperationError();
    const schema = await this.json.validate(d.inputSchema);
    if (!schema.valid || new TextEncoder().encode(JSON.stringify(schema.value)).byteLength > 8192) throw new ToolOperationError();
    // Recheck after await so concurrent registration cannot overwrite an existing tool.
    if (this.tools.has(d.id) || this.tools.size >= 64) throw new ToolOperationError();
    this.tools.set(d.id, Object.freeze({ descriptor: Object.freeze({ id: d.id, version: d.version, description: d.description,
      inputSchema: schema.value, maxArgumentBytes: d.maxArgumentBytes, maxOutputBytes: d.maxOutputBytes }), implementation: tool }));
  }
  resolve(id: string): RegisteredTool | null { return this.tools.get(id) ?? null; }
  describe(ids: readonly string[]): readonly RegisteredTool["descriptor"][] {
    return Object.freeze(ids.map(id => { const tool = this.tools.get(id); if (tool === undefined) throw new ToolOperationError(); return tool.descriptor; }));
  }
}
