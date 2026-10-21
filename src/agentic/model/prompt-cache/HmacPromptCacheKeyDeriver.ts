import type { IPromptCacheKeyDeriver } from "./IPromptCacheKeyDeriver.js";
import type { PromptCacheConfiguration } from "./PromptCacheConfiguration.js";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput.js";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError.js";
export class HmacPromptCacheKeyDeriver implements IPromptCacheKeyDeriver {
  constructor(private readonly crypto: Pick<Crypto, "subtle">, private readonly secret: CryptoKey) {
    const algorithm = secret.algorithm as HmacKeyAlgorithm;
    if (secret.type !== "secret" || secret.extractable || algorithm.name !== "HMAC" || algorithm.hash?.name !== "SHA-256" || !secret.usages.includes("sign")) throw new PromptCacheConfigurationError();
  }
  async derive(configuration: PromptCacheConfiguration, input: PromptCachePolicyInput): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify({ format: 1, namespace: configuration.namespace, boundaryRef: configuration.boundaryRef,
      configurationRevision: configuration.revision, providerId: input.profile.providerId, modelId: input.profile.modelId,
      profileId: input.profile.id, instructionRevision: input.instructionRevision, instructions: input.instructions }));
    if (data.byteLength > 262144) throw new PromptCacheConfigurationError();
    const signature = new Uint8Array(await this.crypto.subtle.sign("HMAC", this.secret, data));
    // 240 retained HMAC bits plus the format prefix fit the existing gateway's 64-character key bound.
    return "pc1_" + [...signature].map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 60);
  }
}
