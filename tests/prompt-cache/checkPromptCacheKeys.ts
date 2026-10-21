import { HmacPromptCacheKeyDeriver } from "../../src/agentic/model/prompt-cache/HmacPromptCacheKeyDeriver.js";
import { ProviderPromptCachePolicy } from "../../src/agentic/model/prompt-cache/ProviderPromptCachePolicy.js";
export async function checkPromptCacheKeys(crypto: Crypto): Promise<void> {
  const secret = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign"]);
  const keys = new HmacPromptCacheKeyDeriver(crypto, secret);
  const configuration = { mode: "keyed" as const, namespace: "fixture", boundaryRef: "user-group-one", revision: "v1" };
  const profile = { id: "fixture", providerId: "openai", modelId: "fixture-model", contextTokens: 20000, maxOutputTokens: 1000, maxRequestBytes: 65536, maxResponseBytes: 65536, supportsPromptCacheKey: true };
  const input = { profile, instructionRevision: "v1", instructions: "Stable instructions." };
  const first = await keys.derive(configuration, input), repeated = await keys.derive(configuration, input);
  if (first !== repeated || first.length !== 64 || first.includes(configuration.boundaryRef)) throw new Error("Stable opaque cache key failed.");
  if (first === await keys.derive({ ...configuration, boundaryRef: "user-group-two" }, input) || first === await keys.derive(configuration, { ...input, instructions: "Changed instructions." }) ||
      first === await keys.derive(configuration, { ...input, profile: { ...profile, modelId: "different-model" } })) throw new Error("Cache key ignored boundary/content/model changes.");
  if ((await new ProviderPromptCachePolicy({ ...configuration, mode: "provider-default" }).apply(input)).kind !== "provider-default") throw new Error("Provider-default mode required a key.");
  if ((await new ProviderPromptCachePolicy(configuration, keys).apply({ ...input, profile: { ...profile, supportsPromptCacheKey: false } })).kind !== "unsupported") throw new Error("Unsupported key control not rejected.");
}
