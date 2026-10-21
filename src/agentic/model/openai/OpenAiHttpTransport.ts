import { OpenAiStableTextSerializer } from "./OpenAiStableTextSerializer.js";
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport.js";
import type { OpenAiTextRequest } from "./OpenAiTextRequest.js";
import { ModelRequestError } from "../../../errors/ModelRequestError.js";
export class OpenAiHttpTransport implements IOpenAiResponsesTransport {
  constructor(private readonly apiKey: string, private readonly http: typeof fetch, private readonly serializer = new OpenAiStableTextSerializer()) {
    if (typeof apiKey !== "string" || apiKey.trim().length === 0 || /[\r\n]/.test(apiKey)) throw new ModelRequestError();
  }
  async create(body: OpenAiTextRequest, signal: AbortSignal, maxResponseBytes: number): Promise<unknown> {
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) throw new ModelRequestError();
    const response = await this.http("https://api.openai.com/v1/responses", { method: "POST", redirect: "error", signal,
      headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: this.serializer.serialize(body) });
    if (!response.ok || response.body === null) { await response.body?.cancel(); throw new Error("Provider transport failed; usage unknown."); }
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        total += next.value.byteLength;
        if (total > maxResponseBytes) { await reader.cancel(); throw new Error("Provider response exceeds byte limit; usage unknown."); }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; }
    catch { throw new Error("Provider response is not valid bounded JSON; usage unknown."); }
  }
}
