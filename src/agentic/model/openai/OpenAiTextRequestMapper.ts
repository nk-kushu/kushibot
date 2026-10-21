import type { ModelRequest } from "../ModelRequest.js";
import type { OpenAiTextRequest } from "./OpenAiTextRequest.js";
export class OpenAiTextRequestMapper {
  map(request: ModelRequest, model: string): OpenAiTextRequest {
    return Object.freeze({ model, instructions: request.instructions,
      input: Object.freeze(request.messages.map(message => Object.freeze({ role: message.role, content: message.text }))),
      max_output_tokens: request.maxOutputTokens, store: false, stream: false, truncation: "disabled",
      ...(request.promptCacheKey === null ? {} : { prompt_cache_key: request.promptCacheKey }) });
  }
}
