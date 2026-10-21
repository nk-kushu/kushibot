import type { RoutingLayer } from "./RoutingLayer.js";
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext.js";
import type { ModelCapability } from "./ModelCapability.js";
import { ModelProfileRegistry } from "./ModelProfileRegistry.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class RoutingContextResolver {
  constructor(private readonly profiles: ModelProfileRegistry) {}
  resolve(role: string, layers: readonly RoutingLayer[]): ResolvedRoutingContext {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(role) || layers.length < 1 || layers.length > 8 || layers[0].allowedProfileIds === undefined) this.invalid();
    let allowed: readonly string[] = this.ids(layers[0].allowedProfileIds as readonly string[]);
    let preferred: readonly string[] = []; let explicit: string | null = null; let fallback = false; let taskSummary = "";
    let input = 1, output = 1; const capabilities = new Set<ModelCapability>();
    for (const layer of layers) {
      if (layer.taskSummary !== undefined) {
        if (typeof layer.taskSummary !== "string" || new TextEncoder().encode(layer.taskSummary).byteLength > 1024 || /[\u0000-\u001f]/.test(layer.taskSummary)) this.invalid();
        taskSummary = layer.taskSummary;
      }
      if (layer.allowedProfileIds !== undefined) { const next = this.ids(layer.allowedProfileIds); allowed = allowed.filter(id => next.includes(id)); }
      if (layer.preferredProfileIds !== undefined) preferred = this.ids(layer.preferredProfileIds);
      if (layer.requiredCapabilities !== undefined) {
        if (!Array.isArray(layer.requiredCapabilities) || layer.requiredCapabilities.length > 6 || layer.requiredCapabilities.some(value => !["text", "tools", "structured-output", "images", "streaming", "continuation"].includes(value))) this.invalid();
        for (const capability of layer.requiredCapabilities) capabilities.add(capability);
      }
      if (layer.inputTokens !== undefined) input = Math.max(input, this.positive(layer.inputTokens));
      if (layer.outputTokens !== undefined) output = Math.max(output, this.positive(layer.outputTokens));
      if (layer.explicitProfileId !== undefined) { this.profiles.resolve(layer.explicitProfileId); explicit = layer.explicitProfileId; }
      if (layer.allowFallback !== undefined) { if (typeof layer.allowFallback !== "boolean") this.invalid(); fallback = layer.allowFallback; }
    }
    // Preferences can be overridden; an explicit binding is an overridable preference, never an allowlist expansion.
    return Object.freeze({ schemaVersion: 1, role, taskSummary, allowedProfileIds: Object.freeze([...allowed]),
      preferredProfileIds: Object.freeze([...preferred.filter(id => allowed.includes(id)), ...allowed.filter(id => !preferred.includes(id))]),
      requirements: Object.freeze({ capabilities: Object.freeze([...capabilities]), inputTokens: input, outputTokens: output }),
      explicitProfileId: explicit, allowFallback: fallback });
  }
  private ids(input: readonly string[]): readonly string[] {
    if (!Array.isArray(input) || input.length > 32 || new Set(input).size !== input.length) this.invalid();
    for (const id of input) this.profiles.resolve(id);
    return [...input];
  }
  private positive(value: number): number { if (!Number.isSafeInteger(value) || value < 1) this.invalid(); return value; }
  private invalid(): never { throw new ConfigurationError("Invalid routing hierarchy or requirements."); }
}
