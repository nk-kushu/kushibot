# 10. Model Gateway and Provider Adapters

## What We Implement Here

Create the shared model gateway, normalized text requests and replies, immutable model profiles, and provider factory registration. Implement an injected OpenAI text adapter with bounded transport, cancellation, safe usage mapping, and stable prompt serialization. Connect individual calls to the existing budget ledger without hidden retries or answer caching.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `agentic/model/ModelMessage.ts` | `type ModelMessage` |
| `agentic/model/ModelRequest.ts` | `type ModelRequest` |
| `agentic/model/ModelCallControl.ts` | `type ModelCallControl` |
| `agentic/model/ModelUsage.ts` | `type ModelUsage` |
| `agentic/model/ModelReply.ts` | `type ModelReply` |
| `models/ModelProfile.ts` | `type ModelProfile` |
| `models/contracts/IModelGateway.ts` | `interface IModelGateway` |
| `models/contracts/IModelGatewayFactory.ts` | `interface IModelGatewayFactory` |
| `models/ModelGatewayRegistry.ts` | `class ModelGatewayRegistry` |
| `errors/ModelRequestError.ts` | `class ModelRequestError extends Error` |
| `agentic/model/ModelRequestValidator.ts` | `class ModelRequestValidator` |
| `agentic/model/openai/OpenAiTextRequest.ts` | `type OpenAiTextRequest` |
| `agentic/model/openai/IOpenAiResponsesTransport.ts` | `interface IOpenAiResponsesTransport` |
| `agentic/model/openai/OpenAiTextRequestMapper.ts` | `class OpenAiTextRequestMapper` |
| `agentic/model/openai/OpenAiTextReplyMapper.ts` | `class OpenAiTextReplyMapper` |
| `agentic/model/openai/OpenAiTextGateway.ts` | `class OpenAiTextGateway implements IModelGateway` |
| `agentic/model/openai/OpenAiTextGatewayFactory.ts` | `class OpenAiTextGatewayFactory implements IModelGatewayFactory` |
| `agentic/model/openai/OpenAiHttpTransport.ts` | `class OpenAiHttpTransport implements IOpenAiResponsesTransport` |
| `agentic/model/ModelCallOutcome.ts` | `type ModelCallOutcome` |
| `agentic/model/BudgetedModelCall.ts` | `class BudgetedModelCall` |
| `tests/fakes/FakeModelGateway.ts` | `class FakeModelGateway implements IModelGateway` |
| `tests/model/checkOpenAiTextMapping.ts` | `function checkOpenAiTextMapping` |
| `agentic/model/IModelInputSizer.ts` | `interface IModelInputSizer` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Apply the general OOP, file, and writing rules from [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md). The only gateway interface is `models/contracts/IModelGateway.ts`. Normalized request/reply data lives in `agentic/model/`; profiles/factory registration live in `models/`. No provider/type switch belongs in the engine or agent loop. Every interface and class has its own file.
- This phase implements bounded **non-streaming text generation** and its accounting seam. The concrete OpenAI adapter does not implement function tools, structured-output schemas, images, provider conversation continuation, or streaming. It sends no tools and rejects unsupported output items. These capabilities must get explicit contracts, per-provider translation, eligibility checks, and tests in their owning later phases before use. Do not treat a tool request, incomplete output, refusal, or transport failure as completed text.
- `ModelProfile` is immutable effective configuration resolved by trusted composition. Context/output limits and capabilities must be validated for the exact configured provider/model deployment. The example model ID is a fixture, not an available model recommendation. `OpenAiTextReplyMapper` requires an exact returned model ID: configure the canonical pinned identifier that the deployment returns, rather than silently accepting an alias that resolves differently. Routing and handoffs belong to page 12; changing a registry does not migrate sessions.
- The host supplies an already authorized request and a conservative `inputTokenUpperBound` counted against the complete mapped request, including provider overhead. It is not a model-supplied number or a string-length estimate. This text adapter uses an input-plus-output capacity check; another provider may require a different validated capacity model. Page 16 supplies context selection and composition. Do not silently truncate required instructions or goals to fit.
- Preserve instructions, message order, and stable text byte-for-byte. The request mapper adds only the documented provider fields and an explicitly supported cache key. Timestamps, trace IDs, reservation IDs, and per-call randomness stay outside stable prompt content. The provider can reuse identical prompt prefixes; a cache key is a routing hint, not proof of a cache hit or permission to reuse an answer. There is no answer-cache lookup or response reuse subsystem. Page 17 adds detailed cache policy/capabilities. These semantics follow [official prompt-caching documentation](https://developers.openai.com/api/docs/guides/prompt-caching).
- The OpenAI request uses the Responses text API with explicit storage and truncation choices. It sends the full current text context each time and does not claim resumable provider protocol support. Refusal is separate from generated text. SDK convenience text fields are not assumed; the mapper reads bounded output items. The concrete field mapping should be checked against the pinned deployment/API contract during implementation. See the [official Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses).
- Only `OpenAiHttpTransport` owns the key and endpoint call. The host injects the key and fetch implementation; no core `process.env`, SDK singleton, credential serialization, or credential-bearing logs. Fixed HTTPS origin and redirect rejection avoid forwarding credentials to arbitrary endpoints. Bound response-body bytes before JSON parsing; the injected HTTP implementation must provide normal cancellation and bounded connection behavior. Keep the transport's automatic retry count at zero. No live calls or credentials are needed for this page's checks.
- `OpenAiTextGateway` permits one underlying active attempt per instance. Cancellation and timeout stop waiting and request abort; they do not establish no billing or no external effect. If an underlying transport ignores abort, the instance stays busy until it settles. A timed-out result arriving later is not silently substituted into the caller's outcome; an operation journal/reconciler must handle recovery. Finite timers cannot interrupt synchronous blocking host code. Bound aggregate adapter instances and pending operations through the later admission owner.
- The owner persists the absolute deadline, checks it before reservation, after waits, and before dispatch, and forwards the signal to the adapter. Timeout is bounded by the earliest applicable deadline. Clocks, IDs, and ledger scope come from trusted execution context. `BudgetedModelCall` never retries or changes models automatically.
- `BudgetedModelCall` validates/copies the request, reserves one call plus input/output upper bounds from page 09, and dispatches only a newly admitted operation. Exact accounting replay returns `uncertain` and does not dispatch again, including when a prior operation was already settled. The later operation journal owns durable result receipts, dispatch leases, and recovery. A crash between reservation and dispatch conservatively leaves capacity reserved until that owner can prove what happened.
- A pre-dispatch stop after reservation can settle to zero only because this owner has not called the gateway. Adapter exceptions or missing usage retain unknown reservations. Even a known pre-dispatch adapter rejection is conservatively unknown through this generic boundary unless an authoritative no-charge receipt exists. Completed text with missing usage can be received, but its reservation remains unknown; success does not manufacture free capacity. Unknown-use records and unaccepted text must stay distinct during recovery.
- Provider usage totals are measured separately from cached-input and reasoning subsets. Do not subtract cached input from total input, double-count reasoning already included in output, or estimate exact cost without a versioned price source. Unknown usage is null. Malformed optional usage details conservatively make usage unknown. If actual tokens exceed the reservation, record that overage through the ledger and block future admission. New provider-specific billed categories require explicit extension rather than being ignored as zero.
- Gateways are trusted registered implementations of the normalized reply contract. Each adapter must validate its untrusted response, cap strings/arrays, preserve measured usage when the semantic output is unusable, and emit only safe error codes. Raw prompts, raw exceptions, reasoning items, and provider responses are not debug payloads. A parsed text result still needs the caller's result-schema and task-acceptance checks. A post-call deadline/cancellation stop is returned alongside the reply so usage and received work remain available without claiming normal completion.
- Accounting mutations are required persistence, independent of optional diagnostics. A persistence failure propagates and leaves the operation needing reconciliation; never report a settled call without a committed receipt or blindly retry the provider. The phase-09 store provides atomic accounting commands, not exactly-once external requests.
- Acceptance checks cover stable request mapping, input order, unsupported capabilities, byte/token bounds, refusal/incomplete output, exact model identity, cache/usage subsets, cancellation before/during dispatch, timeout with ignored abort, busy-adapter rejection, bounded HTTP parsing, missing usage, budget denial, replay without redispatch, and persistence failures. Offline transport fixtures establish these mappings; only a separately authorized live contract test can establish actual provider/deployment compatibility.

## TypeScript Code for Each File

### `agentic/model/ModelMessage.ts`

Represents ordered text context without embedding SDK or credential objects.

```typescript
export type ModelMessage = Readonly<{ role: "user" | "assistant"; text: string }>;
```

### `agentic/model/ModelRequest.ts`

Carries the composer’s stable instructions and ordered dynamic text plus explicit resource bounds.

```typescript
import type { ModelMessage } from "./ModelMessage";
export type ModelRequest = Readonly<{
  instructions: string; messages: readonly ModelMessage[]; maxOutputTokens: number;
  inputTokenUpperBound: number; promptCacheKey: string | null;
}>;
```

### `agentic/model/ModelCallControl.ts`

Supplies trusted operation identity, cooperative cancellation, absolute deadline, and a finite per-attempt timeout.

```typescript
export type ModelCallControl = Readonly<{ operationId: string; signal: AbortSignal; deadlineEpochMs: number | null; timeoutMs: number }>;
```

### `agentic/model/ModelUsage.ts`

Keeps measured totals separate from optional cached-input and reasoning subsets; null means unknown, never zero.

```typescript
export type ModelUsage = Readonly<{ inputTokens: number; outputTokens: number; cachedInputTokens: number | null; reasoningTokens: number | null }>;
```

### `agentic/model/ModelReply.ts`

Separates usable text, incomplete text, refusal, and transport/protocol failure while retaining known usage and provider identity.

```typescript
import type { ModelUsage } from "./ModelUsage";
export type ModelReply = Readonly<{
  status: "completed" | "incomplete" | "refused" | "unavailable";
  text: string; responseId: string | null; usage: ModelUsage | null;
  providerId: string; modelId: string; errorCode: string | null;
}>;
```

### `models/ModelProfile.ts`

Describes one immutable text-model binding; advertised limits are trusted deployment configuration, not guessed from an alias.

```typescript
export type ModelProfile = Readonly<{
  id: string; providerId: string; modelId: string; contextTokens: number; maxOutputTokens: number;
  maxRequestBytes: number; maxResponseBytes: number; supportsPromptCacheKey: boolean;
}>;
```

### `models/contracts/IModelGateway.ts`

Defines the single provider-neutral call contract used by DecisionUnit and later agentic components.

```typescript
import type { ModelRequest } from "../../agentic/model/ModelRequest";
import type { ModelReply } from "../../agentic/model/ModelReply";
import type { ModelCallControl } from "../../agentic/model/ModelCallControl";
export interface IModelGateway { generate(request: ModelRequest, control: ModelCallControl): Promise<ModelReply>; }
```

### `models/contracts/IModelGatewayFactory.ts`

Lets composition register interchangeable provider factories without provider switches in workflow or agent loops.

```typescript
import type { IModelGateway } from "./IModelGateway";
import type { ModelProfile } from "../ModelProfile";
export interface IModelGatewayFactory { create(profile: ModelProfile): IModelGateway; }
```

### `models/ModelGatewayRegistry.ts`

Resolves a configured provider factory by registration ID and rejects duplicate or unknown registrations.

```typescript
import type { IModelGatewayFactory } from "./contracts/IModelGatewayFactory";
import type { IModelGateway } from "./contracts/IModelGateway";
import type { ModelProfile } from "./ModelProfile";
import { ConfigurationError } from "../errors/ConfigurationError";
export class ModelGatewayRegistry {
  private readonly factories = new Map<string, IModelGatewayFactory>();
  register(providerId: string, factory: IModelGatewayFactory): void {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(providerId) || this.factories.has(providerId)) throw new ConfigurationError("Invalid or duplicate model provider registration.");
    this.factories.set(providerId, factory);
  }
  create(profile: ModelProfile): IModelGateway {
    const factory = this.factories.get(profile.providerId);
    if (factory === undefined) throw new ConfigurationError("Model provider is not registered.");
    return factory.create(Object.freeze({ ...profile }));
  }
}
```

### `errors/ModelRequestError.ts`

Reports a pre-dispatch validation failure using a fixed safe message without request contents.

```typescript
export class ModelRequestError extends Error {
  readonly code = "MODEL_REQUEST_INVALID";
  constructor() { super("Model request or configured capability is invalid."); this.name = "ModelRequestError"; }
}
```

### `agentic/model/ModelRequestValidator.ts`

Validates and copies bounded text requests before reservation or provider translation; preserves existing message order.

```typescript
import type { ModelRequest } from "./ModelRequest";
import type { ModelProfile } from "../../models/ModelProfile";
import { ModelRequestError } from "../../errors/ModelRequestError";
export class ModelRequestValidator {
  validate(input: ModelRequest, profile: ModelProfile): ModelRequest {
    if (!this.integer(profile.contextTokens) || !this.integer(profile.maxOutputTokens) || !this.integer(profile.maxRequestBytes) || !this.integer(profile.maxResponseBytes) ||
        ![profile.id, profile.providerId, profile.modelId].every(value => typeof value === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(value)) ||
        typeof profile.supportsPromptCacheKey !== "boolean" || typeof input.instructions !== "string" || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 128 ||
        input.messages.some(message => message === null || typeof message !== "object" || !["user", "assistant"].includes(message.role) || typeof message.text !== "string") ||
        !this.integer(input.maxOutputTokens) || !this.integer(input.inputTokenUpperBound) || input.maxOutputTokens > profile.maxOutputTokens ||
        input.inputTokenUpperBound > profile.contextTokens - input.maxOutputTokens ||
        (input.promptCacheKey !== null && (!profile.supportsPromptCacheKey || typeof input.promptCacheKey !== "string" || !/^[a-zA-Z0-9_.:-]{1,64}$/.test(input.promptCacheKey)))) throw new ModelRequestError();
    const copy: ModelRequest = Object.freeze({ instructions: input.instructions, messages: Object.freeze(input.messages.map(message => Object.freeze({ role: message.role, text: message.text }))),
      maxOutputTokens: input.maxOutputTokens, inputTokenUpperBound: input.inputTokenUpperBound, promptCacheKey: input.promptCacheKey });
    if (new TextEncoder().encode(JSON.stringify(copy)).byteLength > profile.maxRequestBytes) throw new ModelRequestError();
    return copy;
  }
  private integer(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
}
```

### `agentic/model/openai/OpenAiTextRequest.ts`

Defines the intentionally small non-streaming text subset sent through the injected OpenAI transport.

```typescript
export type OpenAiTextRequest = Readonly<{
  model: string; instructions: string;
  input: readonly Readonly<{ role: "user" | "assistant"; content: string }>[];
  max_output_tokens: number; store: false; stream: false; truncation: "disabled"; prompt_cache_key?: string;
}>;
```

### `agentic/model/openai/IOpenAiResponsesTransport.ts`

Keeps SDK setup, credentials, retry configuration, response-body bounds, and network lifecycle outside the core adapter.

```typescript
import type { OpenAiTextRequest } from "./OpenAiTextRequest";
export interface IOpenAiResponsesTransport {
  create(body: OpenAiTextRequest, signal: AbortSignal, maxResponseBytes: number): Promise<unknown>;
}
```

### `agentic/model/openai/OpenAiTextRequestMapper.ts`

Preserves stable instructions and input order while translating supported provider-specific cache controls.

```typescript
import type { ModelRequest } from "../ModelRequest";
import type { OpenAiTextRequest } from "./OpenAiTextRequest";
export class OpenAiTextRequestMapper {
  map(request: ModelRequest, model: string): OpenAiTextRequest {
    return Object.freeze({ model, instructions: request.instructions,
      input: Object.freeze(request.messages.map(message => Object.freeze({ role: message.role, content: message.text }))),
      max_output_tokens: request.maxOutputTokens, store: false, stream: false, truncation: "disabled",
      ...(request.promptCacheKey === null ? {} : { prompt_cache_key: request.promptCacheKey }) });
  }
}
```

### `agentic/model/openai/OpenAiTextReplyMapper.ts`

Normalizes bounded Responses text/refusal items and usage without retaining private reasoning or raw provider errors.

```typescript
import type { ModelReply } from "../ModelReply";
import type { ModelUsage } from "../ModelUsage";
import type { ModelProfile } from "../../../models/ModelProfile";
export class OpenAiTextReplyMapper {
  map(value: unknown, profile: ModelProfile): ModelReply {
    if (!this.record(value)) return this.failure(profile, null);
    const usage = this.usage(value.usage);
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
  private usage(value: unknown): ModelUsage | null {
    if (!this.record(value) || !this.count(value.input_tokens) || !this.count(value.output_tokens)) return null;
    const cached = this.record(value.input_tokens_details) ? value.input_tokens_details.cached_tokens : undefined;
    const reasoning = this.record(value.output_tokens_details) ? value.output_tokens_details.reasoning_tokens : undefined;
    if ((cached !== undefined && (!this.count(cached) || cached > value.input_tokens)) || (reasoning !== undefined && (!this.count(reasoning) || reasoning > value.output_tokens))) return null;
    return Object.freeze({ inputTokens: value.input_tokens, outputTokens: value.output_tokens,
      cachedInputTokens: cached === undefined ? null : cached as number, reasoningTokens: reasoning === undefined ? null : reasoning as number });
  }
  private failure(profile: ModelProfile, usage: ModelUsage | null): ModelReply { return Object.freeze({ status: "unavailable", text: "", responseId: null, usage,
    providerId: profile.providerId, modelId: profile.modelId, errorCode: "PROVIDER_PROTOCOL_INVALID" }); }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
}
```

### `agentic/model/openai/OpenAiTextGateway.ts`

Runs one bounded non-streaming attempt, links cancellation, and quarantines a transport attempt that remains unresolved after timeout.

```typescript
import type { IModelGateway } from "../../../models/contracts/IModelGateway";
import type { ModelProfile } from "../../../models/ModelProfile";
import type { IClock } from "../../../contracts/runtime/IClock";
import type { ModelRequest } from "../ModelRequest";
import type { ModelReply } from "../ModelReply";
import type { ModelCallControl } from "../ModelCallControl";
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport";
import { ModelRequestValidator } from "../ModelRequestValidator";
import { OpenAiTextRequestMapper } from "./OpenAiTextRequestMapper";
import { OpenAiTextReplyMapper } from "./OpenAiTextReplyMapper";
import { ModelRequestError } from "../../../errors/ModelRequestError";
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
```

### `agentic/model/openai/OpenAiTextGatewayFactory.ts`

Assembles an adapter from an injected transport factory; constructing it neither reads credentials nor starts network work.

```typescript
import type { IModelGatewayFactory } from "../../../models/contracts/IModelGatewayFactory";
import type { IModelGateway } from "../../../models/contracts/IModelGateway";
import type { ModelProfile } from "../../../models/ModelProfile";
import type { IClock } from "../../../contracts/runtime/IClock";
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport";
import { OpenAiTextGateway } from "./OpenAiTextGateway";
import { ModelRequestValidator } from "../ModelRequestValidator";
import { OpenAiTextRequestMapper } from "./OpenAiTextRequestMapper";
import { OpenAiTextReplyMapper } from "./OpenAiTextReplyMapper";
export class OpenAiTextGatewayFactory implements IModelGatewayFactory {
  constructor(private readonly createTransport: () => IOpenAiResponsesTransport, private readonly clock: IClock) {}
  create(profile: ModelProfile): IModelGateway { return new OpenAiTextGateway(profile, this.createTransport(), this.clock,
    new ModelRequestValidator(), new OpenAiTextRequestMapper(), new OpenAiTextReplyMapper()); }
}
```

### `agentic/model/openai/OpenAiHttpTransport.ts`

Sends one Responses HTTP request without automatic retry and bounds streamed response bytes before parsing JSON.

```typescript
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport";
import type { OpenAiTextRequest } from "./OpenAiTextRequest";
import { ModelRequestError } from "../../../errors/ModelRequestError";
export class OpenAiHttpTransport implements IOpenAiResponsesTransport {
  constructor(private readonly apiKey: string, private readonly http: typeof fetch) {
    if (typeof apiKey !== "string" || apiKey.trim().length === 0 || /[\r\n]/.test(apiKey)) throw new ModelRequestError();
  }
  async create(body: OpenAiTextRequest, signal: AbortSignal, maxResponseBytes: number): Promise<unknown> {
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) throw new ModelRequestError();
    const response = await this.http("https://api.openai.com/v1/responses", { method: "POST", redirect: "error", signal,
      headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
```

### `agentic/model/ModelCallOutcome.ts`

Distinguishes admission stops, received replies, and calls whose dispatch or usage requires reconciliation.

```typescript
import type { ModelReply } from "./ModelReply";
import type { ExecutionStopReason } from "../../execution-control/ExecutionStopReason";
export type ModelCallOutcome =
  | Readonly<{ status: "received"; reply: ModelReply; stopReason: ExecutionStopReason | null }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
```

### `agentic/model/BudgetedModelCall.ts`

Coordinates one reserved attempt without retrying: late/unknown usage stays visible and replay never redispatches the model.

```typescript
import type { IModelGateway } from "../../models/contracts/IModelGateway";
import type { ModelProfile } from "../../models/ModelProfile";
import type { ModelRequest } from "./ModelRequest";
import type { ModelCallControl } from "./ModelCallControl";
import type { ModelCallOutcome } from "./ModelCallOutcome";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore";
import type { IClock } from "../../contracts/runtime/IClock";
import { zeroUsage } from "../../usage/zeroUsage";
import { ModelRequestValidator } from "./ModelRequestValidator";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard";
export class BudgetedModelCall {
  constructor(private readonly gateway: IModelGateway, private readonly profile: ModelProfile,
    private readonly ledger: IUsageLedgerStore, private readonly budgetScopeId: string,
    private readonly clock: IClock, private readonly validator: ModelRequestValidator) {}
  async run(input: ModelRequest, control: ModelCallControl): Promise<ModelCallOutcome> {
    const request = this.validator.validate(input, this.profile);
    const guard = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { status: "stopped", reason: before };
    const admitted = await this.ledger.mutate(ledger => ledger.reserve(control.operationId, this.budgetScopeId, {
      ...zeroUsage, modelCalls: 1, inputTokens: request.inputTokenUpperBound, outputTokens: request.maxOutputTokens,
    }));
    if (!admitted.admitted) return { status: "stopped", reason: { code: "limit-reached", message: "Model allowance unavailable." } };
    if (admitted.replayed) return { status: "uncertain", operationId: control.operationId };
    const afterWait = guard.check();
    if (afterWait !== null) { await this.ledger.mutate(ledger => ledger.settle(control.operationId, zeroUsage)); return { status: "stopped", reason: afterWait }; }
    let reply: import("./ModelReply").ModelReply;
    try { reply = await this.gateway.generate(request, control); }
    catch { await this.ledger.mutate(ledger => ledger.markUnknown(control.operationId)); return { status: "uncertain", operationId: control.operationId }; }
    if (reply.usage === null) await this.ledger.mutate(ledger => ledger.markUnknown(control.operationId));
    else await this.ledger.mutate(ledger => ledger.settle(control.operationId, { ...zeroUsage, modelCalls: 1,
      inputTokens: reply.usage!.inputTokens, outputTokens: reply.usage!.outputTokens }));
    return { status: "received", reply, stopReason: guard.check() };
  }
}
```

### `tests/fakes/FakeModelGateway.ts`

Returns a configured normalized fixture and counts calls without network or credentials.

```typescript
import type { IModelGateway } from "../../models/contracts/IModelGateway";
import type { ModelRequest } from "../../agentic/model/ModelRequest";
import type { ModelCallControl } from "../../agentic/model/ModelCallControl";
import type { ModelReply } from "../../agentic/model/ModelReply";
export class FakeModelGateway implements IModelGateway {
  private calls = 0;
  constructor(private readonly reply: ModelReply) {}
  async generate(_request: ModelRequest, _control: ModelCallControl): Promise<ModelReply> { this.calls++; return this.reply; }
  count(): number { return this.calls; }
}
```

### `tests/model/checkOpenAiTextMapping.ts`

Checks stable prefix mapping, changing input, cache/usage subsets, refusal, and unsupported response rejection offline.

```typescript
import { OpenAiTextRequestMapper } from "../../agentic/model/openai/OpenAiTextRequestMapper";
import { OpenAiTextReplyMapper } from "../../agentic/model/openai/OpenAiTextReplyMapper";
import type { ModelProfile } from "../../models/ModelProfile";
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
```

### `agentic/model/IModelInputSizer.ts`

Lets the host supply model-compatible token counting plus conservative provider overhead before reservation.

```typescript
import type { ModelRequest } from "./ModelRequest";
export interface IModelInputSizer {
  upperBound(request: Pick<ModelRequest, "instructions" | "messages">): Promise<number>;
}
```

### `index.ts`

Appends the production model API to exports from phases 03–09; does not export test fixtures.

```typescript
export type { ModelMessage } from "./agentic/model/ModelMessage";
export type { ModelRequest } from "./agentic/model/ModelRequest";
export type { ModelCallControl } from "./agentic/model/ModelCallControl";
export type { ModelUsage } from "./agentic/model/ModelUsage";
export type { ModelReply } from "./agentic/model/ModelReply";
export type { ModelProfile } from "./models/ModelProfile";
export type { IModelGateway } from "./models/contracts/IModelGateway";
export type { IModelGatewayFactory } from "./models/contracts/IModelGatewayFactory";
export { ModelGatewayRegistry } from "./models/ModelGatewayRegistry";
export { ModelRequestError } from "./errors/ModelRequestError";
export { ModelRequestValidator } from "./agentic/model/ModelRequestValidator";
export type { OpenAiTextRequest } from "./agentic/model/openai/OpenAiTextRequest";
export type { IOpenAiResponsesTransport } from "./agentic/model/openai/IOpenAiResponsesTransport";
export { OpenAiTextRequestMapper } from "./agentic/model/openai/OpenAiTextRequestMapper";
export { OpenAiTextReplyMapper } from "./agentic/model/openai/OpenAiTextReplyMapper";
export { OpenAiTextGateway } from "./agentic/model/openai/OpenAiTextGateway";
export { OpenAiTextGatewayFactory } from "./agentic/model/openai/OpenAiTextGatewayFactory";
export { OpenAiHttpTransport } from "./agentic/model/openai/OpenAiHttpTransport";
export type { ModelCallOutcome } from "./agentic/model/ModelCallOutcome";
export { BudgetedModelCall } from "./agentic/model/BudgetedModelCall";
export type { IModelInputSizer } from "./agentic/model/IModelInputSizer";
```
