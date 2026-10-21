import type { IPolicy } from "../../../contracts/IPolicy.js";
import type { PromptCacheConfiguration } from "./PromptCacheConfiguration.js";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput.js";
import type { PromptCachePolicyDecision } from "./PromptCachePolicyDecision.js";
import type { IPromptCacheKeyDeriver } from "./IPromptCacheKeyDeriver.js";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError.js";
export class ProviderPromptCachePolicy implements IPolicy<PromptCachePolicyInput, PromptCachePolicyDecision> {
  private readonly configuration: PromptCacheConfiguration;
  constructor(configuration: PromptCacheConfiguration, private readonly keys: IPromptCacheKeyDeriver | null = null) {
    if (!["provider-default", "keyed"].includes(configuration.mode) || ![configuration.namespace, configuration.boundaryRef, configuration.revision].every(value => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value))) throw new PromptCacheConfigurationError();
    if (configuration.mode === "keyed" && keys === null) throw new PromptCacheConfigurationError();
    this.configuration = Object.freeze({ ...configuration });
  }
  async apply(input: PromptCachePolicyInput): Promise<PromptCachePolicyDecision> {
    if (this.configuration.mode === "provider-default") return { kind: "provider-default" };
    if (!input.profile.supportsPromptCacheKey) return { kind: "unsupported", code: "PROMPT_CACHE_KEY_UNSUPPORTED" };
    if (this.keys === null) throw new PromptCacheConfigurationError();
    const key = await this.keys.derive(this.configuration, input);
    if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key)) throw new PromptCacheConfigurationError();
    return Object.freeze({ kind: "keyed", key });
  }
}
