import type { ModelReply } from "../ModelReply.js";
import type { ModelUsage } from "../ModelUsage.js";
import type { ModelProfile } from "../../../models/ModelProfile.js";

/** Maps the public `codex exec --json` event stream into one Kushibot reply. */
export class CodexCliReplyMapper {
  map(raw: { stdout: string; exitCode: number }, profile: ModelProfile): ModelReply {
    let text = "", responseId: string | null = null, usage: ModelUsage | null = null;
    let completed = false, invalid = false, messages = 0;
    try {
      if (new TextEncoder().encode(raw.stdout).byteLength > profile.maxResponseBytes) throw new Error();
      for (const line of raw.stdout.split("\n")) {
        if (!line.trim()) continue;
        const event: unknown = JSON.parse(line);
        if (!this.record(event)) throw new Error();
        if (event.type === "thread.started") {
          if (responseId !== null || typeof event.thread_id !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(event.thread_id)) throw new Error();
          responseId = event.thread_id;
        } else if (event.type === "item.completed") {
          if (!this.record(event.item)) throw new Error();
          if (event.item.type === "agent_message") {
            if (typeof event.item.text !== "string" || completed) throw new Error();
            // CLI may emit progress messages; the last assistant message is final.
            text = event.item.text;
            messages++;
          } else if (event.item.type !== "reasoning") invalid = true;
        } else if (event.type === "turn.completed") {
          if (completed) throw new Error();
          completed = true;
          usage = this.mapUsage(event.usage);
          if (usage === null) invalid = true;
        } else if (event.type === "turn.failed") invalid = true;
        // The CLI also emits `error` for transient reconnect attempts. Only a
        // successful completion report and exit code can establish recovery.
      }
    } catch { invalid = true; }
    const ok = !invalid && raw.exitCode === 0 && completed && responseId !== null && messages > 0;
    return Object.freeze({ status: ok ? "completed" : "unavailable", text: ok ? text : "", responseId,
      usage, providerId: profile.providerId, modelId: profile.modelId,
      errorCode: ok ? null : "CODEX_CLI_PROTOCOL_INVALID" });
  }

  private mapUsage(value: unknown): ModelUsage | null {
    if (!this.record(value) || !this.count(value.input_tokens) || !this.count(value.output_tokens) ||
        !this.count(value.cached_input_tokens) || value.cached_input_tokens > value.input_tokens ||
        (value.reasoning_output_tokens !== undefined && (!this.count(value.reasoning_output_tokens) || value.reasoning_output_tokens > value.output_tokens))) return null;
    return Object.freeze({ inputTokens: value.input_tokens, outputTokens: value.output_tokens,
      cachedInputTokens: value.cached_input_tokens, reasoningTokens: value.reasoning_output_tokens as number | undefined ?? null });
  }
  private count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
}
