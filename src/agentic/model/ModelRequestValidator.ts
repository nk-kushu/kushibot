import type { ModelRequest } from "./ModelRequest.js";
import type { ModelProfile } from "../../models/ModelProfile.js";
import { ModelRequestError } from "../../errors/ModelRequestError.js";
export class ModelRequestValidator {
  validate(input: ModelRequest, profile: ModelProfile): ModelRequest {
    if (!this.integer(profile.contextTokens) || !this.integer(profile.maxOutputTokens) || !this.integer(profile.maxRequestBytes) || !this.integer(profile.maxResponseBytes) ||
        ![profile.id, profile.providerId, profile.modelId].every(value => typeof value === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(value)) ||
        typeof profile.supportsPromptCacheKey !== "boolean" || typeof input.instructions !== "string" || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 128 ||
        input.messages.some(message => message === null || typeof message !== "object" || !["user", "assistant"].includes(message.role) || typeof message.text !== "string") ||
        !this.integer(input.maxOutputTokens) || !this.integer(input.inputTokenUpperBound) || input.maxOutputTokens > profile.maxOutputTokens ||
        input.inputTokenUpperBound > profile.contextTokens - input.maxOutputTokens ||
        (input.promptCacheKey !== null && (!profile.supportsPromptCacheKey || typeof input.promptCacheKey !== "string" || !/^[a-zA-Z0-9_.:-]{1,64}$/.test(input.promptCacheKey)))) throw new ModelRequestError();
    const copy: ModelRequest = Object.freeze({ instructions: input.instructions, messages: Object.freeze(input.messages.map(message => Object.freeze({ role: message.role, text: message.text }))),
      maxOutputTokens: input.maxOutputTokens, inputTokenUpperBound: input.inputTokenUpperBound, promptCacheKey: input.promptCacheKey });
    if (new TextEncoder().encode(JSON.stringify(copy)).byteLength > profile.maxRequestBytes) throw new ModelRequestError();
    return copy;
  }
  private integer(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
}
