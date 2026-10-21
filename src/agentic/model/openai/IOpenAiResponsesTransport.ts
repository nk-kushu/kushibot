import type { OpenAiTextRequest } from "./OpenAiTextRequest.js";
export interface IOpenAiResponsesTransport {
  create(body: OpenAiTextRequest, signal: AbortSignal, maxResponseBytes: number): Promise<unknown>;
}
