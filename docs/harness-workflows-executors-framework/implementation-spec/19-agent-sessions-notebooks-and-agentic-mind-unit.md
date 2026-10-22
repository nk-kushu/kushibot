# 19. Agent Sessions, Notebooks, and AgenticMindUnit

## What We Implement Here

Create a fresh isolated AgenticSession for each AgenticMindUnit invocation. Implement a bounded working notebook and the model → validated action → authorized tool → observation loop, with shared budgets and explicit completion acceptance. Connect the existing context composer, provider prompt-cache preparation, and budgeted model gateway. Define the required host factory, context-publication and session-journal contracts; durable adapters and recovery remain separate implementation work.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `agentic/sessions/NotebookEntry.ts` | `type NotebookEntry` |
| `agentic/sessions/NotebookSnapshot.ts` | `type NotebookSnapshot` |
| `errors/AgentSessionError.ts` | `class AgentSessionError extends Error` |
| `agentic/sessions/DraftNotebook.ts` | `class DraftNotebook` |
| `agentic/sessions/AgentAction.ts` | `type AgentAction` |
| `agentic/sessions/AgentActionParser.ts` | `class AgentActionParser` |
| `agentic/sessions/SessionView.ts` | `type SessionView` |
| `agentic/sessions/IAgentContextSource.ts` | `interface IAgentContextSource` |
| `agentic/sessions/CompletionInput.ts` | `type CompletionInput<TResult>` |
| `agentic/sessions/CompletionDecision.ts` | `type CompletionDecision` |
| `agentic/sessions/AgentTurnOutcome.ts` | `type AgentTurnOutcome` |
| `agentic/sessions/IAgentTurn.ts` | `interface IAgentTurn` |
| `agentic/sessions/ComposedAgentTurn.ts` | `class ComposedAgentTurn implements IAgentTurn` |
| `agentic/sessions/ISessionJournal.ts` | `interface ISessionJournal` |
| `agentic/sessions/IAgentToolCall.ts` | `interface IAgentToolCall` |
| `agentic/sessions/AgenticSession.ts` | `class AgenticSession<TResult>` |
| `agentic/sessions/IAgenticSessionFactory.ts` | `interface IAgenticSessionFactory<TResult>` |
| `agentic/sessions/AgenticMindUnit.ts` | `class AgenticMindUnit<TResult>` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [01](01-scope-and-implementation-roadmap.md) and [02](02-package-structure-and-oop-conventions.md) for general OOP and writing rules. Each class/interface has its own file; interfaces start with `I`. Completion uses the shared `IPolicy<CompletionInput<TResult>, CompletionDecision>`.
- One invocation owns one fresh session and notebook. The host supplies a unique session ID, immutable assignment binding, scoped journal, shared run ledger, and fresh operation-ID generator. A model profile, gateway, context composer and cache preparer must agree and stay pinned throughout the session. Route/model changes require a new session and an explicit handoff, never mutation of a shared runner.
- The existing gateway supports text, not native provider function-call conversations. This phase uses one strict JSON action per text reply: `{"kind":"note","entry":{"text":"Expiry check pending","evidenceRefs":[]}}`, `{"kind":"tool","toolId":"read-source","arguments":{...}}`, or `{"kind":"final","value":{...}}`. The authorized context source supplies exact allowed tool schemas and protocol instructions. Untrusted output is parsed, bounded and checked before use. Provider-native tool call IDs, tool-role messages and continuation require a later explicit gateway/adapter extension.
- The action discriminant is a closed data-protocol decoder and a small orchestration state machine; tool behavior remains polymorphic through the existing registry/dispatcher, provider behavior through gateway adapters, and acceptance through an injected policy. Do not grow provider/tool-name switches in this loop.
- `IAgentContextSource`, `ISessionJournal`, and `IAgenticSessionFactory` are required host integration contracts, not working production adapters in this page. The runtime is deliberately unusable without implementations. Context publication includes authorization, immutable snapshot identity, provenance, required fragments, actual rules, latest journal observations, authoritative unresolved/pending operations, and notebook-reference verification. Notebook text is untrusted working data and never privileged instructions or accepted memory. A notebook does not store private chain of thought.
- The context source must return all outstanding operation references. The supplied turn adapter stops when any exist. Its outcome carries the complete pending list into the stopped result, while the durable journal retains the authoritative records. A host restoring work must preserve that complete list. This loop only starts fresh sessions; it does not implement resume, takeover, checkpoint loading, or the page-18 durable snapshot publisher. Those require the checkpoint/recovery implementation and cannot be claimed from these interfaces.
- Journal `begin` atomically rejects reused session IDs. `pending` durably claims operation IDs before dispatch; `resolved` durably records known output before clearing pending state. `finish` preserves the bounded view and terminal result. Journal writes are required even with logging disabled. Implementations enforce scope, expected state/version, bounded codecs, receipts and conflict handling. An in-memory fake proves no durability. Separate journal, tool-journal and usage-ledger calls are not one atomic transaction; crash gaps remain pending for reconciliation and are never an automatic permission to retry an effect.
- Required persistence failures and unexpected dependency exceptions propagate; they are not transformed into success. A caller must use the journal to recover the last durable view and unresolved operations. No claim is made that a rejected promise includes a durably committed terminal result. Stop outcomes are returned only after `finish` succeeds. After an uncertain effect the loop neither retries nor emits an extra closing model call.
- Each admitted loop turn consumes one shared-ledger iteration, including a failed/invalid-output turn. Model calls/input/output and tools use the existing budgeted implementations separately. An already charged iteration ID does not authorize replay. Counting may conservatively retain an iteration after a crash before dispatch. Limits, cancellation and deadlines preserve collected work; never reset the run ledger for another session, model or sub-agent. No final free inference is allowed after exhaustion.
- Tool operation IDs come from the host, not the model, and match `context.identity.operationId`; the parent is the session invocation. The existing ToolDispatcher performs argument validation, authorization, allowance, durable effect receipts and uncertainty handling. Editing tools additionally use the page-14 workspace editor. Sequential editing remains the default; separate sessions do not isolate files. Sub-agent creation and orchestration belong to page 20.
- A note is a proposed public finding, not verified evidence. The loop deliberately does not promote model-supplied evidence strings into `PartialProgress.evidenceRefs`. They remain in the notebook/journal for an authorized verifier. The context source checks them before reuse and the completion policy checks them before accepting claims. Required goals/open questions remain in authoritative assignment state; notes cannot mark them resolved.
- Result-contract validation checks shape. Independent completion acceptance checks actual criteria, guard results, current source revisions, tool receipts, and unresolved effects. A model saying “done”, a valid JSON object, a successful tool call, or a notebook claim does not establish completion. Rejections become bounded data for another charged turn. Local maxTurns also bounds repeated notes/rejections, preventing an unlimited no-progress loop.
- The last observation is intentionally one bounded view item, not the full history. The journal stores model actions/tool outcomes; the context source selects required history and optional excerpts using page 16, and may explicitly integrate page 18 compression. This page performs no automatic compression and no answer caching. Stable instructions/tool schemas remain stable across turns where meaningful; changing observations enter dynamic context. Each turn generates a fresh answer through the provider adapter and accounts for normal usage, including cached input.
- Example: the login session requests `read-source`, receives the saved observation, records “Expiry check pending”, and proposes a result. Acceptance rejects it because the expiry check receipt is missing. On the next admitted turn a permitted check tool produces a receipt; the context source verifies that receipt, and acceptance can then approve a corrected result. If the budget ends earlier, the parent receives an explicit stopped outcome and the journal retains the read result and pending verification; the parent may report progress or schedule authorized continuation instead of treating the assignment as complete.

## TypeScript Code for Each File

### `agentic/sessions/NotebookEntry.ts`

Stores a public finding or next action, never hidden chain of thought. References remain untrusted until the host verifies them.

```typescript
export type NotebookEntry = Readonly<{ text: string; evidenceRefs: readonly string[] }>;
```

### `agentic/sessions/NotebookSnapshot.ts`

Captures bounded session-local working notes. It does not replace the assignment, operation journal, conversation, or durable memory.

```typescript
import type { NotebookEntry } from "./NotebookEntry";
export type NotebookSnapshot = Readonly<{ entries: readonly NotebookEntry[] }>;
```

### `errors/AgentSessionError.ts`

Signals an invalid trusted session configuration or an attempt to reuse a running/finished session.

```typescript
export class AgentSessionError extends Error {
  readonly code = "AGENT_SESSION_INVALID";
  constructor() { super("Agent session configuration or lifecycle is invalid."); this.name = "AgentSessionError"; }
}
```

### `agentic/sessions/DraftNotebook.ts`

Owns copied, immutable public notes with explicit entry and byte bounds. A full notebook rejects the new entry without deleting collected work.

```typescript
import type { NotebookEntry } from "./NotebookEntry";
import type { NotebookSnapshot } from "./NotebookSnapshot";
import { AgentSessionError } from "../../errors/AgentSessionError";
export class DraftNotebook {
  private readonly entries: NotebookEntry[] = [];
  constructor(private readonly maxEntries = 16, private readonly maxBytes = 16384) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 32 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 32768) throw new AgentSessionError();
  }
  append(entry: NotebookEntry): boolean {
    if (typeof entry.text !== "string" || !entry.text.trim() || entry.text.length > 2048 || !Array.isArray(entry.evidenceRefs) || entry.evidenceRefs.length > 8 || entry.evidenceRefs.some(ref => typeof ref !== "string" || !ref || ref.length > 256)) return false;
    const copy = Object.freeze({ text: entry.text, evidenceRefs: Object.freeze([...new Set(entry.evidenceRefs)]) });
    if (this.entries.length >= this.maxEntries || new TextEncoder().encode(JSON.stringify([...this.entries, copy])).byteLength > this.maxBytes) return false;
    this.entries.push(copy); return true;
  }
  snapshot(): NotebookSnapshot { return Object.freeze({ entries: Object.freeze([...this.entries]) }); }
}
```

### `agentic/sessions/AgentAction.ts`

Defines exactly one text-JSON action per turn. A tool action requests execution; it grants no permission.

```typescript
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { NotebookEntry } from "./NotebookEntry";
export type AgentAction =
  | Readonly<{ kind: "note"; entry: NotebookEntry }>
  | Readonly<{ kind: "tool"; toolId: string; arguments: JsonValue }>
  | Readonly<{ kind: "final"; value: JsonValue }>;
```

### `agentic/sessions/AgentActionParser.ts`

Rejects oversized, malformed, extra-key, and unknown actions. JSON validation supplies immutable plain data before dispatch.

```typescript
import { JsonValueContract } from "../../persistence/JsonValueContract";
import type { AgentAction } from "./AgentAction";
export class AgentActionParser {
  constructor(private readonly json: JsonValueContract) {}
  async parse(text: string): Promise<AgentAction | null> {
    if (new TextEncoder().encode(text).byteLength > 16384) return null;
    let raw: unknown; try { raw = JSON.parse(text); } catch { return null; }
    const checked = await this.json.validate(raw); if (!checked.valid) return null;
    const value = checked.value;
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const row = value as Readonly<Record<string, import("../../contracts/persistence/JsonValue").JsonValue>>;
    if (row.kind === "final" && this.keys(row, ["kind", "value"])) return { kind: "final", value: row.value };
    if (row.kind === "tool" && this.keys(row, ["kind", "toolId", "arguments"]) && typeof row.toolId === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(row.toolId)) return { kind: "tool", toolId: row.toolId, arguments: row.arguments };
    if (row.kind === "note" && this.keys(row, ["kind", "entry"]) && row.entry !== null && typeof row.entry === "object" && !Array.isArray(row.entry)) {
      const entry = row.entry as Readonly<Record<string, unknown>>;
      if (this.keys(entry, ["text", "evidenceRefs"]) && typeof entry.text === "string" && entry.text.trim() && entry.text.length <= 2048 && Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length <= 8 && entry.evidenceRefs.every(ref => typeof ref === "string" && ref.length > 0 && ref.length <= 256)) return { kind: "note", entry: { text: entry.text, evidenceRefs: Object.freeze([...entry.evidenceRefs]) } };
    }
    return null;
  }
  private keys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key)); }
}
```

### `agentic/sessions/SessionView.ts`

Gives the context source bounded immutable notes and the most recent observation. The host keeps the complete durable history and authoritative unresolved requirements.

```typescript
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { NotebookSnapshot } from "./NotebookSnapshot";
export type SessionView = Readonly<{ sessionId: string; turn: number; notebook: NotebookSnapshot; lastObservation: JsonValue | null }>;
```

### `agentic/sessions/IAgentContextSource.ts`

Builds and publishes an authorized page-16 context snapshot for each turn. It must retain mandatory assignment/rules and pending state, verify tool receipts and notebook evidence, include the JSON-action instructions and permitted tool schemas, and persist any required history before returning.

```typescript
import type { ContextCompositionInput } from "../context/ContextCompositionInput";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { SessionView } from "./SessionView";
export interface IAgentContextSource { build(view: SessionView, context: IExecutionContext): Promise<ContextCompositionInput>; }
```

### `agentic/sessions/CompletionInput.ts`

Passes schema-valid candidate output plus the current session view to independent acceptance. Evidence and checks must be verified against authoritative state.

```typescript
import type { SessionView } from "./SessionView";
export type CompletionInput<TResult> = Readonly<{ candidate: TResult; view: SessionView }>;
```

### `agentic/sessions/CompletionDecision.ts`

Separates accepted completion from a bounded correction request. A rejection becomes data for the next normally budgeted turn.

```typescript
export type CompletionDecision = Readonly<{ accepted: boolean; feedback: string }>;
```

### `agentic/sessions/AgentTurnOutcome.ts`

Keeps known model output distinct from a control stop or an uncertain charged operation.

```typescript
import type { ExecutionStopReason } from "../../execution-control/ExecutionStopReason";
export type AgentTurnOutcome = Readonly<{ status: "text"; text: string }> | Readonly<{ status: "stopped"; reason: ExecutionStopReason }> | Readonly<{ status: "uncertain"; operationId: string; pendingOperationRefs?: readonly string[] }>;
```

### `agentic/sessions/IAgentTurn.ts`

Makes the model-turn pipeline injectable for deterministic offline tests. Production uses ComposedAgentTurn.

```typescript
import type { SessionView } from "./SessionView";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { AgentTurnOutcome } from "./AgentTurnOutcome";
export interface IAgentTurn { run(view: SessionView, context: IExecutionContext): Promise<AgentTurnOutcome>; }
```

### `agentic/sessions/ComposedAgentTurn.ts`

Runs context publication, ordinary composition, provider cache preparation, and one budgeted text generation with the session-pinned model. It never caches an answer or silently retries.

```typescript
import type { IAgentTurn } from "./IAgentTurn";
import type { IAgentContextSource } from "./IAgentContextSource";
import type { SessionView } from "./SessionView";
import type { AgentTurnOutcome } from "./AgentTurnOutcome";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { AgentContextComposer } from "../context/AgentContextComposer";
import { PromptCacheRequestPreparer } from "../model/prompt-cache/PromptCacheRequestPreparer";
import { BudgetedModelCall } from "../model/BudgetedModelCall";
import { AgentSessionError } from "../../errors/AgentSessionError";
export class ComposedAgentTurn implements IAgentTurn {
  constructor(private readonly source: IAgentContextSource, private readonly composer: AgentContextComposer, private readonly cache: PromptCacheRequestPreparer, private readonly call: BudgetedModelCall, private readonly timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new AgentSessionError();
  }
  async run(view: SessionView, context: IExecutionContext): Promise<AgentTurnOutcome> {
    const input = await this.source.build(view, context);
    if (input.assignment.pendingOperationRefs.length > 0) return { status: "uncertain", operationId: input.assignment.pendingOperationRefs[0], pendingOperationRefs: input.assignment.pendingOperationRefs };
    const composed = await this.composer.compose(input, context);
    if (composed.status === "stopped") return composed;
    if (composed.status !== "ready") return this.stop("Context cannot be verified or fitted.");
    const prepared = await this.cache.prepare(composed.context, context);
    if (prepared.status === "stopped") return prepared;
    if (prepared.status !== "ready") return this.stop("Provider request cannot be prepared.");
    const reply = await this.call.run(prepared.context.request, { operationId: context.identity.operationId, signal: context.signal, deadlineEpochMs: context.deadlineEpochMs, timeoutMs: this.timeoutMs });
    if (reply.status !== "received") return reply;
    if (reply.reply.usage === null) return { status: "uncertain", operationId: context.identity.operationId };
    if (reply.stopReason !== null) return { status: "stopped", reason: reply.stopReason };
    if (reply.reply.status !== "completed") return this.stop("Model did not supply a complete action.");
    return { status: "text", text: reply.reply.text };
  }
  private stop(message: string): AgentTurnOutcome { return { status: "stopped", reason: { code: "no-progress", message } }; }
}
```

### `agentic/sessions/ISessionJournal.ts`

Defines the required write-ahead boundary. Implementations bind scope/run/session, atomically claim unique operation IDs, record pending work before effects, and persist observations/outcomes before return. This phase supplies the integration contract, not a SQL checkpoint/recovery engine.

```typescript
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { SessionView } from "./SessionView";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
export interface ISessionJournal {
  begin(view: SessionView, context: IExecutionContext): Promise<void>;
  pending(operationId: string, kind: "model" | "tool", view: SessionView, context: IExecutionContext): Promise<void>;
  resolved(operationId: string, observation: JsonValue, context: IExecutionContext): Promise<void>;
  finish(view: SessionView, outcome: unknown, context: IExecutionContext): Promise<void>;
}
```

### `agentic/sessions/IAgentToolCall.ts`

Adapts the existing authorized ToolDispatcher; no second tool runtime is introduced. The operation identity must match the request and retain the session parent identity.

```typescript
import type { ToolCallRequest } from "../../tools/ToolCallRequest";
import type { ToolDispatchOutcome } from "../../tools/ToolDispatchOutcome";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export interface IAgentToolCall { dispatch(request: ToolCallRequest, context: IExecutionContext): Promise<ToolDispatchOutcome>; }
```

### `agentic/sessions/AgenticSession.ts`

Owns one bounded loop, notebook, and observation stream. Each effect gets a host operation ID and a write-ahead journal record; uncertain work stops the loop with collected notes intact.

```typescript
import type { IAgentTurn } from "./IAgentTurn";
import type { IAgentToolCall } from "./IAgentToolCall";
import type { ISessionJournal } from "./ISessionJournal";
import type { SessionView } from "./SessionView";
import type { CompletionInput } from "./CompletionInput";
import type { CompletionDecision } from "./CompletionDecision";
import type { IPolicy } from "../../contracts/IPolicy";
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import type { IClock } from "../../contracts/runtime/IClock";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { zeroUsage } from "../../usage/zeroUsage";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard";
import { AgentSessionError } from "../../errors/AgentSessionError";
import { DraftNotebook } from "./DraftNotebook";
import { AgentActionParser } from "./AgentActionParser";
export class AgenticSession<TResult> {
  private started = false;
  private readonly notebook = new DraftNotebook();
  private observation: JsonValue | null = null;
  private turn = 0;
  private readonly pending = new Set<string>();
  constructor(private readonly sessionId: string, private readonly maxTurns: number, private readonly model: IAgentTurn, private readonly tools: IAgentToolCall, private readonly parser: AgentActionParser, private readonly result: IResultContract<TResult>, private readonly acceptance: IPolicy<CompletionInput<TResult>, CompletionDecision>, private readonly journal: ISessionJournal, private readonly ledger: IUsageLedgerStore, private readonly budgetScopeId: string, private readonly ids: IIdGenerator, private readonly clock: IClock) {
    if (!sessionId || sessionId.length > 128 || !Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 128) throw new AgentSessionError();
  }
  async execute(context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    if (this.started || context.identity.sessionId !== this.sessionId) throw new AgentSessionError();
    this.started = true;
    await this.journal.begin(this.view(), context);
    const guard = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    for (; this.turn < this.maxTurns; this.turn++) {
      const stop = guard.check(); if (stop !== null) return this.finish(this.stopped(stop.code, stop.message), context);
      const iteration = this.ids.nextId();
      const reservation = await this.ledger.mutate(ledger => ledger.reserve(iteration, this.budgetScopeId, { ...zeroUsage, iterations: 1 }));
      if (!reservation.admitted || reservation.replayed) return this.finish(this.stopped("limit-reached", "Iteration allowance unavailable."), context);
      await this.ledger.mutate(ledger => ledger.settle(iteration, { ...zeroUsage, iterations: 1 }));
      const modelContext = this.child(context);
      await this.mark(modelContext, "model");
      const reply = await this.model.run(this.view(), modelContext);
      if (reply.status === "uncertain") { this.pending.add(reply.operationId); for (const ref of reply.pendingOperationRefs ?? []) this.pending.add(ref); return this.finish(this.stopped("no-progress", "Operation requires reconciliation."), context); }
      await this.journal.resolved(modelContext.identity.operationId, reply.status === "text" ? { text: reply.text } : { stopped: reply.reason.code }, modelContext);
      this.pending.delete(modelContext.identity.operationId);
      if (reply.status === "stopped") return this.finish(this.stopped(reply.reason.code, reply.reason.message), context);
      const action = await this.parser.parse(reply.text);
      if (action === null) return this.finish(this.stopped("no-progress", "Invalid model action."), context);
      const after = guard.check(); if (after !== null) return this.finish(this.stopped(after.code, after.message), context);
      if (action.kind === "note") {
        if (!this.notebook.append(action.entry)) return this.finish(this.stopped("limit-reached", "Notebook capacity reached."), context);
        this.observation = { noteRecorded: true }; continue;
      }
      if (action.kind === "tool") {
        const toolContext = this.child(context); await this.mark(toolContext, "tool");
        const dispatched = await this.tools.dispatch({ operationId: toolContext.identity.operationId, toolId: action.toolId, arguments: action.arguments }, toolContext);
        if (dispatched.status === "uncertain") { this.pending.add(dispatched.operationId); return this.finish(this.stopped("no-progress", "Tool requires reconciliation."), context); }
        const observation: JsonValue = dispatched.status === "completed" ? { operationId: dispatched.observation.operationId, toolId: dispatched.observation.toolId, value: dispatched.observation.value } : dispatched.status === "rejected" ? { rejected: dispatched.code } : { stopped: dispatched.reason.code };
        await this.journal.resolved(toolContext.identity.operationId, observation, toolContext); this.pending.delete(toolContext.identity.operationId); this.observation = observation;
        if (dispatched.status === "stopped") return this.finish(this.stopped(dispatched.reason.code, dispatched.reason.message), context);
        continue;
      }
      const checked = await this.result.validate(action.value);
      if (!checked.valid) { this.observation = { correction: "Result schema rejected." }; continue; }
      const decision = await this.acceptance.apply({ candidate: checked.value, view: this.view() });
      const acceptedStop = guard.check(); if (acceptedStop !== null) return this.finish(this.stopped(acceptedStop.code, acceptedStop.message), context);
      if (decision.accepted) return this.finish({ status: "completed", result: checked.value }, context);
      this.observation = { correction: typeof decision.feedback === "string" ? decision.feedback.slice(0, 1024) : "Acceptance rejected." };
    }
    return this.finish(this.stopped("limit-reached", "Session turn limit reached."), context);
  }
  private view(): SessionView { return Object.freeze({ sessionId: this.sessionId, turn: this.turn, notebook: this.notebook.snapshot(), lastObservation: this.observation }); }
  private child(context: IExecutionContext): IExecutionContext { return Object.freeze({ ...context, identity: Object.freeze({ ...context.identity, operationId: this.ids.nextId(), parentOperationId: context.identity.operationId, sessionId: this.sessionId }) }); }
  private async mark(context: IExecutionContext, kind: "model" | "tool"): Promise<void> { this.pending.add(context.identity.operationId); await this.journal.pending(context.identity.operationId, kind, this.view(), context); }
  private stopped(code: "limit-reached" | "deadline-reached" | "cancelled" | "no-progress", message: string): ExecutionOutcome<TResult> {
    return { status: "stopped", reason: { code, message }, partial: { summary: this.notebook.snapshot().entries.map(entry => entry.text).join("\n"), evidenceRefs: [], artifactRefs: [], unresolved: ["Assignment acceptance is incomplete; inspect the session journal for observations and unverified evidence."] }, pendingOperationRefs: Object.freeze([...this.pending]) };
  }
  private async finish(outcome: ExecutionOutcome<TResult>, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> { await this.journal.finish(this.view(), outcome, context); return outcome; }
}
```

### `agentic/sessions/IAgenticSessionFactory.ts`

Constructs a fresh session and session-scoped model/context dependencies per invocation. It pins the selected profile and shares the original run ledger; it does not share mutable notebooks or reuse operation identities.

```typescript
import type { AgenticSession } from "./AgenticSession";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export interface IAgenticSessionFactory<TResult> { create(context: IExecutionContext): Promise<AgenticSession<TResult>>; }
```

### `agentic/sessions/AgenticMindUnit.ts`

Provides the reusable public executor. The supplied invocation context already has a fresh session ID and authoritative assignment binding; the factory supplies isolated state for that session.

```typescript
import type { IExecutor } from "../../executors/contracts/IExecutor";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { IAgenticSessionFactory } from "./IAgenticSessionFactory";
export class AgenticMindUnit<TResult> implements IExecutor<void, TResult> {
  constructor(private readonly sessions: IAgenticSessionFactory<TResult>) {}
  async execute(_input: void, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> { return (await this.sessions.create(context)).execute(context); }
}
```

### `index.ts`

Append these declarations to the existing public entry point; retain all earlier exports.

```typescript
export type { NotebookEntry } from "./agentic/sessions/NotebookEntry";
export type { NotebookSnapshot } from "./agentic/sessions/NotebookSnapshot";
export { AgentSessionError } from "./errors/AgentSessionError";
export { DraftNotebook } from "./agentic/sessions/DraftNotebook";
export type { AgentAction } from "./agentic/sessions/AgentAction";
export { AgentActionParser } from "./agentic/sessions/AgentActionParser";
export type { SessionView } from "./agentic/sessions/SessionView";
export type { IAgentContextSource } from "./agentic/sessions/IAgentContextSource";
export type { CompletionInput } from "./agentic/sessions/CompletionInput";
export type { CompletionDecision } from "./agentic/sessions/CompletionDecision";
export type { AgentTurnOutcome } from "./agentic/sessions/AgentTurnOutcome";
export type { IAgentTurn } from "./agentic/sessions/IAgentTurn";
export { ComposedAgentTurn } from "./agentic/sessions/ComposedAgentTurn";
export type { ISessionJournal } from "./agentic/sessions/ISessionJournal";
export type { IAgentToolCall } from "./agentic/sessions/IAgentToolCall";
export { AgenticSession } from "./agentic/sessions/AgenticSession";
export type { IAgenticSessionFactory } from "./agentic/sessions/IAgenticSessionFactory";
export { AgenticMindUnit } from "./agentic/sessions/AgenticMindUnit";
```
