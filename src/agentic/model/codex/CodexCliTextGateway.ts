import type { IModelGateway } from "../../../models/contracts/IModelGateway.js";
import type { IClock } from "../../../contracts/runtime/IClock.js";
import type { ModelProfile } from "../../../models/ModelProfile.js";
import type { ModelRequest } from "../ModelRequest.js";
import type { ModelReply } from "../ModelReply.js";
import type { ModelCallControl } from "../ModelCallControl.js";
import type { ICodexCliTransport } from "./ICodexCliTransport.js";
import { ModelRequestValidator } from "../ModelRequestValidator.js";
import { ModelRequestError } from "../../../errors/ModelRequestError.js";
import { CodexCliReplyMapper } from "./CodexCliReplyMapper.js";

export class CodexCliTextGateway implements IModelGateway {
  private active = false;
  private readonly profile: ModelProfile;
  constructor(profile: ModelProfile, private readonly transport: ICodexCliTransport, private readonly clock: IClock,
    private readonly validator = new ModelRequestValidator(), private readonly replies = new CodexCliReplyMapper()) {
    if (profile.providerId !== "codex-cli" || profile.supportsPromptCacheKey) throw new ModelRequestError();
    this.profile = Object.freeze({ ...profile });
  }

  async generate(input: ModelRequest, control: ModelCallControl): Promise<ModelReply> {
    const request = this.validator.validate(input, this.profile);
    if (!Number.isSafeInteger(control.timeoutMs) || control.timeoutMs < 1 || control.timeoutMs > 2147483647 ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(control.operationId) ||
        (control.deadlineEpochMs !== null && (!Number.isSafeInteger(control.deadlineEpochMs) || control.deadlineEpochMs < 0))) throw new ModelRequestError();
    const now = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(now) || now < 0) throw new ModelRequestError();
    if (control.signal.aborted) return this.failure("CANCELLED_BEFORE_DISPATCH");
    if (control.deadlineEpochMs !== null && now >= control.deadlineEpochMs) return this.failure("DEADLINE_BEFORE_DISPATCH");
    if (this.active) return this.failure("TRANSPORT_BUSY_OR_UNRESOLVED");
    this.active = true;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: () => void = () => {};
    try {
      const stopped = new Promise<ModelReply>(resolve => {
        cancel = () => { abort.abort(); resolve(this.failure("CANCELLED_USAGE_UNKNOWN")); };
        control.signal.addEventListener("abort", cancel, { once: true });
        timer = setTimeout(() => { abort.abort(); resolve(this.failure("TIMEOUT_USAGE_UNKNOWN")); },
          Math.min(control.timeoutMs, control.deadlineEpochMs === null ? control.timeoutMs : control.deadlineEpochMs - now));
      });
      // Carry conversation roles explicitly in stdin; keep trusted instructions
      // in the CLI's separate developer-instructions configuration.
      const sent = Promise.resolve().then(() => this.transport.run({
        modelId: this.profile.modelId,
        instructions: request.instructions + "\nRespond only to the supplied conversation. Do not use native tools; tool actions must be returned as text for the host to execute.",
        prompt: JSON.stringify({ messages: request.messages, maxOutputTokens: request.maxOutputTokens }),
        maxResponseBytes: this.profile.maxResponseBytes, signal: abort.signal,
      }));
      const delivered = sent.then(raw => this.replies.map(raw, this.profile), () => this.failure("TRANSPORT_USAGE_UNKNOWN"));
      // Keep the slot until the CLI exits and cleanup settles, even if the caller
      // already received a timeout. Never redispatch an unresolved model call.
      void delivered.then(() => { this.active = false; }, () => { this.active = false; });
      return await Promise.race([delivered, stopped]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      control.signal.removeEventListener("abort", cancel);
    }
  }
  private failure(errorCode: string): ModelReply {
    return Object.freeze({ status: "unavailable", text: "", responseId: null, usage: null,
      providerId: this.profile.providerId, modelId: this.profile.modelId, errorCode });
  }
}
