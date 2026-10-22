# 17. Stable Requests and Provider Prompt Caching

## What We Implement Here

Create explicit provider-cache configuration, stable opaque group keys, and a preparation step that adds supported cache metadata to the existing composed request. Use stable serialization on the actual provider transport, retain measured cache-read/write categories on normal replies, and demonstrate two fresh budgeted calls with identical instructions and changed evidence. No answer cache is introduced.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `agentic/model/prompt-cache/PromptCacheConfiguration.ts` | `type PromptCacheConfiguration` |
| `agentic/model/prompt-cache/PromptCachePolicyInput.ts` | `type PromptCachePolicyInput` |
| `agentic/model/prompt-cache/PromptCachePolicyDecision.ts` | `type PromptCachePolicyDecision` |
| `agentic/model/prompt-cache/IPromptCacheKeyDeriver.ts` | `interface IPromptCacheKeyDeriver` |
| `errors/PromptCacheConfigurationError.ts` | `class PromptCacheConfigurationError extends Error` |
| `agentic/model/prompt-cache/HmacPromptCacheKeyDeriver.ts` | `class HmacPromptCacheKeyDeriver implements IPromptCacheKeyDeriver` |
| `agentic/model/prompt-cache/ProviderPromptCachePolicy.ts` | `class ProviderPromptCachePolicy implements IPolicy<PromptCachePolicyInput, PromptCachePolicyDecision>` |
| `agentic/model/prompt-cache/PromptCachePreparedOutcome.ts` | `type PromptCachePreparedOutcome` |
| `agentic/model/prompt-cache/PromptCacheRequestPreparer.ts` | `class PromptCacheRequestPreparer` |
| `agentic/model/openai/OpenAiStableTextSerializer.ts` | `class OpenAiStableTextSerializer` |
| `agentic/model/openai/OpenAiHttpTransport.ts` | `class OpenAiHttpTransport implements IOpenAiResponsesTransport` |
| `agentic/model/ModelUsage.ts` | `type ModelUsage` |
| `agentic/model/openai/OpenAiPromptCacheUsageMapper.ts` | `class OpenAiPromptCacheUsageMapper` |
| `agentic/model/openai/OpenAiTextReplyMapper.ts` | `class OpenAiTextReplyMapper` |
| `agentic/model/prompt-cache/StablePayloadComparison.ts` | `type StablePayloadComparison` |
| `agentic/model/openai/OpenAiPromptCacheInspector.ts` | `class OpenAiPromptCacheInspector` |
| `agentic/model/prompt-cache/PromptCacheUsageSummary.ts` | `type PromptCacheUsageSummary` |
| `agentic/model/prompt-cache/PromptCacheUsageAnalyzer.ts` | `class PromptCacheUsageAnalyzer` |
| `examples/prompt-cache/ProviderPromptCachingExample.ts` | `class ProviderPromptCachingExample` |
| `tests/prompt-cache/checkPromptCacheUsage.ts` | `function checkPromptCacheUsage` |
| `tests/prompt-cache/checkStableSerialization.ts` | `function checkStableSerialization` |
| `tests/prompt-cache/checkPromptCacheKeys.ts` | `function checkPromptCacheKeys` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for shared OOP, file, naming, and writing rules. Every class/interface has its own file; interfaces start with `I`. Cache configuration uses the existing `IPolicy<PromptCachePolicyInput, PromptCachePolicyDecision>`. Keep the one existing model gateway and normal budgeted-call path. Do not introduce an answer-cache store or cached-response executor.
- This phase makes provider prompt caching possible through stable context and provider serialization. It does not reuse a prior model answer, promise a hit, eliminate a model request, relax current permissions, or certify that a response is correct. The existing composer still assembles current evidence and mandatory instructions. Every invocation receives a new operation identity and consumes the ordinary ancestor ledger.
- Provider behavior varies by exact deployment/model. Cache keys are optional controls, not universal prerequisites or guaranteed machine affinity. Read/write metrics and lifetime controls are model-dependent. Validate supported settings against the pinned provider contract; no retention/breakpoint settings or price multipliers are hard-coded here. These distinctions and the mapped usage field names follow [official OpenAI prompt-caching documentation](https://developers.openai.com/api/docs/guides/prompt-caching). The examples use fixture model IDs, not live-model availability or pricing recommendations.
- `provider-default` omits an explicit key and leaves provider defaults in effect. It is not a cache-disable switch. `keyed` requires the selected profile to advertise implemented key support; otherwise preparation returns unsupported. There is no fake disable setting, no unsupported-field fallback, and no extra prewarm request. Provider retention, explicit breakpoints, prewarming, and other controls require separately validated capabilities/adapters, approved data handling, accounting, and contract tests before use.
- Host composition configures the namespace, opaque accounting boundary, and configuration revision. Agent/model text cannot choose another user's group or raise retention policy. `HmacPromptCacheKeyDeriver` binds that partition, the exact profile/provider/model, the actual stable instruction bytes, and instruction version. Use an injected persisted nonextractable signing key shared by the intended host deployment; regenerating it on every turn/restart would change keys. Secret rotation deliberately changes grouping. Do not serialize/export/log the CryptoKey, raw partition inputs, prompts, or derived key material as diagnostics.
- The opaque derived value fits the existing 64-character gateway limit. Stable identical inputs generate the same group key; instruction/model/partition changes generate a different value with normal cryptographic collision assumptions. Key separation is an accounting/routing configuration tool, not application authorization, a guaranteed security isolation boundary, or permission to send otherwise forbidden data. Enforce tenant/project/workspace/provider access independently.
- `PromptCacheRequestPreparer` accepts a trusted in-process result from the same scoped composer and adds only cache metadata. It preserves instruction/message content, order, output cap, token upper bound, profile identity, and source/audit references. A serialized/agent-supplied composed object must be revalidated and recomposed through page 16; this helper is not its authentication boundary. Bind the preparer's host scope and policy partition to the same execution context; do not mix prepared contexts across tenants or sessions.
- Pass the same trusted logical request-byte allocation used by the composer. Adding a key can exceed that allocation, so preparation rechecks bytes and reports a visible limit rather than trimming instructions/evidence. The ordinary validator checks supported key shape and profile constraints. Because cache metadata is not prompt text, the existing compatible input bound is retained; a provider adapter whose extra controls change rendered prompt overhead requires explicit recounting/recomposition before dispatch. Actual network payload bytes remain checked by the gateway/transport.
- `OpenAiStableTextSerializer` is used by the actual HTTP transport, not only by an inspection helper. It reconstructs the supported mapped payload in a fixed field order and preserves input/message contents and sequence. Reject extra unimplemented fields rather than silently discarding meaningful controls. Do not sort conversation items, rewrite authoritative text, merge data into privileged instructions, or remove uncertainty just to make bytes compare equal. Tool definitions, native output schemas, images, and provider continuation need explicit protocol-aware extensions when implemented.
- Three snippets replace existing phase-10 files: `ModelUsage.ts`, `OpenAiHttpTransport.ts`, and `OpenAiTextReplyMapper.ts`. They are full replacement contents, not duplicate declarations or a second provider adapter. Preserve the prior public exports. `ModelUsage` adds optional write metrics so earlier fixture/adapter implementations remain source-compatible; absent added fields mean unknown. Updated OpenAI mapping emits explicit nullable categories while retaining the ordinary reply, cancellation, bounded HTTP, and no-hidden-retry behavior.
- Input/output totals remain the authority for token-budget consumption. Cache read/write categories are subsets of reported input and reasoning is a subset of output; do not subtract reads from input, add writes again to total input, or count reasoning twice. The usage mapper rejects malformed, out-of-range, overlapping known categories or inconsistent lifetime breakdowns. Missing categories remain unknown. A supplied cache key, stable prefix, fast latency, or a successful response is not a measured cache-read receipt. Field semantics follow [the provider's usage guidance](https://developers.openai.com/api/docs/guides/prompt-caching).
- `PromptCacheUsageAnalyzer` reports measured counts and a per-response cached-input fraction only when its numerator/denominator are known and the denominator is nonzero. It does not compute invoice cost or guaranteed savings. Real cost estimation needs a versioned price source plus all relevant categories and deployment terms. Aggregate metrics should sum counts before dividing, rather than average per-request fractions without weighting. Unknown provider usage still retains the normal outstanding reservation/reconciliation behavior.
- `OpenAiPromptCacheInspector` compares bounded serialized bodies transiently and emits only structural booleans/counts. Common JSON-prefix bytes are not model tokens or the provider's internal rendered-cache boundary. Equality of stable text is a regression check, not proof of eligibility, retention, regional reuse, or a hit. Do not persist raw bodies to measure caching. Current source/audit references remain subject to ordinary access and retention controls.
- The two-request example reuses page 16's trusted login guidance and assignment while replacing the dynamic code-r4 observation with code-r5. It prepares both through the same policy/partition and sends each through `BudgetedModelCall` with a distinct operation ID. It stops before a second call if the first is stopped, unavailable, incomplete, refused, or has unknown usage. The pending-operation fixture is illustrative context data, not permission to replay an uncertain write; a live runtime must apply its reconciliation/control policy before dispatch.
- Reusing instructions never justifies reusing the code-r4 answer for code-r5. Even if a provider reports cached input, the framework retains each fresh response, selected provider/model, measured usage, and operation identity separately. Do not reset usage on a cache-policy change, new session, model fallback, retry, handoff, or compaction. No hit assumption reduces a reservation in advance. Cache misses/unavailable cache controls do not lower task acceptance requirements.
- The serializer/inspector deliberately support only the implemented page-10 non-streaming text payload. Prompt caching does not add function tools or structured output. Future protocol-aware caching must preserve actual tool/schema order and all required provider continuation state instead of flattening it into generic text. Page 16 owns logical context structure; adapters own final provider representation and usage mapping. Models/routing do not become another prompt builder.
- Data-processing constraints apply before optimization. An unchanged prefix that is no longer authorized must not be sent. A cache key is not a substitute for permission checks or provider data-retention configuration, and `store: false` is a response-storage choice rather than a general cache-disable control. Keep effective host/provider policies explicit. Do not pad prompts with irrelevant text or add paid warm-up requests merely to manufacture benchmark hits.
- Required operation and usage receipts remain durable independently of optional diagnostics. Log only safe configured identities, bounded structural counters, and normalized known/unknown usage under explicit event schemas. Do not log credentials, prompt bodies, sensitive partition IDs, private reasoning, cache keys, or raw provider errors. A diagnostics failure cannot replace a task outcome or silently skip accounting.
- Offline verification covers deterministic keys, boundary/model/instruction changes, unsupported key configuration, provider-default omission, unchanged prompts after metadata insertion, logical byte limits, final transport serialization, distinct fresh requests, full-token accounting despite reported reads, write-category validation, unknown usage, and cancellation/deadline. Fake cache-read metrics demonstrate normalization only. Only a separately authorized live provider contract test can measure actual cache behavior for the deployment, and any such test still uses normal budgets and fresh operations.

## TypeScript Code for Each File

### `agentic/model/prompt-cache/PromptCacheConfiguration.ts`

Uses an explicit provider-default or keyed mode with a stable host-assigned accounting boundary; it never configures answer reuse.

```typescript
export type PromptCacheConfiguration = Readonly<{ mode: "provider-default" | "keyed"; namespace: string; boundaryRef: string; revision: string }>;
```

### `agentic/model/prompt-cache/PromptCachePolicyInput.ts`

Supplies the exact selected profile and stable instruction content for key preparation; dynamic evidence is excluded.

```typescript
import type { ModelProfile } from "../../../models/ModelProfile";
export type PromptCachePolicyInput = Readonly<{ profile: ModelProfile; instructionRevision: string; instructions: string }>;
```

### `agentic/model/prompt-cache/PromptCachePolicyDecision.ts`

Separates omitted provider controls, a supported stable key, and unsupported requested configuration.

```typescript
export type PromptCachePolicyDecision =
  | Readonly<{ kind: "provider-default" }>
  | Readonly<{ kind: "keyed"; key: string }>
  | Readonly<{ kind: "unsupported"; code: "PROMPT_CACHE_KEY_UNSUPPORTED" }>;
```

### `agentic/model/prompt-cache/IPromptCacheKeyDeriver.ts`

Hides key derivation behind an injected capability without exposing host secrets in requests or serialized configuration.

```typescript
import type { PromptCacheConfiguration } from "./PromptCacheConfiguration";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput";
export interface IPromptCacheKeyDeriver { derive(configuration: PromptCacheConfiguration, input: PromptCachePolicyInput): Promise<string>; }
```

### `errors/PromptCacheConfigurationError.ts`

Reports unsupported or malformed cache configuration with a fixed safe message and no prompt/key contents.

```typescript
export class PromptCacheConfigurationError extends Error {
  readonly code = "PROMPT_CACHE_CONFIGURATION_INVALID";
  constructor() { super("Provider prompt-cache configuration or prepared request is invalid."); this.name = "PromptCacheConfigurationError"; }
}
```

### `agentic/model/prompt-cache/HmacPromptCacheKeyDeriver.ts`

Derives a stable bounded opaque key from host partition, exact profile, and actual stable instructions using an injected nonextractable HMAC key.

```typescript
import type { IPromptCacheKeyDeriver } from "./IPromptCacheKeyDeriver";
import type { PromptCacheConfiguration } from "./PromptCacheConfiguration";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError";
export class HmacPromptCacheKeyDeriver implements IPromptCacheKeyDeriver {
  constructor(private readonly crypto: Pick<Crypto, "subtle">, private readonly secret: CryptoKey) {
    const algorithm = secret.algorithm as HmacKeyAlgorithm;
    if (secret.type !== "secret" || secret.extractable || algorithm.name !== "HMAC" || algorithm.hash?.name !== "SHA-256" || !secret.usages.includes("sign")) throw new PromptCacheConfigurationError();
  }
  async derive(configuration: PromptCacheConfiguration, input: PromptCachePolicyInput): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify({ format: 1, namespace: configuration.namespace, boundaryRef: configuration.boundaryRef,
      configurationRevision: configuration.revision, providerId: input.profile.providerId, modelId: input.profile.modelId,
      profileId: input.profile.id, instructionRevision: input.instructionRevision, instructions: input.instructions }));
    if (data.byteLength > 262144) throw new PromptCacheConfigurationError();
    const signature = new Uint8Array(await this.crypto.subtle.sign("HMAC", this.secret, data));
    // 240 retained HMAC bits plus the format prefix fit the existing gateway's 64-character key bound.
    return "pc1_" + [...signature].map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 60);
  }
}
```

### `agentic/model/prompt-cache/ProviderPromptCachePolicy.ts`

Applies trusted cache configuration through the shared policy interface and refuses unsupported key controls rather than silently dropping them.

```typescript
import type { IPolicy } from "../../../contracts/IPolicy";
import type { PromptCacheConfiguration } from "./PromptCacheConfiguration";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput";
import type { PromptCachePolicyDecision } from "./PromptCachePolicyDecision";
import type { IPromptCacheKeyDeriver } from "./IPromptCacheKeyDeriver";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError";
export class ProviderPromptCachePolicy implements IPolicy<PromptCachePolicyInput, PromptCachePolicyDecision> {
  private readonly configuration: PromptCacheConfiguration;
  constructor(configuration: PromptCacheConfiguration, private readonly keys: IPromptCacheKeyDeriver | null = null) {
    if (!["provider-default", "keyed"].includes(configuration.mode) || ![configuration.namespace, configuration.boundaryRef, configuration.revision].every(value => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value))) throw new PromptCacheConfigurationError();
    if (configuration.mode === "keyed" && keys === null) throw new PromptCacheConfigurationError();
    this.configuration = Object.freeze({ ...configuration });
  }
  async apply(input: PromptCachePolicyInput): Promise<PromptCachePolicyDecision> {
    if (this.configuration.mode === "provider-default") return { kind: "provider-default" };
    if (!input.profile.supportsPromptCacheKey) return { kind: "unsupported", code: "PROMPT_CACHE_KEY_UNSUPPORTED" };
    if (this.keys === null) throw new PromptCacheConfigurationError();
    const key = await this.keys.derive(this.configuration, input);
    if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key)) throw new PromptCacheConfigurationError();
    return Object.freeze({ kind: "keyed", key });
  }
}
```

### `agentic/model/prompt-cache/PromptCachePreparedOutcome.ts`

Returns the unchanged prompt with supported cache metadata, or an explicit unsupported/size/control outcome.

```typescript
import type { ComposedAgentContext } from "../../context/ComposedAgentContext";
import type { ExecutionStopReason } from "../../../execution-control/ExecutionStopReason";
export type PromptCachePreparedOutcome =
  | Readonly<{ status: "ready"; context: ComposedAgentContext }>
  | Readonly<{ status: "unsupported"; code: "PROMPT_CACHE_KEY_UNSUPPORTED" }>
  | Readonly<{ status: "limit-reached"; code: "CACHE_METADATA_EXCEEDS_REQUEST_LIMIT" }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>;
```

### `agentic/model/prompt-cache/PromptCacheRequestPreparer.ts`

Adds cache metadata after composition without rewriting, retrieving, summarizing, or reusing any prompt/response content.

```typescript
import type { IPolicy } from "../../../contracts/IPolicy";
import type { IClock } from "../../../contracts/runtime/IClock";
import type { ExecutionScopeRef } from "../../../contracts/runtime/ExecutionScopeRef";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext";
import type { ComposedAgentContext } from "../../context/ComposedAgentContext";
import type { PromptCachePolicyInput } from "./PromptCachePolicyInput";
import type { PromptCachePolicyDecision } from "./PromptCachePolicyDecision";
import type { PromptCachePreparedOutcome } from "./PromptCachePreparedOutcome";
import { ModelRequestValidator } from "../ModelRequestValidator";
import { ExecutionBoundaryGuard } from "../../../execution-control/ExecutionBoundaryGuard";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError";
export class PromptCacheRequestPreparer {
  private readonly scope: ExecutionScopeRef;
  constructor(scope: ExecutionScopeRef, private readonly maxRequestBytes: number,
    private readonly policy: IPolicy<PromptCachePolicyInput, PromptCachePolicyDecision>,
    private readonly validator: ModelRequestValidator, private readonly clock: IClock) {
    if (!Number.isSafeInteger(maxRequestBytes) || maxRequestBytes < 1) throw new PromptCacheConfigurationError();
    this.scope = Object.freeze({ ...scope });
  }
  async prepare(composed: ComposedAgentContext, context: IExecutionContext): Promise<PromptCachePreparedOutcome> {
    if (context.scope.scopeId !== this.scope.scopeId || context.scope.projectId !== this.scope.projectId || context.scope.workspaceId !== this.scope.workspaceId || this.maxRequestBytes > composed.profile.maxRequestBytes) throw new PromptCacheConfigurationError();
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const before = controls.check(); if (before !== null) return { status: "stopped", reason: before };
    const decision = await this.policy.apply(Object.freeze({ profile: composed.profile, instructionRevision: composed.instructionRevision, instructions: composed.request.instructions }));
    const after = controls.check(); if (after !== null) return { status: "stopped", reason: after };
    if (decision.kind === "unsupported") return { status: "unsupported", code: decision.code };
    const request = Object.freeze({ ...composed.request, promptCacheKey: decision.kind === "keyed" ? decision.key : null });
    if (new TextEncoder().encode(JSON.stringify(request)).byteLength > this.maxRequestBytes) return { status: "limit-reached", code: "CACHE_METADATA_EXCEEDS_REQUEST_LIMIT" };
    const validated = this.validator.validate(request, composed.profile);
    return Object.freeze({ status: "ready", context: Object.freeze({ ...composed, request: validated }) });
  }
}
```

### `agentic/model/openai/OpenAiStableTextSerializer.ts`

Serializes the supported mapped text payload with fixed field order, preserving message/content order and rejecting unimplemented extra controls.

```typescript
import type { OpenAiTextRequest } from "./OpenAiTextRequest";
import { ModelRequestError } from "../../../errors/ModelRequestError";
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
```

### `agentic/model/openai/OpenAiHttpTransport.ts`

Replaces the phase-10 file to use the stable serializer on the actual bounded HTTP path; credential handling, one-attempt behavior, and response limits stay intact.

```typescript
import { OpenAiStableTextSerializer } from "./OpenAiStableTextSerializer";
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport";
import type { OpenAiTextRequest } from "./OpenAiTextRequest";
import { ModelRequestError } from "../../../errors/ModelRequestError";
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
```

### `agentic/model/ModelUsage.ts`

Replaces the phase-10 type with backward-compatible optional cache-write breakdowns; omitted or null metrics remain unknown, never zero.

```typescript
export type ModelUsage = Readonly<{ inputTokens: number; outputTokens: number; cachedInputTokens: number | null; reasoningTokens: number | null;
  cacheWriteTokens?: number | null; cacheWriteTtl30mTokens?: number | null; cacheWriteTtl12hTokens?: number | null }>;
```

### `agentic/model/openai/OpenAiPromptCacheUsageMapper.ts`

Validates reported usage totals and optional cache-read/write/lifetime subsets without inferring charges from key reuse or prompt similarity.

```typescript
import type { ModelUsage } from "../ModelUsage";
export class OpenAiPromptCacheUsageMapper {
  map(value: unknown): ModelUsage | null {
    if (!this.record(value) || !this.count(value.input_tokens) || !this.count(value.output_tokens)) return null;
    const input = this.record(value.input_tokens_details) ? value.input_tokens_details : {};
    const output = this.record(value.output_tokens_details) ? value.output_tokens_details : {};
    const cached = input.cached_tokens ?? null, writes = input.cache_write_tokens ?? null, reasoning = output.reasoning_tokens ?? null;
    if (!this.optional(cached, value.input_tokens) || !this.optional(writes, value.input_tokens) || !this.optional(reasoning, value.output_tokens) ||
        (typeof cached === "number" && typeof writes === "number" && cached > value.input_tokens - writes)) return null;
    let short: number | null = null, long: number | null = null;
    if (input.cache_write_tokens_details !== undefined && input.cache_write_tokens_details !== null) {
      if (!this.record(input.cache_write_tokens_details) || !this.count(input.cache_write_tokens_details.ttl_30m_tokens) || !this.count(input.cache_write_tokens_details.ttl_12h_tokens) || typeof writes !== "number") return null;
      short = input.cache_write_tokens_details.ttl_30m_tokens; long = input.cache_write_tokens_details.ttl_12h_tokens;
      if (short > writes || long !== writes - short) return null;
    }
    return Object.freeze({ inputTokens: value.input_tokens, outputTokens: value.output_tokens, cachedInputTokens: cached as number | null,
      reasoningTokens: reasoning as number | null, cacheWriteTokens: writes as number | null, cacheWriteTtl30mTokens: short, cacheWriteTtl12hTokens: long });
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
  private optional(value: unknown, total: number): boolean { return value === null || (this.count(value) && value <= total); }
}
```

### `agentic/model/openai/OpenAiTextReplyMapper.ts`

Replaces the phase-10 file to retain normalized cache-write metrics on the ordinary gateway reply; text/refusal/protocol handling is preserved.

```typescript
import { OpenAiPromptCacheUsageMapper } from "./OpenAiPromptCacheUsageMapper";
import type { ModelReply } from "../ModelReply";
import type { ModelUsage } from "../ModelUsage";
import type { ModelProfile } from "../../../models/ModelProfile";
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
```

### `agentic/model/prompt-cache/StablePayloadComparison.ts`

Reports structural byte comparisons only; these values are not a provider tokenizer measurement or cache-hit receipt.

```typescript
export type StablePayloadComparison = Readonly<{ sameModel: boolean; sameInstructions: boolean; sameCacheKey: boolean; equalLeadingInputItems: number; commonSerializedPrefixBytes: number }>;
```

### `agentic/model/openai/OpenAiPromptCacheInspector.ts`

Compares bounded final serialized payloads transiently without persisting prompts or treating similarity as provider reuse.

```typescript
import type { OpenAiTextRequest } from "./OpenAiTextRequest";
import type { StablePayloadComparison } from "../prompt-cache/StablePayloadComparison";
import { OpenAiStableTextSerializer } from "./OpenAiStableTextSerializer";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError";
export class OpenAiPromptCacheInspector {
  constructor(private readonly serializer: OpenAiStableTextSerializer, private readonly maxBytes: number) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1048576) throw new PromptCacheConfigurationError();
  }
  compare(first: OpenAiTextRequest, second: OpenAiTextRequest): StablePayloadComparison {
    const a = new TextEncoder().encode(this.serializer.serialize(first)), b = new TextEncoder().encode(this.serializer.serialize(second));
    if (a.byteLength > this.maxBytes || b.byteLength > this.maxBytes) throw new PromptCacheConfigurationError();
    let prefix = 0; while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
    let equalInputs = 0;
    while (equalInputs < first.input.length && equalInputs < second.input.length && JSON.stringify(first.input[equalInputs]) === JSON.stringify(second.input[equalInputs])) equalInputs++;
    return Object.freeze({ sameModel: first.model === second.model, sameInstructions: first.instructions === second.instructions,
      sameCacheKey: first.prompt_cache_key === second.prompt_cache_key, equalLeadingInputItems: equalInputs, commonSerializedPrefixBytes: prefix });
  }
}
```

### `agentic/model/prompt-cache/PromptCacheUsageSummary.ts`

Keeps unknown metrics explicit and separates measured cache categories from total input consumption.

```typescript
export type PromptCacheUsageSummary =
  | Readonly<{ status: "unknown" }>
  | Readonly<{ status: "measured"; inputTokens: number; cachedInputTokens: number | null; cacheWriteTokens: number | null; cachedInputFraction: number | null }>;
```

### `agentic/model/prompt-cache/PromptCacheUsageAnalyzer.ts`

Computes a per-reply measured cache-read fraction without guessing unknown values, subtracting budget usage, or claiming monetary savings.

```typescript
import type { ModelUsage } from "../ModelUsage";
import type { PromptCacheUsageSummary } from "./PromptCacheUsageSummary";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError";
export class PromptCacheUsageAnalyzer {
  summarize(usage: ModelUsage | null): PromptCacheUsageSummary {
    if (usage === null) return { status: "unknown" };
    const cached = usage.cachedInputTokens, writes = usage.cacheWriteTokens ?? null;
    if (!Number.isSafeInteger(usage.inputTokens) || usage.inputTokens < 0 || !this.part(cached, usage.inputTokens) || !this.part(writes, usage.inputTokens)) throw new PromptCacheConfigurationError();
    return Object.freeze({ status: "measured", inputTokens: usage.inputTokens, cachedInputTokens: cached, cacheWriteTokens: writes,
      cachedInputFraction: cached === null || usage.inputTokens === 0 ? null : cached / usage.inputTokens });
  }
  private part(value: number | null, total: number): boolean { return value === null || (Number.isSafeInteger(value) && value >= 0 && value <= total); }
}
```

### `examples/prompt-cache/ProviderPromptCachingExample.ts`

Builds and sends two separate budgeted requests for the page-16 login snapshots, then compares their mapped stable structure.

```typescript
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import { AgentContextComposer } from "../../agentic/context/AgentContextComposer";
import { PromptCacheRequestPreparer } from "../../agentic/model/prompt-cache/PromptCacheRequestPreparer";
import { BudgetedModelCall } from "../../agentic/model/BudgetedModelCall";
import { OpenAiTextRequestMapper } from "../../agentic/model/openai/OpenAiTextRequestMapper";
import { OpenAiPromptCacheInspector } from "../../agentic/model/openai/OpenAiPromptCacheInspector";
import { PromptCacheUsageAnalyzer } from "../../agentic/model/prompt-cache/PromptCacheUsageAnalyzer";
import { createLoginContextFixture } from "../context/createLoginContextFixture";
export class ProviderPromptCachingExample {
  constructor(private readonly composer: AgentContextComposer, private readonly cache: PromptCacheRequestPreparer,
    private readonly calls: BudgetedModelCall, private readonly mapper: OpenAiTextRequestMapper,
    private readonly inspector: OpenAiPromptCacheInspector, private readonly usage: PromptCacheUsageAnalyzer,
    private readonly ids: IIdGenerator) {}
  async run(context: IExecutionContext) {
    const fixture = createLoginContextFixture();
    const firstComposed = await this.composer.compose(fixture.first, context);
    if (firstComposed.status !== "ready") return { stage: "first-composition" as const, outcome: firstComposed };
    const firstPrepared = await this.cache.prepare(firstComposed.context, context);
    if (firstPrepared.status !== "ready") return { stage: "first-cache-policy" as const, outcome: firstPrepared };
    const first = await this.calls.run(firstPrepared.context.request, { operationId: this.ids.nextId(), signal: context.signal, deadlineEpochMs: context.deadlineEpochMs, timeoutMs: 1000 });
    if (first.status !== "received" || first.stopReason !== null || first.reply.usage === null || first.reply.status !== "completed") return { stage: "first-call" as const, outcome: first };
    const secondComposed = await this.composer.compose(fixture.second, context);
    if (secondComposed.status !== "ready") return { stage: "second-composition" as const, first, outcome: secondComposed };
    const secondPrepared = await this.cache.prepare(secondComposed.context, context);
    if (secondPrepared.status !== "ready") return { stage: "second-cache-policy" as const, first, outcome: secondPrepared };
    const second = await this.calls.run(secondPrepared.context.request, { operationId: this.ids.nextId(), signal: context.signal, deadlineEpochMs: context.deadlineEpochMs, timeoutMs: 1000 });
    const a = this.mapper.map(firstPrepared.context.request, firstPrepared.context.profile.modelId);
    const b = this.mapper.map(secondPrepared.context.request, secondPrepared.context.profile.modelId);
    return Object.freeze({ stage: "attempted" as const, first, second, comparison: this.inspector.compare(a, b),
      firstUsage: this.usage.summarize(first.reply.usage), secondUsage: second.status === "received" ? this.usage.summarize(second.reply.usage) : { status: "unknown" as const } });
  }
}
```

### `tests/prompt-cache/checkPromptCacheUsage.ts`

Checks known/unknown read/write metrics, lifetime breakdown consistency, budget-total semantics, and malformed provider usage rejection.

```typescript
import { OpenAiPromptCacheUsageMapper } from "../../agentic/model/openai/OpenAiPromptCacheUsageMapper";
import { PromptCacheUsageAnalyzer } from "../../agentic/model/prompt-cache/PromptCacheUsageAnalyzer";
export function checkPromptCacheUsage(): void {
  const mapper = new OpenAiPromptCacheUsageMapper();
  const usage = mapper.map({ input_tokens: 1000, output_tokens: 100, input_tokens_details: { cached_tokens: 300, cache_write_tokens: 400, cache_write_tokens_details: { ttl_30m_tokens: 100, ttl_12h_tokens: 300 } }, output_tokens_details: { reasoning_tokens: 20 } });
  if (usage === null || usage.inputTokens !== 1000 || usage.cachedInputTokens !== 300 || usage.cacheWriteTokens !== 400 || usage.cacheWriteTtl12hTokens !== 300 || usage.outputTokens !== 100) throw new Error("Cache categories altered totals.");
  const summary = new PromptCacheUsageAnalyzer().summarize(usage);
  if (summary.status !== "measured" || summary.cachedInputFraction !== 0.3) throw new Error("Measured fraction invalid.");
  const unknown = mapper.map({ input_tokens: 1000, output_tokens: 100 });
  if (unknown?.cachedInputTokens !== null || unknown.cacheWriteTokens !== null) throw new Error("Absent categories became zero.");
  if (mapper.map({ input_tokens: 100, output_tokens: 10, input_tokens_details: { cached_tokens: 80, cache_write_tokens: 40 } }) !== null) throw new Error("Overlapping impossible categories accepted.");
  if (mapper.map({ input_tokens: 100, output_tokens: 10, input_tokens_details: { cache_write_tokens: 50, cache_write_tokens_details: { ttl_30m_tokens: 30, ttl_12h_tokens: 30 } } }) !== null) throw new Error("Invalid write breakdown accepted.");
}
```

### `tests/prompt-cache/checkStableSerialization.ts`

Checks final field-order stability, preserved input sequence, changed evidence, and rejection of unsupported cache controls.

```typescript
import { OpenAiStableTextSerializer } from "../../agentic/model/openai/OpenAiStableTextSerializer";
import { OpenAiPromptCacheInspector } from "../../agentic/model/openai/OpenAiPromptCacheInspector";
import { OpenAiTextRequestMapper } from "../../agentic/model/openai/OpenAiTextRequestMapper";
export function checkStableSerialization(): void {
  const mapper = new OpenAiTextRequestMapper();
  const first = mapper.map({ instructions: "Stable guard instructions v1", messages: [{ role: "user", text: "Review login." }, { role: "user", text: "code-r4" }], maxOutputTokens: 100, inputTokenUpperBound: 500, promptCacheKey: "fixture-group-v1" }, "fixture-model");
  const second = { ...first, input: [first.input[0], { role: "user" as const, content: "code-r5" }] };
  const serializer = new OpenAiStableTextSerializer();
  const reordered = { truncation: first.truncation, stream: first.stream, store: first.store, max_output_tokens: first.max_output_tokens, input: first.input, instructions: first.instructions, model: first.model, prompt_cache_key: first.prompt_cache_key };
  if (serializer.serialize(first) !== serializer.serialize(reordered)) throw new Error("Property insertion order changed the wire payload.");
  const compared = new OpenAiPromptCacheInspector(serializer, 8192).compare(first, second);
  if (!compared.sameInstructions || !compared.sameCacheKey || compared.equalLeadingInputItems !== 1 || compared.commonSerializedPrefixBytes <= 0) throw new Error("Stable/dynamic comparison failed.");
  let rejected = false; try { serializer.serialize({ ...first, unsupportedControl: true } as typeof first); } catch { rejected = true; }
  if (!rejected) throw new Error("Unsupported provider control silently dropped.");
}
```

### `tests/prompt-cache/checkPromptCacheKeys.ts`

Uses an injected WebCrypto implementation to test stable opaque grouping and rotation across changed boundaries, models, and instruction content.

```typescript
import { HmacPromptCacheKeyDeriver } from "../../agentic/model/prompt-cache/HmacPromptCacheKeyDeriver";
import { ProviderPromptCachePolicy } from "../../agentic/model/prompt-cache/ProviderPromptCachePolicy";
export async function checkPromptCacheKeys(crypto: Crypto): Promise<void> {
  const secret = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign"]);
  const keys = new HmacPromptCacheKeyDeriver(crypto, secret);
  const configuration = { mode: "keyed" as const, namespace: "fixture", boundaryRef: "user-group-one", revision: "v1" };
  const profile = { id: "fixture", providerId: "openai", modelId: "fixture-model", contextTokens: 20000, maxOutputTokens: 1000, maxRequestBytes: 65536, maxResponseBytes: 65536, supportsPromptCacheKey: true };
  const input = { profile, instructionRevision: "v1", instructions: "Stable instructions." };
  const first = await keys.derive(configuration, input), repeated = await keys.derive(configuration, input);
  if (first !== repeated || first.length !== 64 || first.includes(configuration.boundaryRef)) throw new Error("Stable opaque cache key failed.");
  if (first === await keys.derive({ ...configuration, boundaryRef: "user-group-two" }, input) || first === await keys.derive(configuration, { ...input, instructions: "Changed instructions." }) ||
      first === await keys.derive(configuration, { ...input, profile: { ...profile, modelId: "different-model" } })) throw new Error("Cache key ignored boundary/content/model changes.");
  if ((await new ProviderPromptCachePolicy({ ...configuration, mode: "provider-default" }).apply(input)).kind !== "provider-default") throw new Error("Provider-default mode required a key.");
  if ((await new ProviderPromptCachePolicy(configuration, keys).apply({ ...input, profile: { ...profile, supportsPromptCacheKey: false } })).kind !== "unsupported") throw new Error("Unsupported key control not rejected.");
}
```

### `index.ts`

Appends new production cache contracts/helpers; preserve the existing exports for the three replaced phase-10 files.

```typescript
export type { PromptCacheConfiguration } from "./agentic/model/prompt-cache/PromptCacheConfiguration";
export type { PromptCachePolicyInput } from "./agentic/model/prompt-cache/PromptCachePolicyInput";
export type { PromptCachePolicyDecision } from "./agentic/model/prompt-cache/PromptCachePolicyDecision";
export type { IPromptCacheKeyDeriver } from "./agentic/model/prompt-cache/IPromptCacheKeyDeriver";
export { PromptCacheConfigurationError } from "./errors/PromptCacheConfigurationError";
export { HmacPromptCacheKeyDeriver } from "./agentic/model/prompt-cache/HmacPromptCacheKeyDeriver";
export { ProviderPromptCachePolicy } from "./agentic/model/prompt-cache/ProviderPromptCachePolicy";
export type { PromptCachePreparedOutcome } from "./agentic/model/prompt-cache/PromptCachePreparedOutcome";
export { PromptCacheRequestPreparer } from "./agentic/model/prompt-cache/PromptCacheRequestPreparer";
export { OpenAiStableTextSerializer } from "./agentic/model/openai/OpenAiStableTextSerializer";
export { OpenAiPromptCacheUsageMapper } from "./agentic/model/openai/OpenAiPromptCacheUsageMapper";
export type { StablePayloadComparison } from "./agentic/model/prompt-cache/StablePayloadComparison";
export { OpenAiPromptCacheInspector } from "./agentic/model/openai/OpenAiPromptCacheInspector";
export type { PromptCacheUsageSummary } from "./agentic/model/prompt-cache/PromptCacheUsageSummary";
export { PromptCacheUsageAnalyzer } from "./agentic/model/prompt-cache/PromptCacheUsageAnalyzer";
```
