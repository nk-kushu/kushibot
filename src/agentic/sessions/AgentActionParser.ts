import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import type { AgentAction } from "./AgentAction.js";
export class AgentActionParser {
  constructor(private readonly json: JsonValueContract) {}
  async parse(text: string): Promise<AgentAction | null> {
    if (new TextEncoder().encode(text).byteLength > 16384) return null;
    let raw: unknown; try { raw = JSON.parse(text); } catch { return null; }
    const checked = await this.json.validate(raw); if (!checked.valid) return null;
    const value = checked.value;
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const row = value as Readonly<Record<string, import("../../contracts/persistence/JsonValue.js").JsonValue>>;
    if (row.kind === "final" && this.keys(row, ["kind", "value"])) return { kind: "final", value: row.value };
    if (row.kind === "tool" && this.keys(row, ["kind", "toolId", "arguments"]) && typeof row.toolId === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(row.toolId)) return { kind: "tool", toolId: row.toolId, arguments: row.arguments };
    if (row.kind === "note" && this.keys(row, ["kind", "entry"]) && row.entry !== null && typeof row.entry === "object" && !Array.isArray(row.entry)) {
      const entry = row.entry as Readonly<Record<string, unknown>>;
      if (this.keys(entry, ["text", "evidenceRefs"]) && typeof entry.text === "string" && entry.text.trim() && entry.text.length <= 2048 && Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length <= 8 && entry.evidenceRefs.every(ref => typeof ref === "string" && ref.length > 0 && ref.length <= 256)) return { kind: "note", entry: { text: entry.text, evidenceRefs: Object.freeze([...entry.evidenceRefs]) } };
    }
    return null;
  }
  private keys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key)); }
}
