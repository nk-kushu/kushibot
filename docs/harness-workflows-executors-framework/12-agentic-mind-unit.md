# AgenticMindUnit: One Goal, a Model, and Tools

An AgenticMindUnit lets a model work toward one clear goal. It can call tools, inspect their results, keep working notes, and continue until it produces an acceptable result or must stop.

This is a reusable building block in kushibot's proposed first version. Investigation, planning, and editing executors can use it with different assignments. They do not each need their own implementation of the model/tool loop.

## Give It an Assignment

Suppose the user asks for Google login. Before editing anything, the investigation executor gives a unit this assignment:

```text
Goal: Explain how authentication currently works.
Tools: Search files, read files, update working notes.
Constraint: Do not edit source files.
Expected result: Findings supported by file references.
Limits: A bounded number of calls, tokens, and time.
```

The model is an injected capability. The tools are registered objects that the framework permits this unit to use. The model cannot grant itself another tool, rewrite its assignment, or raise its limits.

An editing executor can use the same unit design with a different goal and explicit write tools inside an isolated working copy. Applying changes to the original still belongs to [user-approved publication](21-isolated-workspaces-review-and-publication.md).

## Let It Work Through the Problem

The model first asks to search for authentication code. The framework validates and runs that allowed tool, then returns its observation. The model may next ask to read the login route and inspect the session service.

```text
Assignment → model → allowed tool → observation → model again
                                                  ↓
                                         result or stop
```

During this work, DraftNotebook holds concise findings, evidence references, open questions, and next actions. For example: “Login creates a session cookie. Next, find where the session is validated.” These notes help continue the task; they are not a private reasoning transcript or automatically confirmed long-term knowledge.

AgenticMindUnit is the public capability. AgenticMindUnitRunner coordinates the loop. Each invocation gets an isolated AgenticSession holding its conversation, notebook, counters, and pending operations. Two invocations do not share mutable working notes merely because they use the same runner.

## Return a Result, Not Just a Claim

Eventually the model proposes findings and source references. The framework validates the output contract and applies the completion policy. A model saying “done” is not enough, and a correctly shaped answer is not proof that every claim is true. Verification and review can still evaluate it.

The unit returns a completed result or an explicit failed, stopped, cancelled, or interrupted outcome. The executor maps that outcome into its typed task result. StepRunner returns it to the coordinator, which accepts and saves it before later workflow steps use it. Longer reports can live in [ArtifactStore](23-artifact-store-and-produced-materials.md).

The workflow chooses the next assignment. The unit handles the model/tool work inside the current assignment. You can also invoke a unit directly without creating a workflow.

## Keep Work Bounded and Recoverable

Every iteration respects cancellation, tool permissions, and the session's remaining allowance within the shared run budget. A new session, retry, or model change does not reset consumed usage. If further work is not allowed, return an honest stopped outcome with available progress.

Checkpoints preserve more than notes: they also need the conversation/tool protocol, usage references, and pending operation identities. After interruption, reconcile uncertain effects before repeating an edit. Recreate live services and signals on resume rather than serializing clients. The [limits](18-limits-budgets-and-execution-control.md) and [state-machine](22-state-machines-and-coordinated-lifecycles.md) chapters explain those rules.

The shared debug recorder follows model calls, tools, notebook changes, validation, and recovery using the correct session identity. Record safe summaries and evidence references, not secrets or unrestricted content.

## Connect It to the Rest of the Agent

[Model routing](19-hierarchical-task-aware-model-routing.md) selects a gateway before the session starts; escalation uses a new session and an explicit handoff. Scoped [agent memory](13-agent-memory.md) can provide relevant knowledge without replacing the current notebook or run state.

A supervising unit can optionally request a focused child through [sub-agents](28-dynamic-agentic-unit-delegation.md). The framework constructs it with its own session and inherited boundaries. Model requests can benefit from [provider prompt caching](27-llm-cache-and-safe-response-reuse.md) where supported. Each request still makes a provider call and generates a new response; input-computation reuse never proves a tool action happened.

Keep these implementations in agentic/ and expose supported contracts through index.ts. Standalone examples can use fake models and tools to verify the loop, isolation, limits, validation, and recovery before connecting real providers. The [complete agent example](25-complete-agent-example-all-framework-features.md) follows the unit through an entire task.

## One Policy Concept Inside the Unit

AgenticMindUnit performs an assignment through its runner and isolated session. Its configurable decisions use Policy<TInput, TOutput>: context selection uses Policy<ContextPolicyInput, ContextSelection>, completion uses Policy<CompletionInput, CompletionDecision>, and retry/escalation implementations use the same interface with their own data types.

The composer awaits contextPolicy.apply({ material, budget }) before each model request. The runner awaits completionPolicy.apply(input) before accepting a proposed final outcome. A model-based executor can apply assignment/output policies around the unit invocation. The unit still exposes execute(); it is an execution capability, not another policy interface. Configure the policy objects through composition and retain per-invocation state in AgenticSession.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

## Preserve Stable Structure Across Model Turns

AgenticMindUnitRunner must use request composition and provider adapters designed to enable provider prompt caching. Keep unchanged instructions, tool definitions, and output requirements consistently represented; append changing observations and current assignments where message authority and protocol permit. Every turn requiring generation still calls the provider. The same requirement applies to child sessions without adding unauthorized shared context.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
