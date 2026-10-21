import type { IResultContract } from "../../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../../contracts/validation/ValidationResult.js";
import type { SummaryProposal } from "./SummaryProposal.js";
import type { SummaryRequest } from "./SummaryRequest.js";
import { JsonValueContract } from "../../../persistence/JsonValueContract.js";
export class SummaryProposalContract implements IResultContract<SummaryProposal> {
  readonly id = "context-summary-proposal"; readonly version = "1";
  constructor(private readonly request: SummaryRequest, private readonly json: JsonValueContract) {}
  async validate(input: unknown): Promise<ValidationResult<SummaryProposal>> {
    const checked = await this.json.validate(input); if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (!this.record(value) || Object.keys(value).join(",") !== "points" || !Array.isArray(value.points) || value.points.length < 1 || value.points.length > 8 || new TextEncoder().encode(JSON.stringify(value)).byteLength > this.request.maxSummaryBytes) return this.invalid();
    const offered = new Set(this.request.sources.map(source => source.id)); const seen = new Set<string>();
    for (const point of value.points) {
      if (!this.record(point) || Object.keys(point).sort().join(",") !== "sourceIds,text" || typeof point.text !== "string" || point.text.trim().length === 0 || new TextEncoder().encode(point.text).byteLength > 8192 ||
          !Array.isArray(point.sourceIds) || point.sourceIds.length < 1 || point.sourceIds.length > 8 || new Set(point.sourceIds).size !== point.sourceIds.length || point.sourceIds.some(id => typeof id !== "string" || !offered.has(id))) return this.invalid();
      for (const id of point.sourceIds) seen.add(id as string);
    }
    if (seen.size !== offered.size) return this.invalid();
    return { valid: true, value: value as unknown as SummaryProposal };
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private invalid(): ValidationResult<SummaryProposal> { return { valid: false, issues: [{ path: [], code: "invalid-summary-proposal", message: "Summary proposal exceeds limits or loses offered-source coverage." }] }; }
}
