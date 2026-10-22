# Agent Memory Across Tasks and Sessions

## Purpose

The framework must provide an agent-level memory abstraction. An agent built with this framework needs continuity across tasks, workflows, and `AgenticMindUnit` sessions, rather than remembering only the current model conversation.

`AgentMemory` is a capability facade over small memory interfaces. Concrete stores, retrieval strategies, and retention policies are injected. This document specifies standalone framework functionality, not changes to the existing AI Harness.

For the foundational distinction between resumable task state and supported cross-task knowledge, read [Execution State Versus Reusable Knowledge](24-execution-state-versus-reusable-knowledge.md). Both can be durable; they retain different owners, authority, lifecycle, and retrieval rules.

## Ownership and Scope

```text
Agent identity and configuration
  → AgentMemory (scoped capabilities)
    → Working memory: active task/session notes
    → Episodic memory: past tasks and outcomes
    → Semantic memory: supported facts and knowledge
    → Procedural memory: reusable methods and lessons

Agent → workflow run → AgenticMindUnit → isolated AgenticSession
                                      → permitted memory view
```

The agent owns its memory namespace, while a memory store may be shared infrastructure. Explicit scopes determine which entries a particular session can access: agent-private, project-shared, or task/session-local. An agent identity is not a workflow run ID or a session ID.

Each session has isolated working memory. Sessions may share authorized durable memories but must not mutate one another's notebooks. Workflow request/results remain owned by `WorkflowRun`; memory is not a replacement for authoritative run state.

## Memory Types

| Type | Meaning | Example | Typical lifetime |
| --- | --- | --- | --- |
| Working | Current goal reference, draft notebook, recent observations, open questions, next actions. | “Read session creation after inspecting the login route.” | Active task/session; checkpointed for recovery. |
| Episodic | Records of past tasks, outcomes, relevant actions, and lessons with supporting references. | “Google OAuth verification failed because of a callback URL mismatch.” | Across tasks, subject to retention. |
| Semantic | Supported facts about the agent's permitted domain or projects. | “This project uses session cookies.” | Until stale, superseded, expired, or deleted. |
| Procedural | Reusable approaches, checklists, and verified lessons. | “Run these authentication checks after changing login.” | Across tasks, versioned and revisable. |

Short term and long term describe lifetime. Episodic, semantic, and procedural describe meaning. All three may be durable long-term memory. A persisted working notebook remains working memory; saving it does not make its contents confirmed facts.

## OOP Contracts

```typescript
export interface AgentMemory {
  readonly working: WorkingMemory;
  readonly episodes: EpisodicMemory;
  readonly knowledge: SemanticMemory;
  readonly procedures: ProceduralMemory;
}
```

The interfaces below illustrate responsibilities; supporting request/result types and all access checks are framework contracts to implement.

```typescript
export interface WorkingMemory {
  read(): Promise<WorkingMemorySnapshot>;
  revise(change: WorkingMemoryChange): Promise<WorkingMemorySnapshot>;
}

export interface EpisodicMemory {
  recall(query: EpisodeQuery): Promise<readonly Episode[]>;
  record(outcome: TaskOutcomeRecord): Promise<Episode>;
}

export interface SemanticMemory {
  search(query: KnowledgeQuery): Promise<readonly KnowledgeEntry[]>;
  propose(candidate: KnowledgeCandidate): Promise<MemoryProposal>;
}

export interface ProceduralMemory {
  find(query: ProcedureQuery): Promise<readonly ProcedureEntry[]>;
  propose(candidate: ProcedureCandidate): Promise<MemoryProposal>;
}
```

A concrete `ScopedAgentMemory` facade delegates to injected collaborators and captures trusted identity/project/session scope at construction. Scope enforcement must also happen at storage boundaries; a model-provided agent or project ID cannot grant access.

`WorkingMemory` adapts the current session's existing `DraftNotebook` and other explicitly owned working state. Do not create a second independently mutable copy of the notebook. The session continues to own conversation protocol and execution counters.

Use separate read-only views when a unit only needs retrieval. Administrative correction, deletion, and approval APIs belong to trusted management capabilities, not automatically to every unit's tool registry.

## Memory Entries and Provenance

Durable entries need stable IDs and explicit metadata:

- Agent/project scope and authorized visibility.
- Memory category and schema version.
- Content or bounded artifact reference.
- Source task/run/session references and supporting evidence.
- Creation/update times, verification time, expiry where appropriate.
- Record version for optimistic concurrency, and superseded-entry references.
- Status such as proposed, confirmed, disputed, or superseded.

Distinguish observations, agent interpretations, and verified facts. A confidence value, if used, records its origin and must not be treated as proof. Repository revision, document version, or source fingerprint helps determine whether a remembered project fact is stale.

For episodes, distinguish confirmed outcomes from interrupted or uncertain actions. A model saying “the task succeeded” does not override the persisted workflow result or verification evidence.

## Read Path: Retrieval into Model Context

1. The coordinator creates a scoped memory view for the trusted agent, project, and session.
2. A unit requests relevant episodes, facts, or procedures for its current goal.
3. Retrieval applies access filters, category/status rules, expiry checks, and ranking through injected strategies.
4. Results include provenance and freshness metadata. Contradictions and uncertainty remain visible rather than being silently collapsed into one answer.
5. `AgentContextComposer` selects bounded summaries/references within the model context budget alongside the assignment and current notebook.
6. The model can consult source evidence with allowed tools. Retrieved memory is evidence to evaluate, not an instruction that overrides the assignment or permissions.

A vector index is optional. Keyword search, metadata filters, or deterministic lookup can be the first standalone implementation. Durable storage remains the source of truth; a search index is a rebuildable retrieval aid.

## Write Path: From Work to Durable Memory

Working notes can be revised during execution. Durable knowledge follows explicit promotion:

```text
Observation or lesson
  → Memory proposal with evidence
  → Injected validation/approval policy
  → Confirmed entry, rejected proposal, or unresolved proposal
```

The policy can use trusted verification evidence or require human review where configured. No universal human-approval step is required. Agent assertions alone must not silently become confirmed knowledge or active procedures.

A trusted coordinator can record an episode from the actual task outcome under its configured retention policy. Semantic and procedural entries are proposed separately; not every episode needs to produce a new fact or procedure.

Use idempotency keys such as outcome ID plus memory category to avoid duplicates after retry. Record correction/supersession instead of silently overwriting provenance. Use optimistic concurrency or another explicit conflict policy for simultaneous updates. Do not hold a database transaction open around an LLM call.

Procedural memories are advisory task knowledge. Promoting a procedure does not grant tool permissions, install executable code, or change immutable framework policies.

## Recovery, Retention, and Deletion

Session checkpoints preserve references or consistent snapshots of working state alongside protocol state, counters, and pending operations. Durable memory operations have stable IDs and recoverable outcomes so resume does not duplicate episodes or proposals.

An episode write failure must not retroactively change a completed task into an uncompleted task. Define whether a particular durable memory write is required or optional, record its delivery state, and retry/reconcile independently. Pending memory writes remain visible and never masquerade as successful persistence.

Retention policies can archive or expire episodes, compact working notes, and revalidate stale facts. Deletion covers primary records, derived indexes, and artifacts under the applicable retention policy. A tombstone prevents deleted content from being reintroduced by delayed indexing or replay. Backup retention and deletion limitations must be documented by concrete storage adapters.

Framework-owned export/inspect operations should show authorized memory entries, evidence, revisions, and pending proposals. Sanitize credentials and sensitive tool output before retention; do not store private reasoning traces as agent memory.

## AgenticMindUnit Integration

A unit can receive an optional scoped memory capability through its definition or constructor-injected session factory. Document one ownership path in implementation; do not hide a global memory store in model adapters.

Expose retrieval and proposal tools only when explicitly included in the unit's registry. A no-memory unit remains valid and deterministic executors need not use agent memory. The assignment is authoritative regardless of retrieved memories.

The four layers remain distinct:

| Layer | Owner | Purpose |
| --- | --- | --- |
| Model context | `AgentContextComposer` | Bounded input for one model call. |
| Session working state | `AgenticSession` / `DraftNotebook` | Active work and resumable loop execution. |
| Workflow results | `WorkflowRun` | Authoritative outputs and lifecycle of one workflow run. |
| Durable agent memory | Scoped `AgentMemory` collaborators | Useful knowledge and experience across runs. |

## Example: Google Login, Then Password Reset

1. Agent `developer-agent` receives “Add Google login” for project `shop`.
2. Its unit retrieves a supported fact that authentication uses session cookies, a prior callback-URL failure episode, and an authentication verification procedure.
3. It checks current files and discovers the fact still applies. Working notes capture current findings and next actions.
4. Implementation and verification produce persisted workflow results. These results become inputs to subsequent workflow steps.
5. The coordinator records an episode using the confirmed task outcome and evidence references.
6. A reusable callback-configuration lesson is proposed as procedural memory. The configured policy confirms it only when the supporting evidence satisfies its rules.
7. Later, the same agent receives “Add password reset.” A fresh session has its own notebook but can retrieve permitted project facts, procedures, and previous outcomes.
8. If authentication has since changed, stale knowledge is flagged, checked, and corrected or superseded. The agent does not blindly reuse the old fact.

## Debug Events

Use the shared scoped recorder for `memory.query.started/completed/failed`, `memory.entry.selected`, `memory.proposal.created`, `memory.validation.decided`, `memory.write.persisted/failed`, and memory correction/expiry/deletion events.

Record memory category, scope references, entry/revision IDs, retrieval reason, freshness status, evidence references, durations, and sanitized counts/summaries. This should explain which memories influenced a model call without copying unrestricted memory content into events. Tie selected entries to the relevant model-call/session trace.

Debug timelines are diagnostic records, not a substitute for memory storage. Agent memory is not an unfiltered copy of the event log.

## File Organization and First-Version Scope

Add a `memory/` folder inside the framework's dedicated folder. Keep `AgentMemory.ts`, `ScopedAgentMemory.ts`, and small category contracts together with cohesive folders for entries, retrieval, promotion, policies, and storage adapters. Export supported capabilities through `index.ts`.

The first version includes session-working-memory integration, durable episodic/semantic/procedural contracts, a standalone durable storage adapter, scoped deterministic retrieval, explicit proposal validation, retention/correction primitives, and correlated debug events. An in-memory fake is useful for tests but does not demonstrate persistence across process restarts. Hosted vector databases and production-scale retrieval infrastructure are optional implementations.

Test namespace isolation, independent session notebooks, retrieval budgets, provenance, stale/conflicting entries, idempotent writes, concurrent revisions, proposal promotion/rejection, deletion/index consistency, failure/recovery, and restart persistence. Provide a standalone example spanning two tasks that shows what is retained and retrieved.

[AgenticMindUnit](12-agentic-mind-unit.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## Memory Selection and Validation Are Policies

Use Policy<MemoryRetrievalInput, MemorySelection> for configurable relevance/freshness selection and Policy<MemoryProposalInput, MemoryValidationDecision> for proposal validation. The memory coordinator awaits apply(), checks trusted scope and provenance, then reads or commits through the existing store contracts. A policy selection does not grant access, turn uncertainty into a fact, or replace current run state. Retention decisions also follow Policy; the retention service owns protected-reference checks and actual cleanup.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

