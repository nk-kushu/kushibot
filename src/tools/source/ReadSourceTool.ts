import type { ITool } from "../ITool.js";
import type { ToolDescriptor } from "../ToolDescriptor.js";
import type { IScopedSourceReader } from "./IScopedSourceReader.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { ReadSourceArgumentsContract } from "./ReadSourceArgumentsContract.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { ToolOperationError } from "../../errors/ToolOperationError.js";
export class ReadSourceTool implements ITool {
  readonly descriptor: ToolDescriptor = Object.freeze({ id: "read-source", version: "1", description: "Read a permitted source reference within a byte bound.", maxArgumentBytes: 1024, maxOutputBytes: 60000,
    inputSchema: Object.freeze({ type: "object", additionalProperties: false, required: ["sourceRef", "maxBytes"], properties: { sourceRef: { type: "string" }, maxBytes: { type: "integer", minimum: 1, maximum: 8192 } } }) });
  readonly argumentsContract = new ReadSourceArgumentsContract();
  readonly resultContract = new JsonValueContract();
  constructor(private readonly reader: IScopedSourceReader) {}
  async execute(args: JsonValue, context: IExecutionContext): Promise<unknown> {
    const checked = await this.argumentsContract.validate(args);
    if (!checked.valid) throw new ToolOperationError();
    const value = checked.value as Readonly<{ sourceRef: string; maxBytes: number }>;
    const text = await this.reader.read(value.sourceRef, value.maxBytes, context.signal);
    if (typeof text !== "string" || new TextEncoder().encode(text).byteLength > value.maxBytes) throw new ToolOperationError();
    return { sourceRef: value.sourceRef, text };
  }
}
