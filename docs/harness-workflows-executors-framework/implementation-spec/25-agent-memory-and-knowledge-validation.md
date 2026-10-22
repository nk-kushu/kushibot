# 25. Agent Memory and Knowledge Validation

## What We Implement Here

Create scoped, durable memory proposals; independently check their original evidence; save accepted/rejected decisions; retire outdated entries; and retrieve only currently supported knowledge as optional agent context. Add SQLite/PostgreSQL storage, source-validation and context-verification seams, and a concrete login-finding example. Memory never substitutes for current instructions, task acceptance, operation receipts or a new model request.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/AgentMemoryError.ts` | `class AgentMemoryError extends Error` |
| `memory/KnowledgeSourceRef.ts` | `type KnowledgeSourceRef` |
| `memory/MemoryProposal.ts` | `type MemoryProposal` |
| `memory/KnowledgeSourceObservation.ts` | `type KnowledgeSourceObservation` |
| `memory/IKnowledgeSourceReader.ts` | `interface IKnowledgeSourceReader` |
| `memory/KnowledgeValidationDecision.ts` | `type KnowledgeValidationDecision` |
| `memory/KnowledgeValidationInput.ts` | `type KnowledgeValidationInput` |
| `memory/ExactSourceKnowledgePolicy.ts` | `class ExactSourceKnowledgePolicy implements IPolicy<KnowledgeValidationInput, KnowledgeValidationDecision>` |
| `memory/MemoryInvalidation.ts` | `type MemoryInvalidation` |
| `memory/MemoryRecord.ts` | `type MemoryRecord` |
| `memory/MemoryProposalContract.ts` | `class MemoryProposalContract implements IResultContract<MemoryProposal>` |
| `memory/MemoryRecordContract.ts` | `class MemoryRecordContract implements IResultContract<MemoryRecord>` |
| `memory/IAgentMemoryStore.ts` | `interface IAgentMemoryStore` |
| `memory/MemoryValidationOutcome.ts` | `type MemoryValidationOutcome` |
| `memory/MemoryKnowledgeService.ts` | `class MemoryKnowledgeService` |
| `memory/MemoryRecallItem.ts` | `type MemoryRecallItem` |
| `memory/MemoryRecallOutcome.ts` | `type MemoryRecallOutcome` |
| `memory/MemoryRetrievalService.ts` | `class MemoryRetrievalService` |
| `memory/MemoryEvidenceVerifier.ts` | `class MemoryEvidenceVerifier` |
| `memory/MemoryContextFragmentVerifier.ts` | `class MemoryContextFragmentVerifier` |
| `examples/memory/createAgentMemoryExample.ts` | `function createAgentMemoryExample` |
| `examples/memory/rememberLoginFindingExample.ts` | `function rememberLoginFindingExample` |
| `tests/memory/checkAgentMemory.ts` | `function checkAgentMemory` |
| `persistence/memory/MemoryStatements.ts` | `type MemoryStatements` |
| `persistence/memory/sqliteMemoryStatements.ts` | `const sqliteMemoryStatements` |
| `persistence/memory/postgresqlMemoryStatements.ts` | `const postgresqlMemoryStatements` |
| `persistence/memory/SqlAgentMemoryStore.ts` | `class SqlAgentMemoryStore implements IAgentMemoryStore` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [01](01-scope-and-implementation-roadmap.md) and [02](02-package-structure-and-oop-conventions.md) for general OOP, naming, writing and one-declaration-per-file rules. Each interface starts with `I`. Use the shared `IPolicy`, JSON/record codecs, SQL database capabilities, clock, execution context and context fragments. These are future library files; this note does not install source in KushiBot.
- Memory is a durable, source-backed finding proposed for use across tasks. DraftNotebook is session working data; summaries are derived context; artifacts hold evidence; run/operation journals record actual execution. None automatically becomes accepted memory. Retrieval does not return an old LLM answer in place of inference. Provider prompt caching remains only the provider feature described in page 17.
- The application constructs a store for an authenticated exact scope/project/workspace and a source reader with corresponding permissions. Copying matching scope strings grants no authority. A missing workspace ID means a separate project-level key, not a wildcard. Sharing project knowledge into a workspace needs an explicitly authorized composition/visibility design; this first implementation never widens scope automatically. SQL parameters and decoded payload scope must agree.
- Proposals and source observations are untrusted data. Contract validation proves shape, not truth, applicability, authorization or completed work. `IKnowledgeSourceReader` is the required trusted host adapter for authorized immutable sources, complete excerpt semantics, current applicability, revision changes and durable verification evidence. Source IDs, a successful model response, and confident prose alone are insufficient. Runtime cannot treat a fixture reader as a production verifier.
- The baseline supports exact complete excerpts only. The proposed statement must equal the reader's complete source text; source selection must retain qualifiers, conditions and provenance. Exact equality establishes fidelity to that evidence, not universal truth. Conflicting sources may remain separate accepted records; do not automatically pick one as a globally settled fact. A changed/unknown source produces rejection or a skipped retrieval, never an inferred update.
- `ExactSourceKnowledgePolicy` implements the existing shared policy contract. The coordinator independently enforces exact-source acceptance and bounded evidence even with an injected policy. Broader semantic generalization, contradiction resolution, embedding search or model-assisted verification needs a separately specified, normally budgeted operation/outcome design. No hidden paid call, free memory-writing summary, self-approval prompt, retry loop or provider SDK is added here.
- A memory lifecycle is pending revision 0 → accepted/rejected revision 1 → accepted-and-invalidated revision 2. Keep the original proposal and acceptance/rejection evidence immutable. Invalidating preserves acceptance history. Reconsidering rejected or retired knowledge requires a new proposal identity and fresh source checks. Expiry is explicit and at most 30 days; source/attestation expiry can be earlier. Store and retrieve the complete bounded statement; never silently truncate a condition.
- Use a stable proposal ID/creation timestamp/expiry for retries. Creation is idempotent only for identical proposal content, including scope and source revision. A conflicting reuse fails. Decision and retirement commits are short atomic SQL transactions with revision checks and exact saved-payload replay. Repeating `validate` returns its already saved decision without requesting new evidence. Concurrent conflicting decisions fail or report changed; do not hide them by silently retrying with new timestamps.
- SQL schema setup touches only `kushibot_agent_memory_v1` and its topic index. SQLite/PostgreSQL share the same key and payload contract. Source reads/policies run outside write transactions. Scoped row locks plus validated read/write payloads prevent lost decisions and forged index columns; they are not a transaction with an external source repository. Sources may change after validation, so acceptance describes its attested point in time. Retrieval and dispatch must check again.
- The authorized application, not model-generated prose, owns retirement. `invalidate` preserves the exact retirement command/code/time for idempotent replay; it rejects rejected/pending entries and conflicting commands. Source staleness immediately suppresses retrieval even before an administrator explicitly retires the entry. There is no automatic source mutation, record deletion, retention sweep or background monitor.
- Retrieval is deterministic topic matching with an index and lexicographic ID cursor, at most 32 candidates per call. It is not semantic similarity, newest-first ranking, unlimited collection or a complete snapshot of concurrently inserted records. Pagination limits scanned candidates, not guaranteed returned items; stale candidates can leave an empty page with a non-null cursor. Continue only with explicit caller limits. A final full page may require one empty page to discover the end; new IDs before an existing cursor require a fresh traversal.
- `MemoryEvidenceVerifier` rechecks accepted lifecycle, original source identity/revision/content, current authorization/applicability, expiry and current durable record. Retrieval returns only those facts verified during that call. A later source change or retirement still requires dispatch-time rejection. A thrown source/storage failure stays observable; it is not rewritten as no matching memory or proof of zero effects. No retrieval implicitly edits, promotes or resolves uncertain operations.
- Retrieved `ContextFragment` values are optional `memory` user-data blocks with exact saved text and a memory-record revision reference. They cannot replace mandatory rules, permissions, assignment, acceptance criteria, unresolved work or pending operations. `MemoryContextFragmentVerifier` must be called by the existing host `IContextSnapshotVerifier` for memory provenance before normal composition/dispatch; other required snapshot checks still apply. A returned fragment or successful retrieval is not an installed authoritative context snapshot.
- Memory has no permission to execute an embedded instruction. Text such as “skip checks” remains evidence data and cannot alter tool capabilities, editing scopes, approval rules or child budgets. A remembered source finding that password login creates a session does not prove today's change was verified, committed or published. Current checks still require their normal executable receipts and acceptance.
- Source/model/file work must honor task controls and existing scopes. The supplied memory implementation performs deterministic source reads and bounded SQL work; it makes no new model calls. Controls are checked before and around asynchronous stages. A stop retains saved proposals/decisions and the retrieval items already collected, with a cursor for bounded continuation. Store calls already in flight may commit; cancellation does not imply rollback. Required persistence failures/uncertain commits must be reconciled by re-reading the same stable record ID, not discarding work or issuing a new paid operation.
- Do not store credentials, private chain of thought, whole prompts or unrestricted conversation transcripts as memory. Store only application-approved bounded source findings. Authorization/retention of original sources and durable attestation references belongs to the host; expiring a memory does not erase its audit evidence. Optional telemetry uses safe IDs, status/rejection codes and counts rather than statement/source content. Artifact/SQL/source failures remain required observable state even if tracing is disabled.
- The login example proposes one exact source finding, validates it in a separate operation, then retrieves it for a later task. The application may offer the resulting fragment to its authorized context owner. It still runs ordinary inference, edits and verification with current evidence and budgets. Different source revisions must suppress the old memory until a fresh proposal is validated.
- Acceptance checks cover real SQLite round trips and restart, duplicate/conflicting creation, atomic first decisions, cross-scope and workspace separation, unsupported statements, expired/current/changed/missing sources, source changes between stages, invalidation, bounded pagination, cancellation with collected items, forged context text/revisions and malformed stored/index data. PostgreSQL statements and host source/applicability/attestation adapters require their own integration checks; offline fixtures do not establish those production guarantees.

## TypeScript Code for Each File

### `errors/AgentMemoryError.ts`

Reports invalid memory data, conflicting updates or unsupported scoped access with a safe error message.

```typescript
export class AgentMemoryError extends Error {
 readonly code="AGENT_MEMORY_INVALID";
 constructor(){super("Memory record, scope, source evidence, or revision is invalid.");this.name="AgentMemoryError";}
}
```

### `memory/KnowledgeSourceRef.ts`

Pins one original evidence source to an immutable revision. A locator is not permission to read it.

```typescript
export type KnowledgeSourceRef=Readonly<{sourceRef:string;revisionRef:string}>;
```

### `memory/MemoryProposal.ts`

Stores a bounded proposed fact, exact source revision, topic, scope and expiry. The id is the stable creation command identity and must be reused unchanged after an uncertain write.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { KnowledgeSourceRef } from "./KnowledgeSourceRef";
export type MemoryProposal=Readonly<{
 id:string;scope:ExecutionScopeRef;topic:string;statement:string;source:KnowledgeSourceRef;
 createdAtEpochMs:number;expiresAtEpochMs:number;
}>;
```

### `memory/KnowledgeSourceObservation.ts`

Represents an independently authorized source read. Current means its immutable revision is still applicable to the requested task scope. The reader supplies a durable attestation reference, not an invented receipt string.

```typescript
import type { KnowledgeSourceRef } from "./KnowledgeSourceRef";
export type KnowledgeSourceObservation=
 |Readonly<{status:"current";source:KnowledgeSourceRef;text:string;verificationRef:string;validUntilEpochMs:number}>
 |Readonly<{status:"unavailable"}>
 |Readonly<{status:"changed"}>;
```

### `memory/IKnowledgeSourceReader.ts`

Is the trusted host capability for current, authorized evidence. It verifies project/workspace access, source ownership, immutable content/revision and current applicability. Missing/deleted/unauthorized evidence returns unavailable; a changed revision returns changed.

```typescript
import type { KnowledgeSourceRef } from "./KnowledgeSourceRef";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IKnowledgeSourceReader {
 read(source:KnowledgeSourceRef,context:IExecutionContext):Promise<KnowledgeSourceObservation>;
}
```

### `memory/KnowledgeValidationDecision.ts`

Records source-backed acceptance or a specific rejection. Expiry bounds the attestation, and acceptance never grants execution or publication authority.

```typescript
export type KnowledgeValidationDecision=
 |Readonly<{status:"accepted";verificationRef:string;validatedAtEpochMs:number;validUntilEpochMs:number}>
 |Readonly<{status:"rejected";code:"SOURCE_UNAVAILABLE"|"SOURCE_CHANGED"|"STATEMENT_UNSUPPORTED"|"EXPIRED";checkedAtEpochMs:number}>;
```

### `memory/KnowledgeValidationInput.ts`

Passes frozen proposal/source snapshots and the coordinator clock to the existing shared policy contract.

```typescript
import type { MemoryProposal } from "./MemoryProposal";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation";
export type KnowledgeValidationInput=Readonly<{proposal:MemoryProposal;observation:KnowledgeSourceObservation;nowEpochMs:number}>;
```

### `memory/ExactSourceKnowledgePolicy.ts`

Provides the deterministic baseline: the complete proposed statement must equal the complete authorized source excerpt. This proves exact source fidelity, not universal truth or support for paraphrases. The source adapter must choose a complete, independently meaningful excerpt with its conditions intact.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { KnowledgeValidationInput } from "./KnowledgeValidationInput";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision";
export class ExactSourceKnowledgePolicy implements IPolicy<KnowledgeValidationInput,KnowledgeValidationDecision> {
 async apply(input:KnowledgeValidationInput):Promise<KnowledgeValidationDecision>{
  const {proposal,observation,nowEpochMs}=input;
  if(nowEpochMs>=proposal.expiresAtEpochMs)return {status:"rejected",code:"EXPIRED",checkedAtEpochMs:nowEpochMs};
  if(observation.status==="unavailable")return {status:"rejected",code:"SOURCE_UNAVAILABLE",checkedAtEpochMs:nowEpochMs};
  if(observation.status==="changed")return {status:"rejected",code:"SOURCE_CHANGED",checkedAtEpochMs:nowEpochMs};
  if(observation.source.sourceRef!==proposal.source.sourceRef||observation.source.revisionRef!==proposal.source.revisionRef)return {status:"rejected",code:"SOURCE_CHANGED",checkedAtEpochMs:nowEpochMs};
  if(nowEpochMs>=observation.validUntilEpochMs)return {status:"rejected",code:"EXPIRED",checkedAtEpochMs:nowEpochMs};
  if(observation.text!==proposal.statement)return {status:"rejected",code:"STATEMENT_UNSUPPORTED",checkedAtEpochMs:nowEpochMs};
  return {status:"accepted",verificationRef:observation.verificationRef,validatedAtEpochMs:nowEpochMs,validUntilEpochMs:Math.min(proposal.expiresAtEpochMs,observation.validUntilEpochMs)};
 }
}
```

### `memory/MemoryInvalidation.ts`

Retires accepted knowledge without deleting its proposal or original acceptance receipt. Invalidated entries cannot be silently resurrected.

```typescript
export type MemoryInvalidation=Readonly<{commandId:string;code:"SOURCE_RETIRED"|"SUPERSEDED"|"USER_REVOKED";atEpochMs:number}>;
```

### `memory/MemoryRecord.ts`

Keeps the immutable proposal and first validation decision, plus monotonic revision and optional retirement. A rejected proposal requires a new proposal identity to be reconsidered.

```typescript
import type { MemoryProposal } from "./MemoryProposal";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision";
import type { MemoryInvalidation } from "./MemoryInvalidation";
export type MemoryRecord=Readonly<{
 schemaVersion:1;revision:number;proposal:MemoryProposal;
 decision:KnowledgeValidationDecision|null;invalidation:MemoryInvalidation|null;
}>;
```

### `memory/MemoryProposalContract.ts`

Validates exact keys, scoped identities, finite timestamps, bounded complete text and a maximum 30-day lifetime. It freeze-copies through the shared JSON contract; shape validation alone does not authorize or accept the claim.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { MemoryProposal } from "./MemoryProposal";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class MemoryProposalContract implements IResultContract<MemoryProposal> {
 readonly id="memory-proposal";readonly version="1";
 constructor(private readonly json:JsonValueContract){}
 async validate(value:unknown):Promise<ValidationResult<MemoryProposal>>{
  const checked=await this.json.validate(value);if(!checked.valid)return checked;
  const p=checked.value as unknown as MemoryProposal;
  if(!this.keys(p,["id","scope","topic","statement","source","createdAtEpochMs","expiresAtEpochMs"])||!this.idValue(p.id)||!this.idValue(p.topic)||!this.scope(p.scope)||!this.keys(p.source,["sourceRef","revisionRef"])||!this.text(p.source.sourceRef,256)||!this.text(p.source.revisionRef,256)||!this.text(p.statement,8192)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p.statement)||/[\uD800-\uDFFF]/u.test(p.statement)||new TextEncoder().encode(p.statement).byteLength>8192||!this.time(p.createdAtEpochMs)||!this.time(p.expiresAtEpochMs)||p.expiresAtEpochMs<=p.createdAtEpochMs||p.expiresAtEpochMs-p.createdAtEpochMs>2592000000)return {valid:false,issues:[{path:[],code:"MEMORY_PROPOSAL_INVALID",message:"Expected a bounded scoped proposal with source and expiry."}]};
  return {valid:true,value:p};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(v,key));}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private text(v:unknown,max:number):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=max;}
 private time(v:unknown):v is number{return Number.isSafeInteger(v)&&(v as number)>=0;}
 private scope(v:unknown):boolean{if(v===null||typeof v!=="object")return false;const s=v as Record<string,unknown>;return this.keys(s,s.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])&&this.idValue(s.scopeId)&&this.idValue(s.projectId)&&(s.workspaceId===undefined||this.idValue(s.workspaceId));}
}
```

### `memory/MemoryRecordContract.ts`

Validates proposal, decision, retirement and exact lifecycle/revision combinations before SQL reads/writes. Only pending revision 0, decided revision 1 and accepted-then-retired revision 2 are supported.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { MemoryRecord } from "./MemoryRecord";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { MemoryProposalContract } from "./MemoryProposalContract";
export class MemoryRecordContract implements IResultContract<MemoryRecord> {
 readonly id="agent-memory-record";readonly version="1";
 constructor(private readonly json:JsonValueContract,private readonly proposals:MemoryProposalContract){}
 async validate(raw:unknown):Promise<ValidationResult<MemoryRecord>>{
  const checked=await this.json.validate(raw);if(!checked.valid)return checked;const r=checked.value as unknown as MemoryRecord;
  if(!this.keys(r,["schemaVersion","revision","proposal","decision","invalidation"])||r.schemaVersion!==1||!(await this.proposals.validate(r.proposal)).valid)return this.invalid();
  const d=r.decision,i=r.invalidation;
  if(d===null)return r.revision===0&&i===null?{valid:true,value:r}:this.invalid();
  if(d.status==="accepted"){
   if(!this.keys(d,["status","verificationRef","validatedAtEpochMs","validUntilEpochMs"])||!this.ref(d.verificationRef)||!this.time(d.validatedAtEpochMs)||!this.time(d.validUntilEpochMs)||d.validatedAtEpochMs<r.proposal.createdAtEpochMs||d.validUntilEpochMs<=d.validatedAtEpochMs||d.validUntilEpochMs>r.proposal.expiresAtEpochMs)return this.invalid();
  }else if(d.status!=="rejected"||!this.keys(d,["status","code","checkedAtEpochMs"])||!["SOURCE_UNAVAILABLE","SOURCE_CHANGED","STATEMENT_UNSUPPORTED","EXPIRED"].includes(d.code)||!this.time(d.checkedAtEpochMs)||d.checkedAtEpochMs<r.proposal.createdAtEpochMs)return this.invalid();
  if(i===null)return r.revision===1?{valid:true,value:r}:this.invalid();
  if(d.status!=="accepted"||r.revision!==2||!this.keys(i,["commandId","code","atEpochMs"])||typeof i.commandId!=="string"||!/^[A-Za-z0-9_.:-]{1,128}$/.test(i.commandId)||!["SOURCE_RETIRED","SUPERSEDED","USER_REVOKED"].includes(i.code)||!this.time(i.atEpochMs)||i.atEpochMs<d.validatedAtEpochMs)return this.invalid();
  return {valid:true,value:r};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(v,key));}
 private time(v:unknown):v is number{return Number.isSafeInteger(v)&&(v as number)>=0;}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=256;}
 private invalid():ValidationResult<MemoryRecord>{return {valid:false,issues:[{path:[],code:"MEMORY_RECORD_INVALID",message:"Invalid memory record lifecycle or evidence."}]};}
}
```

### `memory/IAgentMemoryStore.ts`

Provides one authenticated scope-bound repository, idempotent creation, first-decision CAS, accepted-record retirement, and bounded keyset retrieval. Scope authorization belongs to the composition root and database access boundary.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { MemoryProposal } from "./MemoryProposal";
import type { MemoryRecord } from "./MemoryRecord";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision";
import type { MemoryInvalidation } from "./MemoryInvalidation";
export interface IAgentMemoryStore {
 readonly scope:ExecutionScopeRef;
 initialize():Promise<void>;
 propose(value:MemoryProposal):Promise<MemoryRecord>;
 get(id:string):Promise<MemoryRecord|null>;
 decide(id:string,expectedRevision:number,decision:KnowledgeValidationDecision):Promise<MemoryRecord>;
 invalidate(id:string,expectedRevision:number,invalidation:MemoryInvalidation):Promise<MemoryRecord>;
 listAccepted(topic:string,afterId:string|null,limit:number):Promise<readonly MemoryRecord[]>;
}
```

### `memory/MemoryValidationOutcome.ts`

Returns a saved decision, an explicit task-control stop, or a concurrent update without hiding the proposal. Storage/source failures remain visible exceptions with the last durable record intact.

```typescript
import type { MemoryRecord } from "./MemoryRecord";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type MemoryValidationOutcome=
 |Readonly<{status:"recorded";record:MemoryRecord}>
 |Readonly<{status:"stopped";reason:ExecutionStopReason;record:MemoryRecord}>
 |Readonly<{status:"changed";record:MemoryRecord}>;
```

### `memory/MemoryKnowledgeService.ts`

Owns proposal creation and independent acceptance. It binds context to the authorized store, validates source observations, enforces controls and exact-source acceptance even if an injected policy misbehaves, then commits a revision-checked decision. No model call or effect replay is performed.

```typescript
import type { IAgentMemoryStore } from "./IAgentMemoryStore";
import type { IKnowledgeSourceReader } from "./IKnowledgeSourceReader";
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { KnowledgeValidationInput } from "./KnowledgeValidationInput";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation";
import type { MemoryRecord } from "./MemoryRecord";
import type { MemoryValidationOutcome } from "./MemoryValidationOutcome";
import { MemoryProposalContract } from "./MemoryProposalContract";
import { MemoryRecordContract } from "./MemoryRecordContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue";
import { AgentMemoryError } from "../errors/AgentMemoryError";
export class MemoryKnowledgeService {
 constructor(private readonly store:IAgentMemoryStore,private readonly sources:IKnowledgeSourceReader,private readonly policy:IPolicy<KnowledgeValidationInput,KnowledgeValidationDecision>,private readonly proposals:MemoryProposalContract,private readonly records:MemoryRecordContract,private readonly json:JsonValueContract,private readonly clock:IClock){}
 async propose(value:unknown,context:IExecutionContext):Promise<MemoryRecord>{this.bind(context);const checked=await this.proposals.validate(value);if(!checked.valid||canonical(checked.value.scope)!==canonical(this.store.scope))throw new AgentMemoryError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);if(guard.check()!==null)throw new AgentMemoryError();const existing=await this.store.get(checked.value.id);if(existing!==null){if(canonical(existing.proposal)!==canonical(checked.value))throw new AgentMemoryError();return existing;}if(guard.check()!==null)throw new AgentMemoryError();const now=this.clock.nowEpochMs();if(checked.value.createdAtEpochMs>now||checked.value.expiresAtEpochMs<=now)throw new AgentMemoryError();return this.store.propose(checked.value);}
 async validate(id:string,context:IExecutionContext):Promise<MemoryValidationOutcome>{
  this.bind(context);const record=await this.store.get(id);if(record===null)throw new AgentMemoryError();if(record.decision!==null)return {status:"recorded",record};const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);let stop=guard.check();if(stop!==null)return {status:"stopped",reason:stop,record};
  const checked=await this.json.validate(await this.sources.read(record.proposal.source,context));if(!checked.valid)throw new AgentMemoryError();const observation=checked.value as unknown as KnowledgeSourceObservation;this.observation(observation);
  stop=guard.check();if(stop!==null)return {status:"stopped",reason:stop,record};const now=this.clock.nowEpochMs(),rawDecision=await this.policy.apply(Object.freeze({proposal:record.proposal,observation,nowEpochMs:now}));const candidate=await this.records.validate({...record,revision:1,decision:rawDecision});if(!candidate.valid||candidate.value.decision===null)throw new AgentMemoryError();const decision=candidate.value.decision;if(decision.status==="rejected"&&decision.checkedAtEpochMs!==now)throw new AgentMemoryError();if(decision.status==="accepted"&&(observation.status!=="current"||canonical(observation.source)!==canonical(record.proposal.source)||observation.text!==record.proposal.statement||decision.verificationRef!==observation.verificationRef||decision.validatedAtEpochMs!==now||decision.validUntilEpochMs>observation.validUntilEpochMs))throw new AgentMemoryError();
  stop=guard.check();if(stop!==null)return {status:"stopped",reason:stop,record};if(decision.status==="accepted"&&this.clock.nowEpochMs()>=decision.validUntilEpochMs)return {status:"changed",record};const latest=await this.store.get(id);if(latest===null)throw new AgentMemoryError();if(latest.revision!==record.revision)return {status:"changed",record:latest};stop=guard.check();if(stop!==null)return {status:"stopped",reason:stop,record:latest};if(decision.status==="accepted"&&this.clock.nowEpochMs()>=decision.validUntilEpochMs)return {status:"changed",record:latest};return {status:"recorded",record:await this.store.decide(id,record.revision,decision)};
 }
 private bind(context:IExecutionContext):void{if(canonical(context.scope)!==canonical(this.store.scope))throw new AgentMemoryError();}
 private observation(value:KnowledgeSourceObservation):void{if(value===null||typeof value!=="object")throw new AgentMemoryError();const keys=Object.keys(value).sort().join(",");if(value.status!=="current"){if(!["unavailable","changed"].includes(value.status)||keys!=="status")throw new AgentMemoryError();return;}if(keys!==["status","source","text","verificationRef","validUntilEpochMs"].sort().join(",")||value.source===null||typeof value.source!=="object"||Object.keys(value.source).sort().join(",")!=="revisionRef,sourceRef"||![value.source.sourceRef,value.source.revisionRef,value.verificationRef].every(v=>typeof v==="string"&&v.trim().length>0&&v.length<=256)||typeof value.text!=="string"||new TextEncoder().encode(value.text).byteLength>8192||!Number.isSafeInteger(value.validUntilEpochMs)||value.validUntilEpochMs<0)throw new AgentMemoryError();}
}
```

### `memory/MemoryRecallItem.ts`

Returns the full saved record, fresh source attestation and optional context fragment. The fragment remains untrusted user-data material; the context snapshot owner must verify its provenance again before dispatch.

```typescript
import type { MemoryRecord } from "./MemoryRecord";
import type { ContextFragment } from "../agentic/context/ContextFragment";
export type MemoryRecallItem=Readonly<{record:MemoryRecord;verificationRef:string;validUntilEpochMs:number;fragment:ContextFragment}>;
```

### `memory/MemoryRecallOutcome.ts`

Makes bounded pagination, skipped stale candidates and cancellation visible. A cursor marks scanned IDs, not semantic ranking or a complete knowledge search; records added before the cursor require a fresh traversal.

```typescript
import type { MemoryRecallItem } from "./MemoryRecallItem";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type MemoryRecallOutcome=Readonly<{
 status:"ready"|"stopped";items:readonly MemoryRecallItem[];nextAfterId:string|null;
 skipped:readonly Readonly<{memoryId:string;code:"STALE_OR_UNSUPPORTED"}>[];reason:ExecutionStopReason|null;
}>;
```

### `memory/MemoryRetrievalService.ts`

Retrieves at most 32 accepted topic matches per call, revalidates sources and expiry, and returns optional data fragments in stable key order. A source changing makes the record unusable immediately without rewriting historical acceptance. No embedding provider, inferred answer or free model call is hidden in retrieval.

```typescript
import type { IAgentMemoryStore } from "./IAgentMemoryStore";
import type { IClock } from "../contracts/runtime/IClock";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { MemoryRecallOutcome } from "./MemoryRecallOutcome";
import type { MemoryRecallItem } from "./MemoryRecallItem";
import { MemoryEvidenceVerifier } from "./MemoryEvidenceVerifier";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue";
import { AgentMemoryError } from "../errors/AgentMemoryError";
export class MemoryRetrievalService {
 constructor(private readonly store:IAgentMemoryStore,private readonly evidence:MemoryEvidenceVerifier,private readonly clock:IClock){}
 async retrieve(topic:string,afterId:string|null,limit:number,context:IExecutionContext):Promise<MemoryRecallOutcome>{
  if(canonical(context.scope)!==canonical(this.store.scope))throw new AgentMemoryError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs),items:MemoryRecallItem[]=[],skipped:Readonly<{memoryId:string;code:"STALE_OR_UNSUPPORTED"}>[]=[];let cursor=afterId,reason=guard.check();
  if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};
  const records=await this.store.listAccepted(topic,afterId,limit);
  for(const record of records){reason=guard.check();if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};const item=await this.evidence.verify(record,context);reason=guard.check();if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};cursor=record.proposal.id;if(item===null)skipped.push({memoryId:cursor,code:"STALE_OR_UNSUPPORTED"});else items.push(item);}
  return {status:"ready",items:Object.freeze(items),nextAfterId:records.length===limit?cursor:null,skipped:Object.freeze(skipped),reason:null};
 }
}
```

### `memory/MemoryEvidenceVerifier.ts`

Revalidates one accepted record against its authorized original source, the current durable record, time and controls. Both retrieval and context-snapshot verification use this collaborator; a prior acceptance receipt alone is insufficient.

```typescript
import type { IAgentMemoryStore } from "./IAgentMemoryStore";
import type { IKnowledgeSourceReader } from "./IKnowledgeSourceReader";
import type { MemoryRecord } from "./MemoryRecord";
import type { MemoryRecallItem } from "./MemoryRecallItem";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IClock } from "../contracts/runtime/IClock";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue";
import { AgentMemoryError } from "../errors/AgentMemoryError";
export class MemoryEvidenceVerifier {
 constructor(private readonly store:IAgentMemoryStore,private readonly sources:IKnowledgeSourceReader,private readonly json:JsonValueContract,private readonly clock:IClock){}
 async verify(record:MemoryRecord,context:IExecutionContext):Promise<MemoryRecallItem|null>{
  if(canonical(context.scope)!==canonical(this.store.scope)||canonical(record.proposal.scope)!==canonical(this.store.scope))throw new AgentMemoryError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs),p=record.proposal,d=record.decision;
  if(guard.check()!==null||d?.status!=="accepted"||record.invalidation!==null||this.clock.nowEpochMs()>=Math.min(p.expiresAtEpochMs,d.validUntilEpochMs))return null;
  const checked=await this.json.validate(await this.sources.read(p.source,context));if(!checked.valid)throw new AgentMemoryError();const observation=checked.value as unknown as KnowledgeSourceObservation;
  if(observation===null||typeof observation!=="object")throw new AgentMemoryError();if(observation.status!=="current"){if(!["unavailable","changed"].includes(observation.status)||Object.keys(observation).length!==1)throw new AgentMemoryError();return null;}
  if(Object.keys(observation).sort().join(",")!=="source,status,text,validUntilEpochMs,verificationRef"||typeof observation.text!=="string"||typeof observation.verificationRef!=="string"||observation.verificationRef.trim().length===0||observation.verificationRef.length>256||!Number.isSafeInteger(observation.validUntilEpochMs)||observation.validUntilEpochMs<0)throw new AgentMemoryError();
  if(canonical(observation.source)!==canonical(p.source)||observation.text!==p.statement)return null;
  const latest=await this.store.get(p.id),validUntilEpochMs=Math.min(p.expiresAtEpochMs,d.validUntilEpochMs,observation.validUntilEpochMs);
  if(guard.check()!==null||this.clock.nowEpochMs()>=validUntilEpochMs||latest===null||canonical(latest)!==canonical(record))return null;
  return Object.freeze({record,verificationRef:observation.verificationRef,validUntilEpochMs,fragment:Object.freeze({id:"memory:"+p.id,kind:"memory" as const,revisionRef:"memory-revision:"+record.revision,sourceRef:"memory:"+p.id,text:p.statement,priority:20})});
 }
}
```

### `memory/MemoryContextFragmentVerifier.ts`

Provides the memory-specific check used by the existing IContextSnapshotVerifier host implementation. It rejects fabricated text, mismatched revisions, retired entries, expired evidence and cross-scope lookups. Integrate this into actual source verification before model dispatch; retrieving a fragment is not installation.

```typescript
import type { IAgentMemoryStore } from "./IAgentMemoryStore";
import type { ContextFragment } from "../agentic/context/ContextFragment";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import { MemoryEvidenceVerifier } from "./MemoryEvidenceVerifier";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue";
import { AgentMemoryError } from "../errors/AgentMemoryError";
export class MemoryContextFragmentVerifier {
 constructor(private readonly store:IAgentMemoryStore,private readonly evidence:MemoryEvidenceVerifier){}
 async verify(fragment:ContextFragment,context:IExecutionContext):Promise<boolean>{
  if(canonical(context.scope)!==canonical(this.store.scope))throw new AgentMemoryError();if(fragment.kind!=="memory"||!fragment.sourceRef.startsWith("memory:"))return false;const id=fragment.sourceRef.slice(7);if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(id))return false;const record=await this.store.get(id);if(record===null)return false;const item=await this.evidence.verify(record,context);return item!==null&&canonical(item.fragment)===canonical(fragment);
 }
}
```

### `examples/memory/createAgentMemoryExample.ts`

Assembles real SQL persistence, exact-source validation, retrieval and the context-verification seam through the public API. Supply an already authorized database/scope and a real source-reader capability; the example does not replace it with a fabricated production verifier.

```typescript
import type { ISqlDatabase, MemoryStatements, ExecutionScopeRef, IKnowledgeSourceReader, IClock } from "../../index";
import { JsonValueContract, JsonRecordCodec, MemoryProposalContract, MemoryRecordContract, SqlAgentMemoryStore, ExactSourceKnowledgePolicy, MemoryKnowledgeService, MemoryEvidenceVerifier, MemoryRetrievalService, MemoryContextFragmentVerifier } from "../../index";
export async function createAgentMemoryExample(database:ISqlDatabase,sql:MemoryStatements,scope:ExecutionScopeRef,sources:IKnowledgeSourceReader,clock:IClock){
 const json=new JsonValueContract(),proposals=new MemoryProposalContract(json),records=new MemoryRecordContract(json,proposals);
 const codec=new JsonRecordCodec(records,json,16384),store=new SqlAgentMemoryStore(database,sql,codec,scope);await store.initialize();
 const knowledge=new MemoryKnowledgeService(store,sources,new ExactSourceKnowledgePolicy(),proposals,records,json,clock),evidence=new MemoryEvidenceVerifier(store,sources,json,clock);
 return Object.freeze({store,knowledge,retrieval:new MemoryRetrievalService(store,evidence,clock),contextVerifier:new MemoryContextFragmentVerifier(store,evidence)});
}
```

### `examples/memory/rememberLoginFindingExample.ts`

Shows two separate operations: propose a source-backed login fact, then validate it. A later task recalls current knowledge as optional context data. The original source must actually contain the complete sentence and remain applicable; neither proposal nor recall claims a verification command ran.

```typescript
import type { IExecutionContext, KnowledgeSourceRef } from "../../index";
import { MemoryKnowledgeService, MemoryRetrievalService } from "../../index";
export async function rememberLoginFindingExample(knowledge:MemoryKnowledgeService,retrieval:MemoryRetrievalService,source:KnowledgeSourceRef,createdAtEpochMs:number,proposalContext:IExecutionContext,validationContext:IExecutionContext,laterTaskContext:IExecutionContext){
 const record=await knowledge.propose({id:proposalContext.identity.operationId,scope:proposalContext.scope,topic:"login-session-behavior",statement:"Password login creates a session after credentials are verified.",source,createdAtEpochMs,expiresAtEpochMs:createdAtEpochMs+86400000},proposalContext);
 const validation=await knowledge.validate(record.proposal.id,validationContext);
 if(validation.status!=="recorded"||validation.record.decision?.status!=="accepted")return {validation,recall:null};
 const recall=await retrieval.retrieve("login-session-behavior",null,8,laterTaskContext);
 // The authorized context-snapshot owner may offer recall.items[].fragment as optional data.
 // Its normal snapshot verifier must call MemoryContextFragmentVerifier before dispatch.
 return {validation,recall};
}
```

### `tests/memory/checkAgentMemory.ts`

Runs the same public memory flow against an injected disposable real SQLite or PostgreSQL database. Uses a clearly marked offline source fixture, checks accepted/stale/retired behavior, and leaves connection cleanup to the caller. It does not establish production source authorization or attestation guarantees.

```typescript
import type { ISqlDatabase, MemoryStatements, IExecutionContext, IKnowledgeSourceReader } from "../../index";
import { AgentMemoryError } from "../../index";
import { createAgentMemoryExample } from "../../examples/memory/createAgentMemoryExample";
export async function checkAgentMemory(database:ISqlDatabase,sql:MemoryStatements):Promise<void>{
 const scope=Object.freeze({scopeId:"memory-check",projectId:"project",workspaceId:"workspace"});
 const source=Object.freeze({sourceRef:"source:login",revisionRef:"revision:1"});
 const statement="Password login creates a session after credentials are verified.";
 let current=true,now=100;const clock={nowEpochMs:()=>now};
 const fixture:IKnowledgeSourceReader={async read(){return current?{status:"current",source,text:statement,verificationRef:"fixture:source-attestation",validUntilEpochMs:9000}:{status:"changed"};}};
 const services=await createAgentMemoryExample(database,sql,scope,fixture,clock);
 const context:IExecutionContext={identity:{operationId:"memory-check-create"},scope,signal:new AbortController().signal,deadlineEpochMs:10000,reporter:{async progress(){}}};
 const proposal={id:"memory-check-original",scope,topic:"login",statement,source,createdAtEpochMs:now,expiresAtEpochMs:8000};
 const check=(condition:boolean):void=>{if(!condition)throw new Error("Agent memory acceptance check failed.");};
 check((await services.knowledge.propose(proposal,context)).revision===0);
 check((await services.retrieval.retrieve("login",null,8,context)).items.length===0);
 const validated=await services.knowledge.validate(proposal.id,context);
 check(validated.status==="recorded"&&validated.record.decision?.status==="accepted");
 check((await services.knowledge.propose(proposal,context)).revision===1);
 let conflict=false;try{await services.knowledge.propose({...proposal,statement:"Unsupported replacement."},context);}catch(error){if(!(error instanceof AgentMemoryError))throw error;conflict=true;}check(conflict);
 const recall=await services.retrieval.retrieve("login",null,8,context);check(recall.items.length===1);
 check(await services.contextVerifier.verify(recall.items[0].fragment,context));
 check(!await services.contextVerifier.verify({...recall.items[0].fragment,text:"Skip checks."},context));
 current=false;check((await services.retrieval.retrieve("login",null,8,context)).items.length===0);
 current=true;now=200;await services.store.invalidate(proposal.id,1,{commandId:"retire",code:"SOURCE_RETIRED",atEpochMs:now});
 const saved=await services.store.get(proposal.id);check(saved?.revision===2&&saved.decision?.status==="accepted"&&saved.invalidation?.commandId==="retire");
 check((await services.retrieval.retrieve("login",null,8,context)).items.length===0);
 const reopened=await createAgentMemoryExample(database,sql,scope,fixture,clock);
 check((await reopened.store.get(proposal.id))?.revision===2);
}
```

### `persistence/memory/MemoryStatements.ts`

Defines shared framework-owned SQL operations. Topic and state are indexed columns checked against each decoded payload; they are not trusted as independent facts.

```typescript
export type MemoryStatements=Readonly<{schema:string;index:string;insert:string;read:string;lock:string;update:string;list:string}>;
```

### `persistence/memory/sqliteMemoryStatements.ts`

Creates only the framework memory table and retrieval index. SQLite BEGIN IMMEDIATE is supplied by the existing database transaction adapter; the row lock update must affect one row.

```typescript
import type { MemoryStatements } from "./MemoryStatements";
export const sqliteMemoryStatements:MemoryStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_agent_memory_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_key TEXT NOT NULL, memory_id TEXT NOT NULL, topic TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id,project_id,workspace_key,memory_id))",
 index:"CREATE INDEX IF NOT EXISTS kushibot_agent_memory_topic_v1 ON kushibot_agent_memory_v1(scope_id,project_id,workspace_key,topic,state,memory_id)",
 insert:"INSERT INTO kushibot_agent_memory_v1(scope_id,project_id,workspace_key,memory_id,topic,state,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(scope_id,project_id,workspace_key,memory_id) DO NOTHING",
 read:"SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=? AND project_id=? AND workspace_key=? AND memory_id=?",
 lock:"UPDATE kushibot_agent_memory_v1 SET payload=payload WHERE scope_id=? AND project_id=? AND workspace_key=? AND memory_id=?",
 update:"UPDATE kushibot_agent_memory_v1 SET state=?,payload=? WHERE scope_id=? AND project_id=? AND workspace_key=? AND memory_id=?",
 list:"SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=? AND project_id=? AND workspace_key=? AND topic=? AND state='accepted' AND memory_id>? ORDER BY memory_id ASC LIMIT ?"
});
```

### `persistence/memory/postgresqlMemoryStatements.ts`

Uses the same schema and keyset semantics with PostgreSQL parameter binding. The no-op UPDATE acquires a row lock in the existing transaction; no provider/file work runs inside it.

```typescript
import type { MemoryStatements } from "./MemoryStatements";
import { sqliteMemoryStatements } from "./sqliteMemoryStatements";
export const postgresqlMemoryStatements:MemoryStatements=Object.freeze({
 schema:sqliteMemoryStatements.schema,index:'CREATE INDEX IF NOT EXISTS kushibot_agent_memory_topic_v1 ON kushibot_agent_memory_v1(scope_id,project_id,workspace_key,topic,state,memory_id COLLATE "C")',
 insert:"INSERT INTO kushibot_agent_memory_v1(scope_id,project_id,workspace_key,memory_id,topic,state,payload) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(scope_id,project_id,workspace_key,memory_id) DO NOTHING",
 read:"SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND memory_id=$4",
 lock:"UPDATE kushibot_agent_memory_v1 SET payload=payload WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND memory_id=$4",
 update:"UPDATE kushibot_agent_memory_v1 SET state=$1,payload=$2 WHERE scope_id=$3 AND project_id=$4 AND workspace_key=$5 AND memory_id=$6",
 list:'SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND topic=$4 AND state=\'accepted\' AND memory_id COLLATE "C">$5 COLLATE "C" ORDER BY memory_id COLLATE "C" ASC LIMIT $6'
});
```

### `persistence/memory/SqlAgentMemoryStore.ts`

Implements durable scoped proposals and atomic decision/retirement updates. Exact retries return saved records; conflicting content, revision or command payload fails. Project memory and workspace memory use distinct keys and are never implicitly widened.

```typescript
import type { IAgentMemoryStore } from "../../memory/IAgentMemoryStore";
import type { MemoryProposal } from "../../memory/MemoryProposal";
import type { MemoryRecord } from "../../memory/MemoryRecord";
import type { KnowledgeValidationDecision } from "../../memory/KnowledgeValidationDecision";
import type { MemoryInvalidation } from "../../memory/MemoryInvalidation";
import type { MemoryStatements } from "./MemoryStatements";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { ISqlDatabase } from "../sql/ISqlDatabase";
import type { ISqlExecutor } from "../sql/ISqlExecutor";
import { canonicalWorkflowValue as canonical } from "../../workflows/canonicalWorkflowValue";
import { AgentMemoryError } from "../../errors/AgentMemoryError";
export class SqlAgentMemoryStore implements IAgentMemoryStore {
 readonly scope:ExecutionScopeRef;private readonly scopeKey:readonly string[];
 constructor(private readonly db:ISqlDatabase,private readonly sql:MemoryStatements,private readonly codec:IRecordCodec<MemoryRecord>,scope:ExecutionScopeRef){
  if(![scope.scopeId,scope.projectId,...(scope.workspaceId===undefined?[]:[scope.workspaceId])].every(value=>this.id(value)))throw new AgentMemoryError();
  this.scope=Object.freeze({...scope});this.scopeKey=Object.freeze([scope.scopeId,scope.projectId,scope.workspaceId??""]);
 }
 async initialize():Promise<void>{await this.db.migrationTransaction(async tx=>{await tx.query(this.sql.schema,[]);await tx.query(this.sql.index,[]);});}
 async propose(proposal:MemoryProposal):Promise<MemoryRecord>{const payload=await this.codec.encode({schemaVersion:1,revision:0,proposal,decision:null,invalidation:null}),value=await this.codec.decode(payload);this.bind(value);return this.db.transaction(async tx=>{await tx.query(this.sql.insert,[...this.scopeKey,proposal.id,proposal.topic,"pending",payload]);const saved=await this.load(tx,proposal.id);if(saved===null||canonical(saved.proposal)!==canonical(value.proposal))throw new AgentMemoryError();return saved;});}
 get(id:string):Promise<MemoryRecord|null>{return this.load(this.db,id);}
 decide(id:string,revision:number,decision:KnowledgeValidationDecision):Promise<MemoryRecord>{return this.change(id,record=>{if(record.decision!==null){if(canonical(record.decision)!==canonical(decision))throw new AgentMemoryError();return record;}if(record.revision!==revision||record.invalidation!==null)throw new AgentMemoryError();return {...record,revision:record.revision+1,decision};});}
 invalidate(id:string,revision:number,invalidation:MemoryInvalidation):Promise<MemoryRecord>{return this.change(id,record=>{if(record.invalidation!==null){if(canonical(record.invalidation)!==canonical(invalidation))throw new AgentMemoryError();return record;}if(record.revision!==revision||record.decision?.status!=="accepted")throw new AgentMemoryError();return {...record,revision:record.revision+1,invalidation};});}
 async listAccepted(topic:string,afterId:string|null,limit:number):Promise<readonly MemoryRecord[]>{if(!this.id(topic)||(afterId!==null&&!this.id(afterId))||!Number.isSafeInteger(limit)||limit<1||limit>32)throw new AgentMemoryError();const result=await this.db.query(this.sql.list,[...this.scopeKey,topic,afterId??"",limit]);if(result.rows.length>limit)throw new AgentMemoryError();const values:MemoryRecord[]=[];let last=afterId??"";for(const row of result.rows){const record=await this.row(row);if(record.proposal.topic!==topic||this.state(record)!=="accepted"||record.proposal.id<=last)throw new AgentMemoryError();last=record.proposal.id;values.push(record);}return Object.freeze(values);}
 private async change(id:string,change:(record:MemoryRecord)=>MemoryRecord):Promise<MemoryRecord>{if(!this.id(id))throw new AgentMemoryError();return this.db.transaction(async tx=>{if((await tx.query(this.sql.lock,[...this.scopeKey,id])).affectedRows!==1)throw new AgentMemoryError();const old=await this.load(tx,id);if(old===null)throw new AgentMemoryError();const next=change(old),payload=await this.codec.encode(next),checked=await this.codec.decode(payload);this.bind(checked);if(canonical(checked.proposal)!==canonical(old.proposal))throw new AgentMemoryError();if((await tx.query(this.sql.update,[this.state(checked),payload,...this.scopeKey,id])).affectedRows!==1)throw new AgentMemoryError();return checked;});}
 private async load(tx:ISqlExecutor,id:string):Promise<MemoryRecord|null>{if(!this.id(id))throw new AgentMemoryError();const rows=(await tx.query(this.sql.read,[...this.scopeKey,id])).rows;if(rows.length===0)return null;if(rows.length!==1)throw new AgentMemoryError();const record=await this.row(rows[0]);if(record.proposal.id!==id)throw new AgentMemoryError();return record;}
 private async row(row:Readonly<Record<string,unknown>>):Promise<MemoryRecord>{if(typeof row.payload!=="string")throw new AgentMemoryError();const record=await this.codec.decode(row.payload);this.bind(record);if(row.memory_id!==record.proposal.id||row.topic!==record.proposal.topic||row.state!==this.state(record))throw new AgentMemoryError();return record;}
 private bind(record:MemoryRecord):void{if(canonical(record.proposal.scope)!==canonical(this.scope))throw new AgentMemoryError();}
 private state(record:MemoryRecord):string{return record.invalidation!==null?"invalidated":record.decision?.status??"pending";}
 private id(value:unknown):value is string{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
}
```

### `index.ts`

Append these supported memory contracts, classes and SQL statement bundles to the existing barrel. Example/test entry points remain separate.

```typescript
export * from "./errors/AgentMemoryError";
export * from "./memory/KnowledgeSourceRef";
export * from "./memory/MemoryProposal";
export * from "./memory/KnowledgeSourceObservation";
export * from "./memory/IKnowledgeSourceReader";
export * from "./memory/KnowledgeValidationDecision";
export * from "./memory/KnowledgeValidationInput";
export * from "./memory/ExactSourceKnowledgePolicy";
export * from "./memory/MemoryInvalidation";
export * from "./memory/MemoryRecord";
export * from "./memory/MemoryProposalContract";
export * from "./memory/MemoryRecordContract";
export * from "./memory/IAgentMemoryStore";
export * from "./memory/MemoryValidationOutcome";
export * from "./memory/MemoryKnowledgeService";
export * from "./memory/MemoryRecallItem";
export * from "./memory/MemoryRecallOutcome";
export * from "./memory/MemoryRetrievalService";
export * from "./memory/MemoryEvidenceVerifier";
export * from "./memory/MemoryContextFragmentVerifier";
export * from "./persistence/memory/MemoryStatements";
export * from "./persistence/memory/sqliteMemoryStatements";
export * from "./persistence/memory/postgresqlMemoryStatements";
export * from "./persistence/memory/SqlAgentMemoryStore";
```

