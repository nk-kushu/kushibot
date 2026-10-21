import { OpenAiTextRequestMapper } from "../../src/agentic/model/openai/OpenAiTextRequestMapper.js";
import { OpenAiTextReplyMapper } from "../../src/agentic/model/openai/OpenAiTextReplyMapper.js";
import type { ModelProfile } from "../../src/models/ModelProfile.js";
export function checkOpenAiTextMapping(): void {
  const profile: ModelProfile = { id: "fixture", providerId: "openai", modelId: "fixture-model", contextTokens: 1000, maxOutputTokens: 100, maxRequestBytes: 4096, maxResponseBytes: 4096, supportsPromptCacheKey: true };
  const requests = new OpenAiTextRequestMapper();
  const first = requests.map({ instructions: "Stable rules v1", messages: [{ role: "user", text: "Inspect login.ts" }], maxOutputTokens: 100, inputTokenUpperBound: 200, promptCacheKey: "project-rules-v1" }, profile.modelId);
  const second = requests.map({ instructions: "Stable rules v1", messages: [{ role: "user", text: "Inspect login.test.ts" }], maxOutputTokens: 100, inputTokenUpperBound: 210, promptCacheKey: "project-rules-v1" }, profile.modelId);
  if (first.instructions !== second.instructions || first.prompt_cache_key !== second.prompt_cache_key || first.input[0].content === second.input[0].content) throw new Error("Stable/dynamic mapping failed.");
  const replies = new OpenAiTextReplyMapper();
  const raw = { id: "resp_fixture", model: "fixture-model", status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "Found handler." }] }], usage: { input_tokens: 200, output_tokens: 20, input_tokens_details: { cached_tokens: 100 }, output_tokens_details: { reasoning_tokens: 5 } } };
  const reply = replies.map(raw, profile);
  if (reply.status !== "completed" || reply.usage?.inputTokens !== 200 || reply.usage.cachedInputTokens !== 100 || reply.usage.outputTokens !== 20) throw new Error("Usage mapping failed.");
  const unsupported = replies.map({ ...raw, output: [{ type: "function_call" }] }, profile);
  if (unsupported.status !== "unavailable" || unsupported.usage === null) throw new Error("Unsupported output or usage lost.");
  const refused = replies.map({ ...raw, output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "private text" }] }] }, profile);
  if (refused.status !== "refused" || refused.text !== "") throw new Error("Refusal mapping failed.");
}
