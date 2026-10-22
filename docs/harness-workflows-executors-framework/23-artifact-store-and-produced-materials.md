# ArtifactStore: Saving Reports and Passing Them Between Steps

Imagine the agent is adding Google login. It runs the project's checks and produces a detailed report. The next step needs to review that report, and you may want to inspect it later.

ArtifactStore gives that report a place to live. The executor saves it and receives a reference. Other steps can use the reference to read the same material without copying the entire report into every result or model prompt.

An artifact can also be an investigation report, diff, screenshot, guard report, generated document, or frozen file content. The examples below describe the proposed framework API, not an already implemented library.

## A Report and a Result Are Different Things

Suppose a callback check fails. The executor returns a short result saying that checks failed, together with a reference to the detailed report:

```text
Step result:
  passed: false
  summary: Callback configuration check failed.
  report: reference to artifact-17

ArtifactStore:
  artifact-17 contains the detailed report.
```

The step result belongs to the current StepRun and is saved through RunRepository. The report's content belongs in ArtifactStore. The workflow can use the small result to decide what to do next; a reviewer opens the report when it needs more detail.

Saving the report successfully does not mean the checks passed. It also does not mean the step result has been saved, the whole run completed, or the code was published. Those are separate actions with their own owners.

Small outputs can stay directly in a step result. You do not need to create an artifact for every string or boolean.

## Save the Report from an Executor

The executor receives a scoped store through ExecutionContext.artifacts. This sketch shows the relevant part of a verification executor; input, context, and the injected verification capability are supplied by the surrounding class.

```typescript
const checkReport = await this.verification.check(input, context.signal);

const report = await context.artifacts.write(
  {
    name: "google-login-checks.json",
    kind: "verification-report",
    mediaType: "application/json",
    schemaId: "verification-report",
    schemaVersion: 1,
    data: new TextEncoder().encode(JSON.stringify(checkReport)),
    idempotencyKey: "verification-report/main",
  },
  { signal: context.signal },
);

return {
  passed: checkReport.passed,
  summary: checkReport.summary,
  report,
};
```

The check capability produces validated, bounded diagnostics from the actual checks. It must limit captured output before building an enormous in-memory report. The store applies its own content, access, size, and storage limits as well.

The report's name is a display label, not permission to choose an arbitrary filesystem path. The store decides where the bytes go and derives trusted ownership from the run, step, attempt, and project scope.

The idempotency key identifies this producer operation within that trusted scope. If a retry saves the same bytes for the same operation, it can receive the existing reference. Reusing that operation/key for different bytes is a conflict. A new check execution needs a distinct operation identity, even if its report has the same display name.

If a required report cannot be saved, the executor must not invent a reference or claim it was stored. The framework records the failure and follows its recovery policy.

## Pass a Reference to the Next Step

A reference describes the saved material without containing the full report:

```typescript
interface ArtifactRef {
  readonly artifactId: string;
  readonly digest: string;
  readonly byteLength: number;
  readonly mediaType: string;
  readonly schemaId?: string;
  readonly schemaVersion?: number;
}
```

The store computes the digest and byte count. The digest identifies the exact content. Metadata records who produced it, the relevant source revision, and other evidence references.

After the verification result is accepted and saved, the review step's input policy can select its report:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class ReviewInputPolicy implements Policy<ReviewWorkflowContext, ReviewInput> {
  async apply(context: ReviewWorkflowContext): Promise<ReviewInput> {
    const { results } = context;
    return {
      summary: results.verify.summary,
      report: results.verify.report,
    };
  }
}

const stepConfiguration = { inputPolicy: new ReviewInputPolicy() };
```

This is a builder policy-configuration excerpt. The next executor receives the selected input, not the entire previous conversation or unrestricted access to the run.

The reference is not a permission token. A reviewer needs authorized access to the upstream artifact. Knowing another project's artifact ID does not grant that access.

## Read and Understand the Report

Inside the review executor, the scoped reader retrieves the report:

```typescript
const document = await context.artifacts.read(input.report, {
  maxBytes: 256 * 1024,
  signal: context.signal,
});
```

The size is illustrative. A full read that cannot fit its limit fails visibly; it must not silently return a truncated document as if it were complete. Larger material needs an explicit bounded excerpt or streaming interface.

The store verifies access, readiness, size, and integrity. The consumer then checks that the material has the expected format and schema before using it:

```typescript
if (
  document.ref.mediaType !== "application/json" ||
  document.ref.schemaId !== "verification-report" ||
  document.ref.schemaVersion !== 1
) {
  throw new Error("Unsupported verification report");
}

const raw: unknown = JSON.parse(
  new TextDecoder("utf-8", { fatal: true }).decode(document.data),
);
const evidence = this.verificationReportContract.parse(raw);
```

The injected contract performs runtime validation. A TypeScript cast would not check the actual JSON. The plain error keeps this example short; implementation uses the framework's documented typed errors for unsupported content, parsing, and validation failures.

Integrity means the bytes match their saved digest. It does not prove that a model's interpretation is correct. The reviewer still considers the actual check evidence and its source version.

The model context composer selects only the relevant material that fits the model's limits. Storing a large report does not make the entire report suitable for every prompt.

## Read Large Artifacts a Piece at a Time

A report can be too large to read in one model call. The framework should provide an explicit readPage() operation so the model can inspect one bounded part and request the next part only when needed. The existing read() still means a complete read within its limit; it must never silently become a partial read.

For a text report, the first request could look like this:

```typescript
const page = await context.artifacts.readPage(
  {
    reference: input.report,
    maxLines: 100,
    maxBytes: 16_384,
  },
  { signal: context.signal },
);
```

The proposed response contains the content, its location, and a continuation cursor:

```typescript
{
  content: "...the first part of the report...",
  range: { firstLine: 1, lastLine: 80 },
  nextCursor: "opaque-continuation-token",
  done: false,
}
```

Here the byte allowance was reached before 100 lines. The actual range tells the reader what it received. The cursor remembers where to continue:

```typescript
// Request another page only when the previous response has nextCursor.
const nextPage = await context.artifacts.readPage(
  {
    reference: input.report,
    cursor: page.nextCursor,
    maxLines: 100,
    maxBytes: 16_384,
  },
  { signal: context.signal },
);
```

These are proposed API examples, with illustrative limits. A finished response has done=true and no nextCursor. A timeout, expired artifact, invalid cursor, or exhausted quota is a separate outcome, not a claim that the end of the report was reached.

The cursor is opaque: the model passes it back rather than calculating offsets. It binds the exact artifact identity/digest, reader format, position, and any query/filter settings. Validate it on each request and reject mismatched, malformed, or expired cursors. A reference or cursor never replaces an access check.

Text pages preserve valid character boundaries and report their locations. Very long lines or records need an explicit bounded-fragment contract or a clear size-limit outcome; do not return the same empty, non-advancing page forever. Structured JSON is better read as selected records or paths, such as entries in checks, rather than cutting arbitrary bytes and pretending each fragment is a complete JSON document. Binary artifacts use supported metadata or derived previews instead of raw text paging.

Reading only a page also means seeing only part of the evidence. A review must not claim that the entire report passed validation or was inspected because one excerpt looked fine.

## Search Before Reading Every Page

The model often needs the failed callback check rather than the whole report. A bounded search can return relevant excerpts and their locations first:

```typescript
const matches = await context.artifacts.search(
  {
    reference: input.report,
    query: "callback",
    maxMatches: 5,
    maxBytes: 8_192,
  },
  { signal: context.signal },
);
```

The model can then inspect surrounding content through a reader-supported location or continuation contract. If the search stops at a scan/time/result limit, its response must show incomplete coverage and a supported continuation where available. No match in a partially searched report does not mean the text is absent everywhere.

The framework caps page/search requests and responses. Model-supplied limits can reduce those caps, not enlarge them. Count cumulative reads, scanned/returned bytes, time, and model-context consumption against the applicable limits; thousands of small pages are not free. Debug events record artifact identity, ranges or search summaries, continuation/end status, and usage without copying unrestricted content.

Keep this OOP design behind narrow paged/search reader capabilities implemented by the scoped artifact service. Registered text, structured-record, and supported binary-preview readers own their different behavior. Executors and the agentic loop should not grow a format switch or load the whole artifact into memory just to return a small page.

Expose these operations to a model only through explicitly permitted artifact tools. Full read(), bounded readPage(), and search() share authorization, immutable-content identity, cancellation, retention, and resource policies, while making their different coverage clear.

## Keep Saved Content Stable

Once an artifact is ready, its bytes cannot be replaced under the same identity. If the agent fixes the callback and runs checks again, it creates a new report. The earlier failed report remains tied to the earlier source revision.

This lets a reviewer distinguish what failed before the fix from what passed afterward. A friendly name such as latest-report must not replace an exact reference in a checkpoint or approved proposal.

Stable content does not mean permanent retention. The framework can expire or delete artifacts under policy. Required checkpoint, review, or publication materials need protection while they are still in use. A pin is a recorded instruction to keep that material for the required lifetime.

If an artifact needs correction or redaction, create a replacement with provenance and restrict/delete the old material as authorized. Update or invalidate dependent references where needed. Do not silently put different bytes behind an old approved identity.

## Build the Store from Replaceable Objects

ArtifactReader provides the read capability. ArtifactWriter provides creation. ArtifactStore combines them. A component that only reviews evidence can receive ArtifactReader rather than a writable store or administrative deletion tools.

The readonly artifacts property in ExecutionContext prevents ordinary TypeScript reassignment of the store reference. It does not make the store's methods read-only or replace runtime authorization.

A ScopedArtifactStore coordinates access and policies. An ArtifactStorageAdapter handles the bytes, while an ArtifactMetadataRepository keeps identity, provenance, and lifecycle records. ArtifactPolicy governs capture, limits, and access; ArtifactRetentionService manages protected references and cleanup.

A filesystem adapter can implement standalone storage. An object-storage adapter can implement the same boundary later. Constructors receive these collaborators through interfaces, so executors do not switch on backend names or construct hidden storage clients.

Keep the public contract in contracts/ArtifactStore.ts and concrete implementations in a cohesive persistence/artifacts/ or persistence/adapters/artifacts/ module. Use one owner rather than creating competing artifact stores inside memory or agentic execution. Export supported contracts through index.ts.

## Fit Artifacts into the Rest of the Framework

A notebook can record a finding and cite its report. AgentMemory can retain a supported lesson with an evidence reference. Neither action turns the report into a confirmed fact automatically. A checkpoint can reference saved material, but CheckpointStore still owns the protocol and execution state needed to resume.

Debug events record safe summaries, IDs, sizes, durations, and references. They should not duplicate unrestricted report contents. Model tools may expose narrow artifact capabilities when explicitly allowed; having a store on the executor's context does not automatically grant every model a storage tool.

OOP and ESLint guards can save source-versioned reports. Fix assignments use their findings and references. A later passing report must not be relabeled as checking an earlier or different source revision.

Publication can use artifacts for the exact proposed file contents. The user approves a frozen change set, and WorkspacePublisher reads those approved bytes after validating approval and target conflicts. Saving an artifact does not edit workspace files or authorize publication. Missing or changed required content cannot be replaced under the old approval.

## Save Reliably and Recover Honestly

A write first validates scope and limits, stages bytes, confirms durable content and metadata, and only then returns a ready reference. Staged material is not a completed artifact. If bytes and metadata use separate stores, the adapter needs explicit commit and reconciliation rules rather than pretending they form one automatic transaction.

A crash can happen after the report is saved but before the step result is recorded. Recovery uses the operation identity and saved outcome to attach the existing reference once. It should not blindly rerun external checks or edits just to recreate a report. A producer lease or pin protects the artifact during that persistence gap.

Keep missing, expired, denied, corrupt, oversized, cancelled, conflicting, and unavailable outcomes distinguishable. An optional diagnostic write failure must not replace the original task error. Required evidence failure remains visible.

Access checks happen at each operation. Capture rules exclude credentials, private reasoning traces, and disallowed content. Stored text remains evidence, not instructions that override the assignment or permissions. Preview tools must not execute content simply because it is an artifact.

Bound object and total bytes, counts, transfer time, concurrent work, and retention. Streaming limits apply as data arrives. Cleanup coordinates bytes, metadata, references, and derived indexes without quietly removing pinned recovery or approval evidence. Document any backup-retention limitations.

Test the public save/read behavior, immutable revisions, access, size limits, idempotency, restart persistence, corruption, pins/deletion, and safe debug events. Tests should also cover the gap between artifact creation and parent-result persistence. Add paging/search checks for correct continuation without gaps or repeats, immutable-version binding, access, malformed/stale cursors, character/record boundaries, oversized records, partial search coverage, cancellation, and cumulative limits. A durable standalone adapter proves recovery in a way an in-memory fake cannot.

For the complete report-to-result flow, read [Executors and Contracts](03-executors-and-contracts.md). The [full agent example](25-complete-agent-example-all-framework-features.md) follows investigation, verification, guards, and publication using the same artifact references.

[ExecutionContext](10-step-runner-and-contexts.md) · [State Machines](22-state-machines-and-coordinated-lifecycles.md) · [Limits](18-limits-budgets-and-execution-control.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## Artifact Decisions Are Shared Policies

ArtifactPolicy names a concrete policy role using Policy<ArtifactPolicyInput, ArtifactPolicyDecision>. Capture, retention, and selection policies all use apply() with their own typed data. The scoped store/runtime checks trusted access and enforces size/durability rules; the policy does not write bytes or mark a step completed. Input policies forward accepted ArtifactRef values to downstream executors, while actual reads still use the authorized ArtifactReader capability.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

