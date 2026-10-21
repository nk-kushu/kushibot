import type { PromptCacheConfiguration } from "./PromptCacheConfiguration.js";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput.js";
export interface IPromptCacheKeyDeriver { derive(configuration: PromptCacheConfiguration, input: PromptCachePolicyInput): Promise<string>; }
