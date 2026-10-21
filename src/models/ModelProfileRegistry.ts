import type { ModelProfileRegistration } from "./ModelProfileRegistration.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class ModelProfileRegistry {
  private readonly profiles = new Map<string, ModelProfileRegistration>();
  register(input: ModelProfileRegistration): void {
    const p = input.profile;
    if (Object.keys(p).sort().join(",") !== "contextTokens,id,maxOutputTokens,maxRequestBytes,maxResponseBytes,modelId,providerId,supportsPromptCacheKey" || ![p.id, p.providerId, p.modelId].every(id => typeof id === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(id)) ||
        ![p.contextTokens, p.maxOutputTokens, p.maxRequestBytes, p.maxResponseBytes].every(value => Number.isSafeInteger(value) && value > 0) ||
        p.maxOutputTokens > p.contextTokens || typeof p.supportsPromptCacheKey !== "boolean" || this.profiles.has(p.id) || this.profiles.size >= 32 ||
        !Array.isArray(input.capabilities) || input.capabilities.length < 1 || new Set(input.capabilities).size !== input.capabilities.length ||
        input.capabilities.some(value => !["text", "tools", "structured-output", "images", "streaming", "continuation"].includes(value))) throw new ConfigurationError("Invalid or duplicate model profile registration.");
    this.profiles.set(p.id, Object.freeze({ profile: Object.freeze({ ...p }), capabilities: Object.freeze([...input.capabilities]) }));
  }
  resolve(id: string): ModelProfileRegistration {
    const value = this.profiles.get(id);
    if (value === undefined) throw new ConfigurationError("Model profile is not registered.");
    return value;
  }
}
