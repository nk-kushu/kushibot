# Rolling Context and Compression

An agent can work on a task for a long time, but a model can only read a limited amount of information in one request. Eventually, the conversation, file contents, and tool results become too large to send together.

The framework needs a way to keep the agent informed without sending its entire history every time. This is the purpose of **rolling context**.

This chapter describes the proposed behavior for kushibot. The classes and policies discussed here belong to the framework design; they are not implemented APIs yet.

## The Agent Remembers More Than the Model Sees

Imagine asking an agent to add Google login. During its investigation, it reads fifty files, searches the project, examines dependencies, and checks the existing authentication tests.

All of that work may produce thousands of lines. The next model call rarely needs every line. It might need the original goal, the authentication findings, a few relevant code excerpts, the current notebook, and the most recent test output.

The framework therefore separates **stored information** from **information included in the next model request**. Removing an old observation from the request does not have to delete it from storage. Important reports can remain in ArtifactStore, and execution state remains with its existing owners.

The model sees a useful view of the task. That view is not the complete record of the task.

## How the Context Rolls Forward

Before each model call, `AgentContextComposer` prepares the information the model will receive. It works from the current assignment, required instructions, session notebook, relevant evidence, and recent observations.

After the model searches the workspace, the new search result becomes part of the next view. After it reads a relevant file, that excerpt may replace an older, less useful excerpt. Earlier findings can be represented by a short summary with references to their sources.

For our Google-login example, a later request might contain:

```text
Goal: Add Google login while preserving password login.
Rules: Work in the isolated workspace. Do not publish changes.

Earlier findings:
Authentication is handled by AuthService.
Password login has regression tests that must keep passing.
The investigation report contains the source references.

Current notebook:
The callback handler is implemented.
Next: fix the failing callback-state test.

Recent observation:
The callback-state test failed because expired state was accepted.
```

This is rolling context: the request changes as the work progresses, while the authoritative goal and rules remain available. It is more deliberate than simply keeping the last ten messages.

## When Compression Becomes Necessary

The composer must stay within the selected model's context capacity and the framework's configured allocation. It must also leave room for the model's answer and account for tool definitions and other request overhead.

A context policy should act before the request becomes too large. First, it can leave out irrelevant material or use a bounded excerpt. When older observations are still useful but too long, it can replace them with a shorter summary.

That replacement is **context compression**. For example, a large investigation transcript can become a paragraph explaining the authentication design, with references to the report and source files.

A separate summarization model may help, but its calls consume the same applicable budgets. Compression does not reset the run's token allowance or create additional permissions. If no safe request fits, the session must report a clear context-limit outcome instead of silently dropping essential information.

## Why Compression Can Go Wrong

A summary can omit a condition, turn a guess into a fact, or lose the reason behind a decision. Repeatedly summarizing summaries can make those mistakes worse.

Suppose the investigation found that Google login must preserve password login and reject expired callback state. A careless summary might retain only “add Google login.” The agent could then produce working Google login while breaking an existing requirement.

The framework should rebuild important parts of context from authoritative records rather than relying on a chain of summaries. The original assignment and required guard instructions remain authoritative. Summaries preserve source references, uncertainty, unresolved questions, and the evidence behind important findings. A summary is derived information, not proof that an action succeeded.

When precision matters, the agent should reopen the original evidence. If workspace files have changed, an earlier summary about those files may be stale and must be checked against the current workspace.

## What Must Survive

The context policy must preserve the current goal, required rules, relevant acceptance criteria, and unfinished work. Required instructions must remain explicitly represented in a form the model can use; a reference alone is not enough when the model needs the rule to act correctly.

Pending tool actions need special care. If a file write was dispatched but its outcome is unknown, compression must not turn that uncertainty into “file saved.” The execution system retains the operation identity and reconciles its outcome before allowing unsafe repetition. Any pending model/tool protocol must also remain valid; compression cannot leave an orphaned tool response or discard a required call identifier.

The model request can describe that uncertainty briefly. Durable execution records retain the exact information needed to recover. A short summary never replaces a checkpoint or an operation journal.

## Where This Fits in the OOP Design

`AgenticMindUnitRunner` owns progression through the session and asks `AgentContextComposer` to prepare each model request. The composer uses an injected context policy to decide what fits. A summarization capability can be injected when needed, and model-provider adapters handle provider-specific request formats and token accounting.

This keeps context management replaceable. An agent handling small tasks could use a simple policy that retains recent observations. A research agent could use a policy that retrieves reports and maintains structured summaries. Both use the same session machinery.

`DraftNotebook` records active findings and next actions. `ArtifactStore` holds reports and other produced material. `AgentMemory` supplies selected knowledge from earlier tasks. The composer selects relevant material from these sources; it does not become their owner or copy everything into one universal context object.

## Make Context Changes Visible

Debug events should explain when context was rebuilt or compressed, which policy was used, which source references were retained, and the estimated size before and after. A failed compression should be visible too.

These events use safe summaries and identifiers rather than recording every private prompt or document. They follow the same `KUSHIBOT_LOG_ENABLED` and `KUSHIBOT_LOG_LEVEL` controls as the other optional diagnostic events.

In the Google-login task, a developer should be able to see that an old investigation transcript was replaced by a referenced summary, while the password-login requirement remained in the request. That makes it possible to distinguish a coding mistake from missing context.

For the first implementation, a reasonable starting point is bounded recent observations, a structured notebook, explicit artifact references, and an optional validated summary of older evidence. More advanced retrieval can be introduced behind the same interfaces later.

Related chapters: [AgenticMindUnit](12-agentic-mind-unit.md), [Agent Memory](13-agent-memory.md), [Limits and Budgets](18-limits-budgets-and-execution-control.md), [Model Routing](19-hierarchical-task-aware-model-routing.md), and [Execution State Versus Reusable Knowledge](24-execution-state-versus-reusable-knowledge.md).

## Context Selection Uses the Common Policy

There is no separate ContextPolicy interface. AgentContextComposer receives Policy<ContextPolicyInput, ContextSelection> and awaits contextPolicy.apply({ material, budget }) before each model call. EditingContextPolicy and InvestigationContextPolicy are interchangeable concrete implementations for their respective setups. Evidence selection can itself use a typed Policy dependency. The composer measures the complete request, invokes configured compression where appropriate, and rejects an unsafe fit; selection alone does not establish token capacity. The runner still owns session progression.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to the table of contents](harness-workflows-executors-framework-idea.md)

## Preserve the Opportunity for Provider Prompt Caching

AgentContextComposer and the selected provider adapter must preserve stable ordering and representation of unchanged material across compatible calls. Build the request to enable provider prompt caching; do not rewrite stable instructions, shuffle tools, or prepend changing metadata unnecessarily. Compression legitimately changes the prefix: establish a new stable structure after an accepted summary, preserving message authority and current evidence. Correct context takes priority over reuse. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

