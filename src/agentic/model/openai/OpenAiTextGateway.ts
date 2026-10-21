import type { IModelGateway } from "../../../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../../../models/ModelProfile.js";
import type { IClock } from "../../../contracts/runtime/IClock.js";
import type { ModelRequest } from "../ModelRequest.js";
import type { ModelReply } from "../ModelReply.js";
import type { ModelCallControl } from "../ModelCallControl.js";
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport.js";
import { ModelRequestValidator } from "../ModelRequestValidator.js";
import { OpenAiTextRequestMapper } from "./OpenAiTextRequestMapper.js";
import { OpenAiTextReplyMapper } from "./OpenAiTextReplyMapper.js";
import { ModelRequestError } from "../../../errors/ModelRequestError.js";
export class OpenAiTextGateway implements IModelGateway {
  private active = false;
  private readonly profile: ModelProfile;
  constructor(profile: ModelProfile, private readonly transport: IOpenAiResponsesTransport, private readonly clock: IClock,
    private readonly validator: ModelRequestValidator, private readonly requests: OpenAiTextRequestMapper, private readonly replies: OpenAiTextReplyMapper) { this.profile = Object.freeze({ ...profile }); }
  async generate(input: ModelRequest, control: ModelCallControl): Promise<ModelReply> {
    const request = this.validator.validate(input, this.profile);
    if (!Number.isSafeInteger(control.timeoutMs) || control.timeoutMs < 1 || control.timeoutMs > 2147483647 ||
        !/^[a-zA-Z0-9_.:-]{1,128}$/.test(control.operationId) || (control.deadlineEpochMs !== null && (!Number.isSafeInteger(control.deadlineEpochMs) || control.deadlineEpochMs < 0))) throw new ModelRequestError();
    const now = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(now) || now < 0) throw new ModelRequestError();
    if (control.signal.aborted) return this.failure("CANCELLED_BEFORE_DISPATCH");
    if (control.deadlineEpochMs !== null && now >= control.deadlineEpochMs) return this.failure("DEADLINE_BEFORE_DISPATCH");
    if (this.active) return this.failure("TRANSPORT_BUSY_OR_UNRESOLVED");
    const body = this.requests.map(request, this.profile.modelId);
    if (new TextEncoder().encode(JSON.stringify(body)).byteLength > this.profile.maxRequestBytes) throw new ModelRequestError();
    this.active = true;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: () => void = () => {};
    try {
      const cancelled = new Promise<ModelReply>(resolve => { cancel = () => { abort.abort(); resolve(this.failure("CANCELLED_USAGE_UNKNOWN")); }; control.signal.addEventListener("abort", cancel, { once: true }); });
      const timeoutMs = Math.min(control.timeoutMs, control.deadlineEpochMs === null ? control.timeoutMs : control.deadlineEpochMs - now);
      const timedOut = new Promise<ModelReply>(resolve => { timer = setTimeout(() => { abort.abort(); resolve(this.failure("TIMEOUT_USAGE_UNKNOWN")); }, timeoutMs); });
      const sent = Promise.resolve().then(() => this.transport.create(body, abort.signal, this.profile.maxResponseBytes));
      const delivered = sent.then(raw => this.replies.map(raw, this.profile), () => this.failure("TRANSPORT_USAGE_UNKNOWN"));
      // Keep the slot occupied until the underlying transport settles, even after the caller has stopped waiting.
      void delivered.then(() => { this.active = false; }, () => { this.active = false; });
      return await Promise.race([delivered, cancelled, timedOut]);
    } finally { if (timer !== undefined) clearTimeout(timer); control.signal.removeEventListener("abort", cancel); }
  }
  private failure(errorCode: string): ModelReply { return Object.freeze({ status: "unavailable", text: "", responseId: null, usage: null,
    providerId: this.profile.providerId, modelId: this.profile.modelId, errorCode }); }
}
