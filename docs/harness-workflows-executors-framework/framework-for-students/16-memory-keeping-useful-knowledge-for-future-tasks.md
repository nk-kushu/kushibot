# 16. Memory: Keeping Useful Knowledge for Future Tasks

Imagine your class finishes its wooden bridge project.

During the work, you kept notes about loose supports, missing materials, and the next thing to try. **Most of those notes belong to that particular project.**

But some information may help the next class project:

> Our earlier bridge failed where the supports joined. The test report shows what happened. Next time, inspect those joints before the strength test.

Keeping a useful, supported lesson can save future work. **Remembering every unfinished guess as a permanent fact would create confusion.**

The proposed kushibot framework uses **agent memory** to retain useful knowledge and experience across tasks. This chapter explains the design with illustrative examples, not records from a real execution.

The practical idea is: **validate useful knowledge before saving it, keep its search index current, and retrieve only what the next task needs.** Embeddings help with finding information; RAG puts the retrieved information into a model request.

## Memory Belongs to the Framework, Not the Model's Training

Saving an entry in AgentMemory does not retrain a model or make every future model automatically know it.

The framework stores permitted information, retrieves relevant entries, and supplies selected material to a later worker when appropriate.

```text
Earlier work produces supported information
                  ↓
Configured policy permits retention
                  ↓
Scoped memory stores the entry and its evidence references
                  ↓
A later assignment retrieves relevant entries
                  ↓
The composer selects useful material for the model request
```

A worker without a memory capability remains valid. **Not every task needs to read or write durable knowledge.**

## Four Kinds of Memory

The technical names describe different meanings. Start with the simple questions:

| Kind              | Question it answers                                 | Example                                                                     |
| ----------------- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| Working memory    | What matters while I am doing this assignment?      | Inspect session validation next.                                            |
| Episodic memory   | What happened during earlier work?                  | A callback check failed because the configured address did not match.       |
| Semantic memory   | What supported facts do we know about this project? | The inspected application uses session cookies.                             |
| Procedural memory | What reusable approach may help?                    | Check callback configuration when investigating a similar callback failure. |

An **episode** is a record of a past experience or outcome. A **procedure** is a reusable method or lesson.

Working memory adapts the session's existing notebook and owned working state. **It should not create a second notebook that can disagree with the first.**

Saving working notes to disk does not automatically turn their guesses into confirmed project facts.

## Keep Memory Separate From Run Records

Suppose the Google-login workflow completed investigation but has not implemented anything yet.

Its run records establish that progress. A memory entry cannot replace them or declare the feature finished.

| Information | Its proper job |
| --- | --- |
| Workflow result | Records the accepted outcome of work in this run. |
| Checkpoint and operation records | Support restoring and reconciling execution. |
| Artifact | Holds a produced report or other material. |
| Agent memory | Supplies useful knowledge or experience across tasks. |
| Model context | Presents selected information for the current model request. |

All of these may be saved, but they have different owners and meanings.

Memory is not an unfiltered copy of the conversation or debug log.

## A Useful Memory Needs a Label and a Source

Consider the entry:

> Login uses cookies.

Which project? When was it checked? Is it still true?

A useful entry needs enough information to answer those questions:

```text
Category: Project fact
Project scope: Shop application
Content: Password login uses the inspected session-cookie mechanism.
Evidence: Source references from the accepted investigation.
Source revision: code-r0
Status: Confirmed under the configured policy
Verified at: Recorded verification time
Entry version: 1
```

These are teaching labels rather than a complete storage schema.

The **source and history of a statement** are called its **provenance**. Provenance helps a later worker understand why an entry exists and what it actually supports.

Confidence is not a substitute for provenance. A model's confidence score alone does not prove a remembered claim.

## How to Update Memory Correctly

Think of memory as a set of study cards. Each card contains one useful fact or lesson and says where it came from. When something changes, we check the evidence and revise the card without losing its history.

**The model may propose an update. The framework validates and saves it.**

### When Should We Save Something?

Keep tentative observations in the current notebook. Propose durable memory when useful information has supporting evidence: an accepted investigation finding, a verified outcome, or an explicit user-provided fact or preference with its scope recorded.

We do not need to wait for the whole workflow to finish if a particular finding is already supported. But “the agent suggested a fix” must not become “the fix worked.” A completed step also does not prove every statement in its output.

A useful starting rule is: **save a small, reusable statement with evidence, rather than the whole conversation.**

### The Write Path, Step by Step

1. **Prepare a candidate.** Include the statement, memory category, trusted project scope, evidence references, and source revision. Remove credentials and unnecessary sensitive content.
2. **Find related existing entries.** Check exact identifiers and, optionally, semantic search. Similar wording helps find candidates; it does not prove two statements mean the same thing.
3. **Apply the configured Policy.** Evaluate the evidence and decide whether to add, revise, keep unresolved, or reject the proposal.
4. **Persist the accepted decision.** The memory coordinator and store save the entry and its history. They check that the version being updated has not changed since it was read.
5. **Update the search index.** If embedding search is enabled, schedule indexing for the accepted entry version. Record whether indexing is pending, ready, or failed.
6. **Record the outcome.** A retry uses the same operation ID so it does not create duplicate memories.

| What the candidate means | Appropriate action |
|---|---|
| A new supported fact | Create a scoped entry with evidence. |
| The same supported fact again | Reuse the entry; add useful evidence or refresh verification metadata when justified. |
| A supported change to the same fact in the same scope | Create a new version and mark the previous version superseded for current retrieval. |
| A contradiction without enough evidence | Keep the conflict visible; do not silently replace one claim with another. |
| A guess or irrelevant detail | Keep it tentative where needed, or reject durable retention. |

### Example: A Project Fact Changes

Suppose the current fact is:

```text
Memory ID: shop-session-storage
Version: 1
Fact: Session data is stored in the application's database.
Source revision: code-r0
Evidence: investigation-report-7
```

Later, inspected code and verification evidence show that the project's accepted main-branch implementation now stores session data in Redis.

The framework can save version 2 with the new fact, source revision, and evidence, and supersede version 1 for current use. Version 1 remains a historical record under the retention policy.

An experiment in an isolated workspace must stay labeled with that workspace or branch. It must not replace the main-branch fact before the change actually applies there.

If two workers both try to update version 1, the store accepts only a valid update against the expected current version. The other worker reloads the entry and re-evaluates its proposal. This prevents a later write from accidentally erasing newer evidence.

## Follow Google Login Into a Later Task

Let us follow one agent, Project Helper, across two requests for the same permitted project.

### Step 1: Investigate Google Login

The agent receives:

> Prepare Google-login changes while preserving password login.

Its investigation session reads authorized source and finds how the existing application creates sessions.

The notebook records current findings and source references. These notes belong to the active assignment and can still include open questions.

### Step 2: Produce Actual Outcomes

Implementation, verification, and review proceed through their configured responsibilities.

Suppose the prepared change initially fails a callback-configuration check. A permitted correction resolves the configuration issue, and the required check subsequently passes against the relevant source.

Run records and reports preserve the actual outcomes, including what was prepared, checked, or left unfinished. Preparing changes is not the same as publishing or deploying them.

### Step 3: Record an Episode From the Outcome

A trusted coordinator may record a past-task episode under its retention policy:

```text
Task: Prepare Google-login changes.
Observed issue: Callback configuration did not match the test expectation.
Correction: Configuration was adjusted under the assignment's scope.
Evidence: Recorded check reports and source references.
Delivered outcome: Reviewed preparation, with any limitations stated.
```

The episode must reflect confirmed outcomes and preserve uncertainty. A model saying “deployment succeeded” cannot override records showing that deployment never ran.

### Step 4: Propose a Reusable Lesson

A worker may propose:

> For a similar callback-configuration failure in this project, inspect the configured callback address and the expected address before making unrelated code changes.

This is a memory proposal with supporting references. It is not automatically an active procedure.

The configured validation policy can confirm it, reject it, or leave it unresolved. Human review is required only where that policy calls for it; there is no universal approval step for every memory.

The accepted lesson stays bounded. One callback failure does not prove every future login failure has the same cause.

### Step 5: Start Password Reset With a Fresh Session

Later, Project Helper receives:

> Add password reset to the Shop application.

The new session has its own notebook, conversation, and execution records. It can retrieve permitted project knowledge and relevant past outcomes.

The old session's mutable notebook is not shared as the new session's scratchpad.

### Step 6: Retrieve Only Relevant Knowledge

A scoped query asks for information useful to password-reset planning.

The memory system filters by access, project, category, status, freshness, and configured retrieval rules. It may return the session-cookie fact but omit the callback lesson if that lesson is irrelevant to the current assignment.

Retrieval does not require a vector database. Metadata filters, keyword search, or deterministic lookup can support an initial implementation.

The composer selects bounded summaries and references for the next model request.

### Step 7: Check Whether the Fact Still Applies

Suppose the session implementation has changed since `code-r0`.

The worker uses authorized tools to inspect current evidence instead of blindly treating the old fact as current.

If the old entry is stale, a correction process can mark it disputed or superseded and retain its history. The new task's requirements and actual source remain authoritative.

Useful memory gives the investigation a starting point. It does not eliminate the need to verify important current facts.

## What Is an Embedding?

An **embedding** is a list of numbers produced by an embedding model. Search uses these numbers to find text with a related meaning.

For example:

```text
Stored memory: "Session data is stored in Redis."
Later question: "Where does the application keep login sessions?"
```

The words differ, but embedding search may connect them. The stored text and the query are encoded into a compatible vector space, then compared for similarity. [Sentence Transformers: semantic search](https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html)

Think of the embedding as a card's position on a map of related meanings. It helps locate the card. **It does not prove the card is correct, and it does not replace the card's text.**

The embedding model can be different from the model that writes answers or compresses reports. Use a model intended for retrieval, with its documented query and document settings. Query and stored vectors must use compatible model versions and settings; having the same number of dimensions is not enough.

## What Do We Store?

For our proposed implementation, separate these responsibilities even if one database provides both:

| Stored material | Purpose |
|---|---|
| Memory text, ID, version, scope, status, and evidence references | The authoritative record of what memory was accepted, and why. Original source evidence still determines whether the claim applies. |
| Embedding plus entry ID, version, chunk ID, and filtering metadata | A rebuildable search index that helps locate that record. |

Embed a concise, meaningful statement with necessary context. Keep access scope and lifecycle status as structured metadata rather than relying on words inside the embedded text to enforce them.

A short memory usually needs one searchable passage. A long report may need several meaningful sections, each tied to its source and version. Splitting a report for search does not automatically promote every sentence into confirmed memory.

We send **retrieved text and source references** to the answer-writing model, not the raw embedding numbers.

## Keeping Embeddings Up to Date

**Saving memory and making it searchable are two separate outcomes.** Here is one proposed reliable approach:

1. Save the new memory version and a pending indexing job together in a short database transaction. The job is a durable reminder to update the search index.
2. An indexing worker loads the accepted text and generates its embedding outside the transaction.
3. It writes an index item identified by the entry version, chunk, and embedding configuration. Repeating the same job updates the same item rather than duplicating it.
4. It checks that the version is still eligible and records indexing completion. Old index items are removed or excluded from current retrieval.
5. If indexing fails, retain the saved memory and retry the job. Keyword or direct lookup may still work if configured; vector search must not pretend the new version is already available.

When the embedded text changes, generate a new embedding. If only access or status metadata changes, the vector may be reusable, but its filters and version references still need updating.

Changing the embedding model requires rebuilding the relevant vectors in a compatible index and switching query encoding with it. Do not mix incompatible vectors in one similarity search.

Expiration, supersession, and deletion must also affect retrieval. Recheck each hit against the current memory record before supplying it to the model. A stale index hit must not bring back deleted content or present an old version as current. A deletion marker prevents delayed indexing jobs from restoring deleted entries.

## What Is RAG, and How Do We Use It?

**RAG means retrieval-augmented generation: find useful stored information, add it to the model's input, then ask the model to respond using that information.** It can retrieve from memory, documents, or source material. [Microsoft's RAG explanation](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)

For our framework, the read path would be:

```text
Current assignment
       ↓
Scoped AgentMemory search: keywords and/or embeddings
       ↓
Load permitted entries; check versions, status, and evidence
       ↓
AgentContextComposer selects bounded text and references
       ↓
Model uses that context to plan or answer
```

Follow the updated session-storage fact into a password-reset task:

1. **Form a useful query.** The worker asks where login sessions are stored and how they can be invalidated.
2. **Search only permitted memory.** Trusted host scope supplies the project and access restrictions. Apply them during retrieval, then enforce access again when loading the records. Filtered vector search is one implementation option. [Qdrant's scoped-search example](https://qdrant.tech/documentation/examples/multitenancy/)
3. **Find candidate entries.** Embed the query and search the compatible index. Keyword search can also find exact names such as `SessionService`. Combining keyword and vector results is called hybrid search. [Microsoft's hybrid-search explanation](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
4. **Check the actual records.** Load the current eligible versions, reject superseded or inaccessible hits, and inspect source freshness. Version 2 says Redis; version 1 must not be presented as the current implementation. If evidence conflicts, preserve that uncertainty.
5. **Choose a small useful set.** The retrieval policy ranks eligible candidates. The composer includes relevant text, source versions, and references within its context budget. It does not have to fill a fixed number of results with weak matches.
6. **Use and verify the knowledge.** The model can begin by inspecting the current Redis session code before proposing password-reset changes. If no trustworthy memory is available, use permitted source tools or report the gap.

RAG supplies a starting point for work. It does not guarantee a correct answer, automatically update memory, or replace verification. Any new findings follow the write path before becoming durable knowledge.

## Access Scope Matters

**An agent may have agent-private, project-shared, or task-local information**. A shared storage service does not make every entry visible to every session.

The host supplies the trusted agent, project, and session scope. Storage boundaries enforce that scope too.

A model cannot gain access to another project's memory by changing a project name in a query. A read-only memory view does not automatically provide administrative correction or deletion powers.

Sensitive output needs appropriate sanitization and retention controls. Private reasoning transcripts do not belong in durable memory.

## Remembered Procedures Are Advice, Not New Permissions

A recalled procedure might recommend:

> Run the authentication regression checks after changing login.

That recommendation can guide the current assignment. **It cannot install tools, authorize publication, or enlarge a deadline.**

Likewise, **old knowledge cannot override the user's current requirements**. If a remembered method conflicts with mandatory current instructions, **the framework must preserve the conflict rather than silently follow the memory.**

Contradictory memories should retain their evidence and uncertainty until policy and current inspection resolve them.

## What If Saving Memory Fails?

Suppose the feature preparation has completed, but an optional episode write fails.

The framework records that delivery failure. It does not pretend the episode was saved or rewrite a confirmed task outcome as if the work never happened.

Whether a particular memory write is required or optional is an explicit policy choice. Retry and recovery use stable operation identities to avoid creating duplicate episodes or proposals.

Retention can expire, archive, or supersede entries. Administrative deletion has its own scoped controls and must account for relevant derived indexes and artifacts under the storage policy.

## Memory Decisions Use the Same Policy Idea

All configurable memory decisions use the same contract:

```typescript
interface Policy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

Different concrete policy objects can propose useful knowledge, validate an update, rank eligible results, or decide retention. They receive different data and return different decisions, while sharing the same interface.

The framework's collaborating objects still have distinct jobs:

| Component | Responsibility |
|---|---|
| Scoped AgentMemory | Exposes the worker's permitted memory capabilities. |
| Memory coordinator and store | Validate write preconditions, persist decisions and versions, and track pending indexing work. |
| Embedding adapter | Encodes permitted text and queries using the configured embedding model. |
| Search adapter | Performs filtered keyword or vector search. |
| AgentContextComposer | Includes selected memory text and references in the current model request. |

These are proposed responsibilities; adapter names are illustrative. A policy decision does not itself commit a database write, prove a claim, or grant access. The owning services enforce those boundaries.

For a first implementation, use durable versioned entries, explicit proposal validation, and scoped keyword lookup. Then add embeddings and hybrid retrieval behind the search adapter. Measure whether relevant current facts are found, outdated entries are excluded, and actual tasks improve. Test correction, concurrent updates, failed indexing, and deletion as well as successful retrieval.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does saving an entry train the model permanently?
2. Does a persisted notebook automatically contain confirmed knowledge?
3. Can a past project fact become stale?
4. Should every retrieved memory be included in the next model request?
5. Can a remembered procedure authorize publication?
6. Does an embedding prove a remembered statement is true?
7. What happens when memory is saved but embedding generation fails?
8. Does RAG automatically save the model's answer as new memory?

Possible answers:

1. No. The framework retrieves and supplies selected information later.
2. No. Working notes can contain tentative findings and unanswered questions.
3. Yes. Source changes can require revalidation or correction.
4. No. The composer selects relevant, permitted material within its limits.
5. No. Trusted authorization and execution policies still apply.
6. No. It helps find related text; evidence is still needed.
7. The memory remains saved, indexing stays pending or failed, and the indexing job can be retried.
8. No. New knowledge must follow the proposal, validation, and persistence path.

## Remember These Ideas

- Agent memory supports continuity across tasks without sharing one mutable session notebook.
- Episodes, project facts, and procedures retain their distinct meanings.
- Durable knowledge needs scope, provenance, freshness, and a validation policy.
- Updates preserve history; retries and simultaneous writes must not duplicate or erase knowledge.
- Embeddings are a rebuildable search aid, and their versions must stay aligned with memory.
- RAG retrieves useful text and gives it to the model; it does not retrain the model.
- Retrieved entries are evidence to evaluate, not authority over the current assignment.
- Memory complements run records, artifacts, context, and recovery rather than replacing them.

**Next chapter:** Artifacts: Saving Reports and Other Produced Materials.

[Previous: Context Compression: Keep the Meaning, Use Less Space](15-context-compression-keep-the-meaning-use-less-space.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
