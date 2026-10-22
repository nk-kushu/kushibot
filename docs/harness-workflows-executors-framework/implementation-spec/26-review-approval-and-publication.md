# 26. Review, Approval, and Publication

## What We Implement Here

Create an immutable change proposal from an isolated working copy; bind review and real verification receipts to its exact source; require trusted human approval for the exact proposal and original target revision; and publish only through an authorized target adapter with current target checks. Persist the dispatch claim before applying changes, retain uncertain effects for reconciliation, and record actual target receipts without blindly replaying writes.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/PublicationError.ts` | `class PublicationError extends Error` |
| `publication/PublicationChange.ts` | `type PublicationChange` |
| `publication/ChangeProposalBody.ts` | `type ChangeProposalBody` |
| `publication/ChangeProposal.ts` | `type ChangeProposal` |
| `publication/PublicationEvidenceRef.ts` | `type PublicationEvidenceRef` |
| `publication/ReviewFinding.ts` | `type ReviewFinding` |
| `publication/ReviewReport.ts` | `type ReviewReport` |
| `publication/IReviewReportReader.ts` | `interface IReviewReportReader` |
| `publication/IPublicationVerificationReader.ts` | `interface IPublicationVerificationReader` |
| `publication/IChangeProposalVerifier.ts` | `interface IChangeProposalVerifier` |
| `publication/IPublicationEvidenceVerifier.ts` | `interface IPublicationEvidenceVerifier` |
| `publication/RecordedPublicationEvidenceVerifier.ts` | `class RecordedPublicationEvidenceVerifier implements IPublicationEvidenceVerifier` |
| `publication/TrustedPublicationApproval.ts` | `type TrustedPublicationApproval` |
| `publication/ITrustedPublicationApprovalReader.ts` | `interface ITrustedPublicationApprovalReader` |
| `publication/PublicationCommand.ts` | `type PublicationCommand` |
| `publication/PublicationReceipt.ts` | `type PublicationReceipt` |
| `publication/PublicationEffectOutcome.ts` | `type PublicationEffectOutcome` |
| `publication/IPublicationTarget.ts` | `interface IPublicationTarget` |
| `publication/PublicationRecord.ts` | `type PublicationRecord` |
| `publication/ChangeProposalContract.ts` | `class ChangeProposalContract implements IResultContract<ChangeProposal>` |
| `publication/PublicationRecordContract.ts` | `class PublicationRecordContract implements IResultContract<PublicationRecord>` |
| `publication/IPublicationStore.ts` | `interface IPublicationStore` |
| `persistence/publication/PublicationStatements.ts` | `type PublicationStatements` |
| `persistence/publication/sqlitePublicationStatements.ts` | `const sqlitePublicationStatements` |
| `persistence/publication/postgresqlPublicationStatements.ts` | `const postgresqlPublicationStatements` |
| `persistence/publication/SqlPublicationStore.ts` | `class SqlPublicationStore implements IPublicationStore` |
| `publication/PublicationOutcome.ts` | `type PublicationOutcome` |
| `publication/ChangeProposalService.ts` | `class ChangeProposalService` |
| `publication/PublicationCoordinator.ts` | `class PublicationCoordinator` |
| `examples/publication/createPublicationExample.ts` | `function createPublicationExample` |
| `examples/publication/publishLoginChangeExample.ts` | `function publishLoginChangeExample` |
| `tests/publication/checkPublicationFlow.ts` | `function checkPublicationFlow` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [01](01-scope-and-implementation-roadmap.md) and [02](02-package-structure-and-oop-conventions.md) for general OOP, file naming and writing rules. Interfaces start with `I` and each named declaration has its own file. Reuse the existing SQL/JSON codecs, artifacts, contexts, checks and model-backed structured executor rather than adding a second agent runtime. These are planned library files; writing this note does not publish or modify user code.
- Work stays in the isolated working copy until this separate publication phase. The proposal manifest pins all exact target-relative paths, expected old content and exact replacement/deletion artifacts, source snapshot, original target revision, scope and authoritative policy version. The host proposal verifier must prove completeness against the actual diff, retained artifacts and allowed capabilities; model-supplied path lists and digest labels alone are insufficient.
- Canonical JSON and SHA-256 bind the whole proposal body. Preserve array order and exact artifact metadata. Any change to bytes, manifest, target, base revision, scope or policy requires a new proposal identity/digest, applicable review/check evidence and trusted approval. Reusing the same proposal ID for different content fails. No silent rebase, patch repair, extra file modification, merge conflict resolution, generated-file addition or scope widening occurs during apply.
- Paths are bounded normalized relative names; reject traversal, backslashes, absolute paths, control characters and `.git` components. String validation is only the first boundary. The actual target adapter must also prevent symlink escapes, case/normalization aliases, protected paths, target substitution and unauthorized create/delete/rename effects using the host filesystem/repository capability. Renames are explicit delete/create entries and must be reviewed as such. It must verify original bytes and actual artifact hashes/lengths, not copy whatever currently occupies a saved pathname.
- A review report is an evidence-bound structured result. Produce it using the existing configured StructuredTaskExecutor/AgenticMindUnit with normal budgets and source context, or a trusted human-review adapter. Schema-valid pass text is not proof the review actually ran, covered the source or was accepted. `IReviewReportReader` must verify saved producer/outcome provenance and scope. This page reads saved reviews and checks; it starts no hidden review/model/summarization call.
- `RecordedPublicationEvidenceVerifier` uses the application-configured mandatory policy/check versions, exact snapshot, independently verified executable receipts and a passing nonblocking review. A child or caller cannot make checks optional by changing a model-generated list. Required checks must appear exactly once and pass; incomplete, stale, inconclusive or blocking review/check evidence blocks publication. Host source/review/result readers and the existing receipt verifier are required real capabilities, not permissive boolean fixtures.
- Readiness is distinct from approval. A model verdict, accepted workflow result, remembered fact, generic “looks good,” another version's approval or sub-agent response grants no publication authority. Trusted host UI/API displays the concrete exact manifest/diff, target and base revision to an authorized principal and stores a scoped approval receipt. `ITrustedPublicationApprovalReader` authenticates it, checks current authority/revocation/expiry and returns only that exact binding. The model must have no capability to mint or self-approve these receipts.
- Absence, denial or expiry of approval leaves a waiting proposal with no apply command. Mismatched authenticated approval fields are a binding error; they never authorize fallback to another target. Approval and evidence references are frozen into the durable command. The target adapter rechecks their current validity under its actual commit protocol; a prior application read does not prevent revocation or target change between stages. In-flight effects may still finish; always report the actual result.
- `IPublicationTarget` is the required host-specific publication capability. It coordinates the original target with all competing writers, compares its expected revision/content immediately before committing, revalidates the approval and exact source/evidence, enforces controls and allowed paths, and records actual before/after revisions plus operation receipt. A target mismatch returns proven not-applied and requires a new proposal; it does not auto-merge or overwrite current changes.
- Do not implement a multi-file target adapter as an unjournaled loop of writes and claim atomic publication. Use an appropriate host commit protocol, such as staging plus an atomic repository-reference CAS, or an explicitly journaled recoverable target transaction with documented visibility. Partial filesystem effects stay unknown/pending until reconciled; exceptions or aborts do not prove rollback. The core supplies durable coordinator records and the required adapter seam, not a universal filesystem/Git/remote publication implementation.
- The SQL store atomically creates exact proposals, claims one command, and records known effects. A scoped unique operation key prevents reusing a publication operation for different proposals. Claim is the write-ahead boundary before target invocation. Only the caller that acquired a new claim calls apply. Normal redelivery of a claimed proposal returns pending/history and does not issue another apply, even when the previous request timed out. SQL initialization touches only the framework-owned publication table.
- Target commit and SQL acknowledgement are separate durable steps. The target must have its own durable operation idempotency and receipt/reconciliation protocol. A lost reply or acknowledgement failure leaves the command pending; later `reconcile` reads the actual outcome. An absent receipt is unknown unless the host proves no effect happened and no old worker can still apply. Use page 24's host fencing/barrier principles before declaring no-apply; a timer, expired lease, canceled request or a restarted coordinator alone is insufficient.
- Reconcile is read-only with respect to publishing the target. It never restarts apply, invents a successful receipt or assumes the target is unchanged. A confirmed target receipt is bound to the saved operation/digest/target/base revision before the SQL effect record is written. Conflicting final receipts fail visibly. Published and proven not-applied are separate recorded outcomes; callers must inspect effect.status rather than treating every recorded result as success. Proven no-apply requires a new proposal/explicit new flow for any later write.
- Cancellation/deadline before claiming produces a stopped outcome retaining the concrete proposal. After a claim but before local dispatch, the coordinator can record proven no-apply because this caller never invoked the target. After invocation, it preserves uncertainty on a thrown/lost response; it never declares success/failure from an abort signal. Target-side control checks and reconciliation must account for the actual worker/write lifetime. Cleanup may use a fresh scoped administrative context; it grants no new publication permission.
- Proposal records retain the exact review/check/approval references and actual effect receipt. Required record/target failures remain observable even with optional diagnostics disabled. Logs contain safe IDs, digests, counts and status codes rather than raw changes, credentials, prompt bodies or private reasoning. Scope-matching strings alone do not grant read/write access: the application must supply authenticated scoped database, artifact, review, approval and target capabilities.
- Publication does not create an answer cache, reset budgets, imply verification passed for later source versions, or grant future editing authority. Applying an approved local change is not automatically deployment, PR merge, notification or remote publication. Those target actions require their own explicitly scoped adapter/approval policy. No external messages or real target writes occur merely from these examples.
- Examples assemble the real SQL journal with required host adapters. The acceptance function uses plainly marked in-process approval/evidence/target fixtures to demonstrate waiting, a lost response, pending redelivery, explicit receipt reconciliation and restart of the SQL store. Fixture approval is not authentication; its in-memory receipt is not crash-durable target publication. Run real SQLite tests without credentials; production target/authentication and PostgreSQL adapters require their own integration evidence before claiming those guarantees.
- Additional acceptance cases include changed manifest/digest, target/base mismatch, unauthorized/symlink paths, missing/failed checks, stale/mismatched review, wrong/expired/revoked/denied approval, cancellation around dispatch, simultaneous publishers, duplicate operation IDs, SQL rollback, target commit/acknowledgement crash gaps, unknown reconciliation, conflicting receipts and exact receipt replay. Confirm that each negative path performs zero unauthorized target writes and preserves the proposal/known work.

## TypeScript Code for Each File

### `errors/PublicationError.ts`

Reports invalid proposal data, scope, receipts or state without exposing change contents.

```typescript
export class PublicationError extends Error {readonly code="PUBLICATION_INVALID";constructor(){super("Publication proposal, scope, evidence, or state is invalid.");this.name="PublicationError";}}
```

### `publication/PublicationChange.ts`

Pins one normalized target-relative file path to its expected old content digest and exact replacement artifact. Null old content means creation; null replacement means deletion. Real adapters must verify complete bytes and reject symlink/path escapes.

```typescript
import type { ArtifactRef } from "../artifacts/ArtifactRef";
export type PublicationChange=Readonly<{path:string;beforeDigest:string|null;after:ArtifactRef|null}>;
```

### `publication/ChangeProposalBody.ts`

Describes the exact proposed changes, isolated source snapshot, original target and expected target revision, plus the authoritative review/check policy version. No approval flag is accepted from the model.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { PublicationChange } from "./PublicationChange";
export type ChangeProposalBody=Readonly<{id:string;scope:ExecutionScopeRef;summary:string;sourceSnapshotRef:string;targetId:string;targetRevision:string;policy:RegistrationRef;changes:readonly PublicationChange[]}>;
```

### `publication/ChangeProposal.ts`

Adds a content digest over every canonical body field. Changing files, scope, target, source or policy produces a different digest and requires a new proposal identity and approval.

```typescript
import type { ChangeProposalBody } from "./ChangeProposalBody";
export type ChangeProposal=ChangeProposalBody&Readonly<{digest:string}>;
```

### `publication/PublicationEvidenceRef.ts`

Pins saved source-bound review and executable verification reports. These references never substitute for resolving and verifying the actual receipts.

```typescript
export type PublicationEvidenceRef=Readonly<{reviewRef:string;verificationRef:string}>;
```

### `publication/ReviewFinding.ts`

Stores bounded actionable review conclusions and their source references as data. A model cannot use a finding to grant permissions or claim human approval.

```typescript
export type ReviewFinding=Readonly<{code:string;blocking:boolean;message:string;sourceRefs:readonly string[]}>;
```

### `publication/ReviewReport.ts`

Binds the saved review to the exact proposal digest, isolated source snapshot and configured policy. Pass is a reviewer conclusion, not trusted approval or publication.

```typescript
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { ReviewFinding } from "./ReviewFinding";
export type ReviewReport=Readonly<{proposalDigest:string;sourceSnapshotRef:string;policy:RegistrationRef;verdict:"pass"|"changes-requested"|"inconclusive";findings:readonly ReviewFinding[]}>;
```

### `publication/IReviewReportReader.ts`

Resolves an authorized immutable saved review and verifies its producer/outcome/source provenance. The host must reject fabricated, incomplete, mismatched or unaccepted review artifacts. A JSON document with verdict pass is not enough.

```typescript
import type { ReviewReport } from "./ReviewReport";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IReviewReportReader {read(reference:string,context:IExecutionContext):Promise<ReviewReport|null>;}
```

### `publication/IPublicationVerificationReader.ts`

Reads an authorized immutable verification result from its real run record. Actual check receipts are independently verified using the existing IVerificationReceiptVerifier.

```typescript
import type { VerificationResult } from "../executors/VerificationResult";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IPublicationVerificationReader {read(reference:string,context:IExecutionContext):Promise<VerificationResult|null>;}
```

### `publication/IChangeProposalVerifier.ts`

Is the trusted host capability for complete diff provenance, permitted target/path scope, source snapshot integrity and expected base content. It verifies that the manifest represents all intended changes and that artifacts contain the exact immutable bytes. A matching string or digest label alone grants no authority.

```typescript
import type { ChangeProposal } from "./ChangeProposal";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IChangeProposalVerifier {verify(proposal:ChangeProposal,context:IExecutionContext):Promise<boolean>;}
```

### `publication/IPublicationEvidenceVerifier.ts`

Provides the replaceable readiness capability for exact proposals and current source-bound review/check evidence. It grants no human approval and performs no publication.

```typescript
import type { ChangeProposal } from "./ChangeProposal";
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IPublicationEvidenceVerifier {verify(proposal:ChangeProposal,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<boolean>;}
```

### `publication/RecordedPublicationEvidenceVerifier.ts`

Combines trusted proposal/review/result readers with real check-receipt verification. The composition root supplies the mandatory policy and check versions; callers cannot relax them by editing a proposal. All configured checks must appear exactly once and pass on the exact isolated snapshot.

```typescript
import type { IPublicationEvidenceVerifier } from "./IPublicationEvidenceVerifier";
import type { IChangeProposalVerifier } from "./IChangeProposalVerifier";
import type { IReviewReportReader } from "./IReviewReportReader";
import type { IPublicationVerificationReader } from "./IPublicationVerificationReader";
import type { IVerificationReceiptVerifier } from "../executors/IVerificationReceiptVerifier";
import type { ChangeProposal } from "./ChangeProposal";
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef";
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import { VerificationResultContract } from "../executors/VerificationResultContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue";
import { PublicationError } from "../errors/PublicationError";
export class RecordedPublicationEvidenceVerifier implements IPublicationEvidenceVerifier {
 private readonly policy:RegistrationRef;private readonly required:readonly RegistrationRef[];
 constructor(private readonly proposals:IChangeProposalVerifier,private readonly reviews:IReviewReportReader,private readonly results:IPublicationVerificationReader,private readonly receipts:IVerificationReceiptVerifier,private readonly checks:VerificationResultContract,private readonly json:JsonValueContract,policy:RegistrationRef,required:readonly RegistrationRef[]){if(!this.registration(policy)||required.length<1||required.length>16||required.some(r=>!this.registration(r))||new Set(required.map(r=>r.id)).size!==required.length)throw new PublicationError();this.policy=Object.freeze({...policy});this.required=Object.freeze(required.map(r=>Object.freeze({...r})));}
 async verify(proposal:ChangeProposal,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<boolean>{
  if(canonical(proposal.policy)!==canonical(this.policy)||!await this.proposals.verify(proposal,context))return false;
  const read=await this.reviews.read(evidence.reviewRef,context);if(read===null)return false;const normalized=await this.json.validate(read);if(!normalized.valid)return false;const report=normalized.value as unknown as typeof read;
  if(!this.keys(report,["proposalDigest","sourceSnapshotRef","policy","verdict","findings"])||report.proposalDigest!==proposal.digest||report.sourceSnapshotRef!==proposal.sourceSnapshotRef||canonical(report.policy)!==canonical(this.policy)||report.verdict!=="pass"||!Array.isArray(report.findings)||report.findings.length>32)return false;
  for(const f of report.findings)if(!this.keys(f,["code","blocking","message","sourceRefs"])||typeof f.code!=="string"||!/^[A-Z0-9_:-]{1,128}$/.test(f.code)||f.blocking!==false||typeof f.message!=="string"||f.message.trim().length===0||f.message.length>1024||!Array.isArray(f.sourceRefs)||f.sourceRefs.length<1||f.sourceRefs.length>16||f.sourceRefs.some((ref:unknown)=>typeof ref!=="string"||ref.length<1||ref.length>256))return false;
  const result=await this.results.read(evidence.verificationRef,context);if(result===null)return false;const checked=await this.checks.validate(result);if(!checked.valid||!checked.value.passed||checked.value.snapshotRef!==proposal.sourceSnapshotRef||checked.value.checks.length!==this.required.length)return false;
  for(const required of this.required){const matching=checked.value.checks.filter(c=>c.checkId===required.id&&c.checkVersion===required.version);if(matching.length!==1||matching[0].status!=="passed"||matching[0].snapshotRef!==proposal.sourceSnapshotRef||!await this.receipts.verify(matching[0],context))return false;}
  return this.proposals.verify(proposal,context);
 }
 private registration(v:RegistrationRef):boolean{return this.keys(v,["id","version"])&&[v.id,v.version].every(x=>typeof x==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(x));}
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
}
```

### `publication/TrustedPublicationApproval.ts`

Represents a real host-authenticated approve/deny decision for one digest, target and expected revision within an exact scope. Principal and receipt references must resolve to the trusted approval system; model output cannot create this authority.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
export type TrustedPublicationApproval=Readonly<{approvalId:string;principalRef:string;receiptRef:string;decision:"approved"|"denied";scope:ExecutionScopeRef;proposalDigest:string;targetId:string;targetRevision:string;expiresAtEpochMs:number}>;
```

### `publication/ITrustedPublicationApprovalReader.ts`

Resolves a host-authenticated approval reference with current principal authorization, exact target/digest binding, expiry and revocation checks. Missing/unauthenticated approval returns null. Approval capture belongs to trusted host UI/API, not an LLM tool that can self-approve.

```typescript
import type { TrustedPublicationApproval } from "./TrustedPublicationApproval";
import type { ChangeProposal } from "./ChangeProposal";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface ITrustedPublicationApprovalReader {read(reference:string,proposal:ChangeProposal,context:IExecutionContext):Promise<TrustedPublicationApproval|null>;}
```

### `publication/PublicationCommand.ts`

Is the durable write-ahead claim for one publication operation. It pins proposal digest, exact approval receipt and evidence references. One operation ID cannot be reused for another proposal in the same scope.

```typescript
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef";
import type { TrustedPublicationApproval } from "./TrustedPublicationApproval";
export type PublicationCommand=Readonly<{operationId:string;proposalDigest:string;approvalRef:string;approval:TrustedPublicationApproval;evidence:PublicationEvidenceRef}>;
```

### `publication/PublicationReceipt.ts`

Records the actual target-side publication, including original operation, proposal, target and before/after revisions. The target adapter must persist this receipt atomically with its authoritative commit or provide equivalent durable reconciliation.

```typescript
export type PublicationReceipt=Readonly<{operationId:string;proposalDigest:string;targetId:string;beforeRevision:string;afterRevision:string;receiptRef:string}>;
```

### `publication/PublicationEffectOutcome.ts`

Distinguishes a confirmed publication, proven no-apply, and unknown effects. A target-changed no-apply result never silently rebases or modifies the approved proposal.

```typescript
import type { PublicationReceipt } from "./PublicationReceipt";
export type PublicationEffectOutcome=Readonly<{status:"published";receipt:PublicationReceipt}>|Readonly<{status:"not-applied";code:"TARGET_CHANGED"|"APPROVAL_INVALID"|"CONTROL_STOP"|"EVIDENCE_CHANGED"}>|Readonly<{status:"unknown"}>;
```

### `publication/IPublicationTarget.ts`

Defines the required real target adapter. Apply must lock/coordinate the actual target, revalidate trusted approval/evidence under its commit protocol, compare the expected revision and old file bytes, load exact artifacts, enforce permitted paths and publish with durable operation idempotency. Reconcile is read-only and never replays an uncertain apply.

```typescript
import type { ChangeProposal } from "./ChangeProposal";
import type { PublicationCommand } from "./PublicationCommand";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IPublicationTarget {
 apply(proposal:ChangeProposal,command:PublicationCommand,context:IExecutionContext):Promise<PublicationEffectOutcome>;
 reconcile(proposal:ChangeProposal,command:PublicationCommand,context:IExecutionContext):Promise<PublicationEffectOutcome>;
}
```

### `publication/PublicationRecord.ts`

Keeps an immutable exact proposal, one durable dispatch claim and its known effect. Null command means waiting; claimed plus null effect means pending reconciliation. Unknown is never stored as terminal success/failure.

```typescript
import type { ChangeProposal } from "./ChangeProposal";
import type { PublicationCommand } from "./PublicationCommand";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome";
export type PublicationRecord=Readonly<{schemaVersion:1;revision:number;proposal:ChangeProposal;command:PublicationCommand|null;effect:Exclude<PublicationEffectOutcome,Readonly<{status:"unknown"}>>|null}>;
```

### `publication/ChangeProposalContract.ts`

Validates exact canonical proposal fields and recomputes its digest. Limits manifests to 32 paths and 8 MiB of replacement artifacts. Content bounds and safe path spelling do not replace host path authorization or actual artifact-byte verification.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { ChangeProposal } from "./ChangeProposal";
import type { ArtifactRef } from "../artifacts/ArtifactRef";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class ChangeProposalContract implements IResultContract<ChangeProposal>{
 readonly id="change-proposal";readonly version="1";
 constructor(private readonly json:JsonValueContract,private readonly digest:IArtifactDigest){}
 async validate(raw:unknown):Promise<ValidationResult<ChangeProposal>>{const checked=await this.json.validate(raw);if(!checked.valid)return checked;const p=checked.value as unknown as ChangeProposal;
  if(!this.keys(p,["id","scope","summary","sourceSnapshotRef","targetId","targetRevision","policy","changes","digest"])||!this.idValue(p.id)||!this.scope(p.scope)||!this.ref(p.summary,1024)||!this.ref(p.sourceSnapshotRef)||!this.idValue(p.targetId)||!this.ref(p.targetRevision)||!this.keys(p.policy,["id","version"])||!this.idValue(p.policy.id)||!this.idValue(p.policy.version)||!this.hash(p.digest)||!Array.isArray(p.changes)||p.changes.length<1||p.changes.length>32)return this.invalid();
  const paths=new Set<string>();let bytes=0;for(const c of p.changes){if(!this.keys(c,["path","beforeDigest","after"])||!this.path(c.path)||paths.has(c.path)||!(c.beforeDigest===null||this.hash(c.beforeDigest))||!(c.after===null||this.artifact(c.after))||c.beforeDigest===null&&c.after===null)return this.invalid();paths.add(c.path);bytes+=c.after?.byteLength??0;if(bytes>8388608)return this.invalid();}
  const {digest,...body}=p,normalized=await this.json.validate(body);if(!normalized.valid||await this.digest.hash(new TextEncoder().encode(JSON.stringify(normalized.value)))!==digest)return this.invalid();return {valid:true,value:p};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private ref(v:unknown,max=256):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=max;}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private hash(v:unknown):v is string{return typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);}
 private scope(v:unknown):boolean{if(v===null||typeof v!=="object")return false;const s=v as Record<string,unknown>;return this.keys(s,s.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])&&this.idValue(s.scopeId)&&this.idValue(s.projectId)&&(s.workspaceId===undefined||this.idValue(s.workspaceId));}
 private path(v:unknown):v is string{return typeof v==="string"&&v.length>0&&v.length<=240&&!/[\\\u0000-\u001f:]/.test(v)&&!v.startsWith("/")&&v.split("/").every(part=>part!==""&&part!=="."&&part!==".."&&part!==".git");}
 private artifact(v:ArtifactRef):boolean{return this.keys(v,["artifactId","digest","byteLength","mediaType","schemaId","schemaVersion"])&&this.idValue(v.artifactId)&&this.hash(v.digest)&&Number.isSafeInteger(v.byteLength)&&v.byteLength>=0&&v.byteLength<=8388608&&this.ref(v.mediaType)&&(v.schemaId===null||this.ref(v.schemaId))&&(v.schemaVersion===null||this.ref(v.schemaVersion));}
 private invalid():ValidationResult<ChangeProposal>{return {valid:false,issues:[{path:[],code:"CHANGE_PROPOSAL_INVALID",message:"Invalid exact change proposal."}]};}
}
```

### `publication/PublicationRecordContract.ts`

Validates the proposal, exact trusted-approval fields, write-ahead evidence and target receipt. Supports only waiting revision 0, pending revision 1 and known-effect revision 2. Approval expiry is checked at execution time; expired historical receipts remain readable.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { PublicationRecord } from "./PublicationRecord";
import { ChangeProposalContract } from "./ChangeProposalContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue";
export class PublicationRecordContract implements IResultContract<PublicationRecord>{
 readonly id="publication-record";readonly version="1";
 constructor(private readonly json:JsonValueContract,private readonly proposals:ChangeProposalContract){}
 async validate(raw:unknown):Promise<ValidationResult<PublicationRecord>>{const checked=await this.json.validate(raw);if(!checked.valid)return checked;const r=checked.value as unknown as PublicationRecord;if(!this.keys(r,["schemaVersion","revision","proposal","command","effect"])||r.schemaVersion!==1||!(await this.proposals.validate(r.proposal)).valid)return this.invalid();if(r.command===null)return r.revision===0&&r.effect===null?{valid:true,value:r}:this.invalid();const c=r.command,a=c.approval,p=r.proposal;
  if(!this.keys(c,["operationId","proposalDigest","approvalRef","approval","evidence"])||!this.idValue(c.operationId)||c.proposalDigest!==p.digest||!this.ref(c.approvalRef)||!this.keys(c.evidence,["reviewRef","verificationRef"])||!this.ref(c.evidence.reviewRef)||!this.ref(c.evidence.verificationRef)||!this.keys(a,["approvalId","principalRef","receiptRef","decision","scope","proposalDigest","targetId","targetRevision","expiresAtEpochMs"])||!this.idValue(a.approvalId)||!this.ref(a.principalRef)||!this.ref(a.receiptRef)||a.decision!=="approved"||same(a.scope)!==same(p.scope)||a.proposalDigest!==p.digest||a.targetId!==p.targetId||a.targetRevision!==p.targetRevision||!Number.isSafeInteger(a.expiresAtEpochMs)||a.expiresAtEpochMs<0)return this.invalid();
  if(r.effect===null)return r.revision===1?{valid:true,value:r}:this.invalid();if(r.revision!==2)return this.invalid();const effect=r.effect;if(effect.status==="not-applied")return this.keys(effect,["status","code"])&&["TARGET_CHANGED","APPROVAL_INVALID","CONTROL_STOP","EVIDENCE_CHANGED"].includes(effect.code)?{valid:true,value:r}:this.invalid();
  if(effect.status!=="published"||!this.keys(effect,["status","receipt"]))return this.invalid();const receipt=effect.receipt;if(!this.keys(receipt,["operationId","proposalDigest","targetId","beforeRevision","afterRevision","receiptRef"])||receipt.operationId!==c.operationId||receipt.proposalDigest!==p.digest||receipt.targetId!==p.targetId||receipt.beforeRevision!==p.targetRevision||!this.ref(receipt.afterRevision)||receipt.afterRevision===receipt.beforeRevision||!this.ref(receipt.receiptRef))return this.invalid();return {valid:true,value:r};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=256;}
 private invalid():ValidationResult<PublicationRecord>{return {valid:false,issues:[{path:[],code:"PUBLICATION_RECORD_INVALID",message:"Invalid publication binding or lifecycle."}]};}
}
```

### `publication/IPublicationStore.ts`

Provides durable exact proposals and one atomic write-ahead command per proposal. Claim returns whether this caller created the command; only that caller may begin apply. Every pending command remains available for read-only reconciliation.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { ChangeProposal } from "./ChangeProposal";
import type { PublicationRecord } from "./PublicationRecord";
import type { PublicationCommand } from "./PublicationCommand";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome";
export interface IPublicationStore {
 readonly scope:ExecutionScopeRef;
 initialize():Promise<void>;create(proposal:ChangeProposal):Promise<PublicationRecord>;get(id:string):Promise<PublicationRecord|null>;
 claim(id:string,command:PublicationCommand):Promise<Readonly<{claimed:boolean;record:PublicationRecord}>>;
 finish(id:string,operationId:string,effect:Exclude<PublicationEffectOutcome,Readonly<{status:"unknown"}>>):Promise<PublicationRecord>;
}
```

### `persistence/publication/PublicationStatements.ts`

Defines framework-owned publication record SQL. A scoped unique operation key prevents reusing one publication operation for different proposals.

```typescript
export type PublicationStatements=Readonly<{schema:string;insert:string;read:string;lock:string;update:string}>;
```

### `persistence/publication/sqlitePublicationStatements.ts`

Uses the existing SQLite transaction adapter and only a framework-owned table. Null operation keys permit multiple waiting proposals; claimed operation IDs are unique within the exact scope.

```typescript
import type { PublicationStatements } from "./PublicationStatements";
export const sqlitePublicationStatements:PublicationStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_publications_v1 (scope_id TEXT NOT NULL,project_id TEXT NOT NULL,workspace_key TEXT NOT NULL,proposal_id TEXT NOT NULL,operation_id TEXT,payload TEXT NOT NULL,PRIMARY KEY(scope_id,project_id,workspace_key,proposal_id),UNIQUE(scope_id,project_id,workspace_key,operation_id))",
 insert:"INSERT INTO kushibot_publications_v1(scope_id,project_id,workspace_key,proposal_id,operation_id,payload) VALUES (?,?,?,?,NULL,?) ON CONFLICT(scope_id,project_id,workspace_key,proposal_id) DO NOTHING",
 read:"SELECT proposal_id,operation_id,payload FROM kushibot_publications_v1 WHERE scope_id=? AND project_id=? AND workspace_key=? AND proposal_id=?",
 lock:"UPDATE kushibot_publications_v1 SET payload=payload WHERE scope_id=? AND project_id=? AND workspace_key=? AND proposal_id=?",
 update:"UPDATE kushibot_publications_v1 SET operation_id=?,payload=? WHERE scope_id=? AND project_id=? AND workspace_key=? AND proposal_id=?"
});
```

### `persistence/publication/postgresqlPublicationStatements.ts`

Uses identical keys and payload semantics with PostgreSQL placeholders and row locking via the no-op UPDATE. No target/network call runs within a SQL transaction.

```typescript
import type { PublicationStatements } from "./PublicationStatements";
import { sqlitePublicationStatements } from "./sqlitePublicationStatements";
export const postgresqlPublicationStatements:PublicationStatements=Object.freeze({schema:sqlitePublicationStatements.schema,
 insert:"INSERT INTO kushibot_publications_v1(scope_id,project_id,workspace_key,proposal_id,operation_id,payload) VALUES ($1,$2,$3,$4,NULL,$5) ON CONFLICT(scope_id,project_id,workspace_key,proposal_id) DO NOTHING",
 read:"SELECT proposal_id,operation_id,payload FROM kushibot_publications_v1 WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND proposal_id=$4",
 lock:"UPDATE kushibot_publications_v1 SET payload=payload WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND proposal_id=$4",
 update:"UPDATE kushibot_publications_v1 SET operation_id=$1,payload=$2 WHERE scope_id=$3 AND project_id=$4 AND workspace_key=$5 AND proposal_id=$6"});
```

### `persistence/publication/SqlPublicationStore.ts`

Persists proposals, atomic dispatch claims and validated final receipts. Exact retries return saved state; conflicting proposal/effect content fails. Independent target commit and SQL acknowledgement are not one transaction, so a crash leaves a pending command for reconciliation.

```typescript
import type { IPublicationStore } from "../../publication/IPublicationStore";
import type { ChangeProposal } from "../../publication/ChangeProposal";
import type { PublicationRecord } from "../../publication/PublicationRecord";
import type { PublicationCommand } from "../../publication/PublicationCommand";
import type { PublicationEffectOutcome } from "../../publication/PublicationEffectOutcome";
import type { PublicationStatements } from "./PublicationStatements";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { ISqlDatabase } from "../sql/ISqlDatabase";
import type { ISqlExecutor } from "../sql/ISqlExecutor";
import { canonicalWorkflowValue as same } from "../../workflows/canonicalWorkflowValue";
import { PublicationError } from "../../errors/PublicationError";
export class SqlPublicationStore implements IPublicationStore{
 readonly scope:ExecutionScopeRef;private readonly key:readonly string[];
 constructor(private readonly db:ISqlDatabase,private readonly sql:PublicationStatements,private readonly codec:IRecordCodec<PublicationRecord>,scope:ExecutionScopeRef){if(![scope.scopeId,scope.projectId,...(scope.workspaceId===undefined?[]:[scope.workspaceId])].every(v=>this.id(v)))throw new PublicationError();this.scope=Object.freeze({...scope});this.key=Object.freeze([scope.scopeId,scope.projectId,scope.workspaceId??""]);}
 async initialize():Promise<void>{await this.db.migrationTransaction(async tx=>{await tx.query(this.sql.schema,[]);});}
 async create(proposal:ChangeProposal):Promise<PublicationRecord>{const payload=await this.codec.encode({schemaVersion:1,revision:0,proposal,command:null,effect:null}),checked=await this.codec.decode(payload);this.bind(checked);return this.db.transaction(async tx=>{await tx.query(this.sql.insert,[...this.key,checked.proposal.id,payload]);const saved=await this.load(tx,checked.proposal.id);if(saved===null||same(saved.proposal)!==same(checked.proposal))throw new PublicationError();return saved;});}
 get(id:string):Promise<PublicationRecord|null>{return this.load(this.db,id);}
 claim(id:string,command:PublicationCommand):Promise<Readonly<{claimed:boolean;record:PublicationRecord}>>{return this.change(id,record=>record.command!==null?{record,result:false}:{record:{...record,revision:1,command},result:true}).then(value=>({claimed:value.result,record:value.record}));}
 async finish(id:string,operationId:string,effect:Exclude<PublicationEffectOutcome,Readonly<{status:"unknown"}>>):Promise<PublicationRecord>{const changed=await this.change(id,record=>{if(record.command?.operationId!==operationId)throw new PublicationError();if(record.effect!==null){if(same(record.effect)!==same(effect))throw new PublicationError();return {record,result:false};}return {record:{...record,revision:2,effect},result:true};});return changed.record;}
 private async change(id:string,change:(record:PublicationRecord)=>Readonly<{record:PublicationRecord;result:boolean}>):Promise<Readonly<{record:PublicationRecord;result:boolean}>>{if(!this.id(id))throw new PublicationError();return this.db.transaction(async tx=>{if((await tx.query(this.sql.lock,[...this.key,id])).affectedRows!==1)throw new PublicationError();const old=await this.load(tx,id);if(old===null)throw new PublicationError();const value=change(old),payload=await this.codec.encode(value.record),record=await this.codec.decode(payload);this.bind(record);if(same(record.proposal)!==same(old.proposal))throw new PublicationError();if((await tx.query(this.sql.update,[record.command?.operationId??null,payload,...this.key,id])).affectedRows!==1)throw new PublicationError();return {record,result:value.result};});}
 private async load(tx:ISqlExecutor,id:string):Promise<PublicationRecord|null>{if(!this.id(id))throw new PublicationError();const rows=(await tx.query(this.sql.read,[...this.key,id])).rows;if(rows.length===0)return null;if(rows.length!==1||typeof rows[0].payload!=="string")throw new PublicationError();const record=await this.codec.decode(rows[0].payload);this.bind(record);if(record.proposal.id!==id||rows[0].proposal_id!==id||rows[0].operation_id!==(record.command?.operationId??null))throw new PublicationError();return record;}
 private bind(record:PublicationRecord):void{if(same(record.proposal.scope)!==same(this.scope))throw new PublicationError();}
 private id(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
}
```

### `publication/PublicationOutcome.ts`

Returns waiting/blocked, pending uncertain work, a known recorded effect, or an explicit stop with the complete durable proposal preserved.

```typescript
import type { PublicationRecord } from "./PublicationRecord";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type PublicationOutcome=
 |Readonly<{status:"waiting-for-approval"|"blocked";code:string;record:PublicationRecord}>
 |Readonly<{status:"pending";record:PublicationRecord;pendingOperationRefs:readonly string[]}>
 |Readonly<{status:"recorded";record:PublicationRecord}>
 |Readonly<{status:"stopped";record:PublicationRecord;reason:ExecutionStopReason;pendingOperationRefs:readonly string[]}>;
```

### `publication/ChangeProposalService.ts`

Creates a canonical digest from the supplied body, validates it and saves the exact waiting proposal. Source completeness/permissions and review still require the separate readiness verifier before publication.

```typescript
import type { IPublicationStore } from "./IPublicationStore";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IClock } from "../contracts/runtime/IClock";
import type { PublicationRecord } from "./PublicationRecord";
import { ChangeProposalContract } from "./ChangeProposalContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue";
import { PublicationError } from "../errors/PublicationError";
export class ChangeProposalService{
 constructor(private readonly store:IPublicationStore,private readonly json:JsonValueContract,private readonly digest:IArtifactDigest,private readonly proposals:ChangeProposalContract,private readonly clock:IClock){}
 async create(body:unknown,context:IExecutionContext):Promise<PublicationRecord>{if(same(context.scope)!==same(this.store.scope))throw new PublicationError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);if(guard.check()!==null)throw new PublicationError();const checked=await this.json.validate(body);if(!checked.valid||checked.value===null||typeof checked.value!=="object"||Array.isArray(checked.value)||"digest" in checked.value)throw new PublicationError();const hash=await this.digest.hash(new TextEncoder().encode(JSON.stringify(checked.value))),proposal=await this.proposals.validate({...checked.value,digest:hash});if(!proposal.valid||same(proposal.value.scope)!==same(this.store.scope)||guard.check()!==null)throw new PublicationError();return this.store.create(proposal.value);}
}
```

### `publication/PublicationCoordinator.ts`

Requires current trusted exact approval and source-bound review/check evidence before the write-ahead claim. Only a successful new claim dispatches apply. Redelivery of pending work never calls apply again; explicit reconcile asks the target for its actual durable outcome without assuming an absent receipt means no effect.

```typescript
import type { IPublicationStore } from "./IPublicationStore";
import type { ITrustedPublicationApprovalReader } from "./ITrustedPublicationApprovalReader";
import type { IPublicationEvidenceVerifier } from "./IPublicationEvidenceVerifier";
import type { IPublicationTarget } from "./IPublicationTarget";
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef";
import type { PublicationOutcome } from "./PublicationOutcome";
import type { PublicationRecord } from "./PublicationRecord";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome";
import type { IClock } from "../contracts/runtime/IClock";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import { PublicationRecordContract } from "./PublicationRecordContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue";
import { PublicationError } from "../errors/PublicationError";
export class PublicationCoordinator{
 constructor(private readonly store:IPublicationStore,private readonly approvals:ITrustedPublicationApprovalReader,private readonly evidence:IPublicationEvidenceVerifier,private readonly target:IPublicationTarget,private readonly records:PublicationRecordContract,private readonly clock:IClock){}
 async publish(id:string,approvalRef:string,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<PublicationOutcome>{
  const record=await this.load(id,context);if(record.command!==null)return this.present(record);const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);let stop=guard.check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[]};if(typeof approvalRef!=="string"||approvalRef.length<1||approvalRef.length>256)return {status:"waiting-for-approval",code:"APPROVAL_REQUIRED",record};
  const approval=await this.approvals.read(approvalRef,record.proposal,context);stop=guard.check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[]};if(approval===null||approval.decision!=="approved")return {status:"waiting-for-approval",code:"TRUSTED_APPROVAL_REQUIRED",record};
  const candidate=await this.records.validate({...record,revision:1,command:{operationId:context.identity.operationId,proposalDigest:record.proposal.digest,approvalRef,approval,evidence}});if(!candidate.valid||candidate.value.command===null)throw new PublicationError();const command=candidate.value.command;
  if(this.clock.nowEpochMs()>=command.approval.expiresAtEpochMs)return {status:"waiting-for-approval",code:"APPROVAL_EXPIRED",record};const verified=await this.evidence.verify(record.proposal,command.evidence,context);stop=guard.check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[]};if(!verified)return {status:"blocked",code:"PROPOSAL_EVIDENCE_UNVERIFIED",record};if(this.clock.nowEpochMs()>=command.approval.expiresAtEpochMs)return {status:"waiting-for-approval",code:"APPROVAL_EXPIRED",record};
  const claim=await this.store.claim(id,command);if(!claim.claimed)return this.present(claim.record);const saved=claim.record.command!;stop=guard.check();if(stop!==null)return this.settle(claim.record,{status:"not-applied",code:"CONTROL_STOP"});let effect:PublicationEffectOutcome;try{effect=await this.target.apply(claim.record.proposal,saved,context);}catch{return this.present(claim.record);}return this.settle(claim.record,effect);
 }
 async reconcile(id:string,context:IExecutionContext):Promise<PublicationOutcome>{const record=await this.load(id,context);if(record.command===null||record.effect!==null)return this.present(record);const stop=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs).check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[record.command.operationId]};const effect=await this.target.reconcile(record.proposal,record.command,context);return this.settle(record,effect);}
 private async settle(record:PublicationRecord,effect:PublicationEffectOutcome):Promise<PublicationOutcome>{if(effect.status==="unknown")return this.present(record);const checked=await this.records.validate({...record,revision:2,effect});if(!checked.valid||checked.value.effect===null)throw new PublicationError();return this.present(await this.store.finish(record.proposal.id,record.command!.operationId,checked.value.effect));}
 private async load(id:string,context:IExecutionContext):Promise<PublicationRecord>{if(same(context.scope)!==same(this.store.scope))throw new PublicationError();const record=await this.store.get(id);if(record===null)throw new PublicationError();return record;}
 private present(record:PublicationRecord):PublicationOutcome{if(record.effect!==null)return {status:"recorded",record};if(record.command!==null)return {status:"pending",record,pendingOperationRefs:[record.command.operationId]};return {status:"waiting-for-approval",code:"APPROVAL_REQUIRED",record};}
}
```

### `examples/publication/createPublicationExample.ts`

Assembles concrete SQL records, canonical proposal preparation and the publication coordinator through the public API. Trusted approval/evidence readers and the actual target adapter are required host capabilities; this factory does not fabricate them.

```typescript
import type { ISqlDatabase, PublicationStatements, ExecutionScopeRef, IArtifactDigest, ITrustedPublicationApprovalReader, IPublicationEvidenceVerifier, IPublicationTarget, IClock } from "../../index";
import { JsonValueContract, JsonRecordCodec, ChangeProposalContract, PublicationRecordContract, SqlPublicationStore, ChangeProposalService, PublicationCoordinator } from "../../index";
export async function createPublicationExample(database:ISqlDatabase,sql:PublicationStatements,scope:ExecutionScopeRef,digest:IArtifactDigest,approvals:ITrustedPublicationApprovalReader,evidence:IPublicationEvidenceVerifier,target:IPublicationTarget,clock:IClock){
 const json=new JsonValueContract(),proposals=new ChangeProposalContract(json,digest),records=new PublicationRecordContract(json,proposals);
 const store=new SqlPublicationStore(database,sql,new JsonRecordCodec(records,json,131072),scope);await store.initialize();
 return Object.freeze({store,proposals:new ChangeProposalService(store,json,digest,proposals,clock),publication:new PublicationCoordinator(store,approvals,evidence,target,records,clock)});
}
```

### `examples/publication/publishLoginChangeExample.ts`

Shows the second phase after preparation/review and trusted human approval. The host supplies the exact saved proposal ID, immutable evidence references and authenticated approval locator. Pending effects are explicitly reconciled, never republished automatically.

```typescript
import type { IExecutionContext, PublicationEvidenceRef, PublicationOutcome } from "../../index";
import { PublicationCoordinator } from "../../index";
export async function publishLoginChangeExample(publication:PublicationCoordinator,proposalId:string,approvalRef:string,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<PublicationOutcome>{
 const result=await publication.publish(proposalId,approvalRef,evidence,context);
 // waiting-for-approval: the host displays the exact manifest/target to an authorized human.
 // blocked/stopped: preserve the proposal and unresolved review/check/control reason.
 // pending: show the operation ID; a later administrative call uses reconcile().
 // recorded: inspect effect.status; not-applied is different from published.
 return result;
}
```

### `tests/publication/checkPublicationFlow.ts`

Runs real SQL proposal/claim/receipt persistence against a disposable injected database while using explicitly offline approval/evidence/target fixtures. Demonstrates exact approval, waiting, unknown effect reconciliation and no automatic second apply. It does not establish production file, authentication or target durability guarantees.

```typescript
import type { ISqlDatabase, PublicationStatements, IArtifactDigest, IExecutionContext, TrustedPublicationApproval, IPublicationTarget, PublicationReceipt, ITrustedPublicationApprovalReader } from "../../index";
import { createPublicationExample } from "../../examples/publication/createPublicationExample";
export async function checkPublicationFlow(database:ISqlDatabase,sql:PublicationStatements,digest:IArtifactDigest):Promise<void>{
 const scope=Object.freeze({scopeId:"publication-check",projectId:"project",workspaceId:"workspace"}),clock={nowEpochMs:()=>100};
 const context:IExecutionContext={identity:{operationId:"publish-login"},scope,signal:new AbortController().signal,deadlineEpochMs:10000,reporter:{async progress(){}}};
 let approval:TrustedPublicationApproval|null=null,applies=0;let actual:PublicationReceipt|null=null;
 const approvals:ITrustedPublicationApprovalReader={async read(reference){return reference==="fixture:approval"?approval:null;}};
 const target:IPublicationTarget={async apply(proposal,command){applies++;actual={operationId:command.operationId,proposalDigest:proposal.digest,targetId:proposal.targetId,beforeRevision:proposal.targetRevision,afterRevision:"target:2",receiptRef:"fixture:target-receipt"};throw new Error("Fixture lost target response after recording its effect.");},async reconcile(){return actual===null?{status:"unknown"}:{status:"published",receipt:actual};}};
 const services=await createPublicationExample(database,sql,scope,digest,approvals,{async verify(){return true;}},target,clock);
 const content=new TextEncoder().encode("new"),hash=await digest.hash(content);
 const prepared=await services.proposals.create({id:"login-proposal",scope,summary:"Add the reviewed login change.",sourceSnapshotRef:"source:isolated-v2",targetId:"original-login",targetRevision:"target:1",policy:{id:"login-publication",version:"1"},changes:[{path:"src/login.ts",beforeDigest:null,after:{artifactId:"change-login",digest:hash,byteLength:content.byteLength,mediaType:"text/plain",schemaId:null,schemaVersion:null}}]},context);
 const check=(value:boolean):void=>{if(!value)throw new Error("Publication acceptance check failed.");};
 const evidence={reviewRef:"fixture:review",verificationRef:"fixture:verification"};
 check((await services.publication.publish(prepared.proposal.id,"fixture:approval",evidence,context)).status==="waiting-for-approval");check(applies===0);
 approval={approvalId:"human-approval",principalRef:"fixture:authorized-human",receiptRef:"fixture:approval-receipt",decision:"approved",scope,proposalDigest:prepared.proposal.digest,targetId:prepared.proposal.targetId,targetRevision:prepared.proposal.targetRevision,expiresAtEpochMs:9000};
 check((await services.publication.publish(prepared.proposal.id,"fixture:approval",evidence,context)).status==="pending");check(applies===1);
 check((await services.publication.publish(prepared.proposal.id,"fixture:approval",evidence,context)).status==="pending");check(applies===1);
 const reconciled=await services.publication.reconcile(prepared.proposal.id,context);check(reconciled.status==="recorded"&&reconciled.record.effect?.status==="published");
 const reopened=await createPublicationExample(database,sql,scope,digest,approvals,{async verify(){return true;}},target,clock);
 check((await reopened.store.get(prepared.proposal.id))?.effect?.status==="published");check(applies===1);
}
```

### `index.ts`

Append the supported proposal, review, approval, target and persistence contracts/classes to the existing public API. Examples/tests remain separate entry points.

```typescript
export * from "./errors/PublicationError";
export * from "./publication/PublicationChange";
export * from "./publication/ChangeProposalBody";
export * from "./publication/ChangeProposal";
export * from "./publication/PublicationEvidenceRef";
export * from "./publication/ReviewFinding";
export * from "./publication/ReviewReport";
export * from "./publication/IReviewReportReader";
export * from "./publication/IPublicationVerificationReader";
export * from "./publication/IChangeProposalVerifier";
export * from "./publication/IPublicationEvidenceVerifier";
export * from "./publication/RecordedPublicationEvidenceVerifier";
export * from "./publication/TrustedPublicationApproval";
export * from "./publication/ITrustedPublicationApprovalReader";
export * from "./publication/PublicationCommand";
export * from "./publication/PublicationReceipt";
export * from "./publication/PublicationEffectOutcome";
export * from "./publication/IPublicationTarget";
export * from "./publication/PublicationRecord";
export * from "./publication/ChangeProposalContract";
export * from "./publication/PublicationRecordContract";
export * from "./publication/IPublicationStore";
export * from "./persistence/publication/PublicationStatements";
export * from "./persistence/publication/sqlitePublicationStatements";
export * from "./persistence/publication/postgresqlPublicationStatements";
export * from "./persistence/publication/SqlPublicationStore";
export * from "./publication/PublicationOutcome";
export * from "./publication/ChangeProposalService";
export * from "./publication/PublicationCoordinator";
```

