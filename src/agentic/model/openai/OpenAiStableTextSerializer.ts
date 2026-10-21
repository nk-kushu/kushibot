import type { OpenAiTextRequest } from "./OpenAiTextRequest.js";
import { ModelRequestError } from "../../../errors/ModelRequestError.js";
export class OpenAiStableTextSerializer {
  serialize(body: OpenAiTextRequest): string {
    const known = ["model", "instructions", "input", "max_output_tokens", "store", "stream", "truncation", "prompt_cache_key"];
    if (typeof body.model !== "string" || typeof body.instructions !== "string" || !Number.isSafeInteger(body.max_output_tokens) || body.max_output_tokens < 1 ||
        !Array.isArray(body.input) || body.input.length > 128 || body.input.some(item => item === null || typeof item !== "object" || Object.keys(item).sort().join(",") !== "content,role" || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") ||
        (body.prompt_cache_key !== undefined && (typeof body.prompt_cache_key !== "string" || !/^[a-zA-Z0-9_.:-]{1,64}$/.test(body.prompt_cache_key)))) throw new ModelRequestError();
    if (Object.keys(body).some(key => !known.includes(key)) || body.store !== false || body.stream !== false || body.truncation !== "disabled") throw new ModelRequestError();
    return JSON.stringify({ model: body.model, instructions: body.instructions,
      input: body.input.map(item => ({ role: item.role, content: item.content })), max_output_tokens: body.max_output_tokens,
      store: body.store, stream: body.stream, truncation: body.truncation,
      ...(body.prompt_cache_key === undefined ? {} : { prompt_cache_key: body.prompt_cache_key }) });
  }
}
