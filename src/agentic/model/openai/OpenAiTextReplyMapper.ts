import { OpenAiPromptCacheUsageMapper } from "./OpenAiPromptCacheUsageMapper.js";
import type { ModelReply } from "../ModelReply.js";
import type { ModelUsage } from "../ModelUsage.js";
import type { ModelProfile } from "../../../models/ModelProfile.js";
export class OpenAiTextReplyMapper {
  constructor(private readonly usageMapper = new OpenAiPromptCacheUsageMapper()) {}
  map(value: unknown, profile: ModelProfile): ModelReply {
    if (!this.record(value)) return this.failure(profile, null);
    const usage = this.usageMapper.map(value.usage);
    const responseId = typeof value.id === "string" && /^[a-zA-Z0-9_-]{1,256}$/.test(value.id) ? value.id : null;
    if (value.model !== profile.modelId || !Array.isArray(value.output) || value.output.length > 128 || !["completed", "incomplete"].includes(String(value.status))) return this.failure(profile, usage);
    let text = "", refused = false;
    for (const item of value.output) {
      if (!this.record(item)) return this.failure(profile, usage);
      if (item.type === "reasoning") continue; // Not a reasoning export or resumable protocol implementation.
      if (item.type !== "message" || item.role !== "assistant" || !Array.isArray(item.content) || item.content.length > 128) return this.failure(profile, usage);
      for (const content of item.content) {
        if (!this.record(content)) return this.failure(profile, usage);
        if (content.type === "refusal") { refused = true; continue; }
        if (content.type !== "output_text" || typeof content.text !== "string") return this.failure(profile, usage);
        text += content.text;
        if (new TextEncoder().encode(text).byteLength > profile.maxResponseBytes) return this.failure(profile, usage);
      }
    }
    return Object.freeze({ status: refused ? "refused" : value.status === "incomplete" ? "incomplete" : "completed",
      text: refused ? "" : text, responseId, usage, providerId: profile.providerId, modelId: profile.modelId, errorCode: null });
  }
  private failure(profile: ModelProfile, usage: ModelUsage | null): ModelReply { return Object.freeze({ status: "unavailable", text: "", responseId: null, usage,
    providerId: profile.providerId, modelId: profile.modelId, errorCode: "PROVIDER_PROTOCOL_INVALID" }); }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
}
