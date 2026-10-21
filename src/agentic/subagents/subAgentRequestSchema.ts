import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import { usageDimensions } from "../../usage/usageDimensions.js";
export const subAgentRequestSchema: JsonValue = Object.freeze<JsonValue>({
  type: "object", additionalProperties: false,
  required: ["goal","acceptanceCriteria","sourceRefs","modelRole","resultContractId","toolIds","access","filePaths","maxTurns","limits","deadlineEpochMs"],
  properties: {
    goal: { type: "string", minLength: 1, maxLength: 2048 },
    acceptanceCriteria: { type: "array", minItems: 1, maxItems: 16, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 512 } },
    sourceRefs: { type: "array", maxItems: 16, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 256 } },
    modelRole: { type: "string", pattern: "^[A-Za-z0-9_.:-]{1,128}$" },
    resultContractId: { type: "string", pattern: "^[A-Za-z0-9_.:-]{1,128}$" },
    toolIds: { type: "array", maxItems: 16, uniqueItems: true, items: { type: "string", pattern: "^[A-Za-z0-9_.:-]{1,128}$" } },
    access: { enum: ["read-only","edit"] },
    filePaths: { type: "array", maxItems: 16, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 256 } },
    maxTurns: { type: "integer", minimum: 1, maximum: 128 },
    limits: { type: "object", additionalProperties: false, required: [...usageDimensions], properties: Object.fromEntries(usageDimensions.map(key => [key,{ type: "integer", minimum: 0, maximum: 1000000000 }])) },
    deadlineEpochMs: { anyOf: [{ type: "null" },{ type: "integer", minimum: 0 }] }
  }
});
