import type { OpenAiTextRequest } from "./OpenAiTextRequest.js";
import type { StablePayloadComparison } from "../prompt-cache/StablePayloadComparison.js";
import { OpenAiStableTextSerializer } from "./OpenAiStableTextSerializer.js";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError.js";
export class OpenAiPromptCacheInspector {
  constructor(private readonly serializer: OpenAiStableTextSerializer, private readonly maxBytes: number) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1048576) throw new PromptCacheConfigurationError();
  }
  compare(first: OpenAiTextRequest, second: OpenAiTextRequest): StablePayloadComparison {
    const a = new TextEncoder().encode(this.serializer.serialize(first)), b = new TextEncoder().encode(this.serializer.serialize(second));
    if (a.byteLength > this.maxBytes || b.byteLength > this.maxBytes) throw new PromptCacheConfigurationError();
    let prefix = 0; while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
    let equalInputs = 0;
    while (equalInputs < first.input.length && equalInputs < second.input.length && JSON.stringify(first.input[equalInputs]) === JSON.stringify(second.input[equalInputs])) equalInputs++;
    return Object.freeze({ sameModel: first.model === second.model, sameInstructions: first.instructions === second.instructions,
      sameCacheKey: first.prompt_cache_key === second.prompt_cache_key, equalLeadingInputItems: equalInputs, commonSerializedPrefixBytes: prefix });
  }
}
