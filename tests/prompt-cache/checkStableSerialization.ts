import { OpenAiStableTextSerializer } from "../../src/agentic/model/openai/OpenAiStableTextSerializer.js";
import { OpenAiPromptCacheInspector } from "../../src/agentic/model/openai/OpenAiPromptCacheInspector.js";
import { OpenAiTextRequestMapper } from "../../src/agentic/model/openai/OpenAiTextRequestMapper.js";
export function checkStableSerialization(): void {
  const mapper = new OpenAiTextRequestMapper();
  const first = mapper.map({ instructions: "Stable guard instructions v1", messages: [{ role: "user", text: "Review login." }, { role: "user", text: "code-r4" }], maxOutputTokens: 100, inputTokenUpperBound: 500, promptCacheKey: "fixture-group-v1" }, "fixture-model");
  const second = { ...first, input: [first.input[0], { role: "user" as const, content: "code-r5" }] };
  const serializer = new OpenAiStableTextSerializer();
  const reordered = { truncation: first.truncation, stream: first.stream, store: first.store, max_output_tokens: first.max_output_tokens, input: first.input, instructions: first.instructions, model: first.model, prompt_cache_key: first.prompt_cache_key };
  if (serializer.serialize(first) !== serializer.serialize(reordered)) throw new Error("Property insertion order changed the wire payload.");
  const compared = new OpenAiPromptCacheInspector(serializer, 8192).compare(first, second);
  if (!compared.sameInstructions || !compared.sameCacheKey || compared.equalLeadingInputItems !== 1 || compared.commonSerializedPrefixBytes <= 0) throw new Error("Stable/dynamic comparison failed.");
  let rejected = false; try { serializer.serialize({ ...first, unsupportedControl: true } as typeof first); } catch { rejected = true; }
  if (!rejected) throw new Error("Unsupported provider control silently dropped.");
}
