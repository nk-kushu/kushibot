# Recovery, Memory, and Context Handoff

## Continue Without Losing What Already Happened

Imagine the agent is adding Google login. It has investigated the code, saved a specification, and started editing files. Then a model request fails, a check finds a bug, or the application stops unexpectedly.

These situations need different responses. **The framework should preserve useful work and determine what happened before deciding what to repeat**. This chapter explains that proposed behavior through the same task.

## When a Model Request Fails

A temporary connection problem may mean a model request needs another attempt. A retry policy controls whether another attempt is allowed and how many attempts can be made.

That retry does not mean restarting the whole Google-login workflow. Completed investigation and specification results remain available. Calls, usage, and waiting time still count against the existing limits; retries do not create a fresh budget. If an interrupted request's usage is unknown, the accounting keeps that uncertainty rather than assuming it was free.

## When the Code Needs a Fix

Now imagine the model request succeeds and the agent produces code, but verification reports an incorrect callback URL. Repeating the same request blindly would not explain what needs changing.

The workflow creates a fix assignment containing the failed check, its evidence, and the expected correction. After editing, the framework runs checks and review again:

```text
Implement → Check → Review
                       ├→ Accepted: continue to the next stage
                       └→ Fix required: correct the issue, then check again
```

**Fixes have a configured limit.** 

For example, the plan may allow three fix cycles. If the problem remains afterward, the run reports the remaining issues and an honest stopped outcome. It does not continue forever or call unfinished work completed.

Each correction gets a new step execution and result. Earlier attempts remain recorded rather than being overwritten by the latest version.

## When the Application Stops During an Edit

Suppose a tool writes the callback file, but the process stops before saving confirmation. On restart, the framework cannot safely assume that the write never happened.

**Recovery examines the saved operation and the actual workspace.** 

If it can confirm the intended change is already present, it records that outcome instead of repeating the edit. If the result is still uncertain, recovery needs reconciliation or an explicit safe recovery decision before continuing.

A checkpoint is the saved information needed to resume. It can contain working notes, the recent model/tool conversation, which tool requests still need results, counters, and pending action references. Notes alone cannot tell whether an external write actually happened.

The framework restores saved data and reconnects the required services. It does not try to save a running database client or cancellation signal inside the checkpoint. Completed step results are reused when valid, and consumed budgets remain consumed.

## Pass Results to the Next Task

After investigation, the framework saves its findings as a step result. The specification step selects the findings it needs through its input policy. It does not need to share the investigation session's writable notebook.

The same idea applies when a stronger model takes over a difficult fix. A ModelHandoff provides the goal, current changes, failed checks, useful notes, and any uncertain actions. The new session has its own working state and continues from that explicit information. Resuming the same session from a checkpoint is a different operation.

## Remember the Current Task and Learn for Future Tasks

During Google-login work, the notebook might say, “The callback route is added; next inspect the configuration check.” This is working memory for the current task. 

**Checkpoints preserve it when needed for recovery.**

A later lesson might be, “Include callback-configuration checks when changing authentication.” That is a candidate for reusable knowledge. It needs supporting evidence and the configured validation policy before becoming confirmed long-term memory.

Saving notes to disk does not automatically make them trusted facts. The run and operation records tell recovery what actually happened; scoped agent memory helps future tasks retrieve supported facts, past outcomes, and useful procedures.

For the detailed boundaries, read [AgenticMindUnit](12-agentic-mind-unit.md), [Agent Memory](13-agent-memory.md), and [Execution State Versus Reusable Knowledge](24-execution-state-versus-reusable-knowledge.md). The [state-machine chapter](22-state-machines-and-coordinated-lifecycles.md) explains how interrupted and resumed executions change state.

## Retry and Recovery Policies Use apply()

Retry policies implement Policy<RetryInput, RetryDecision>; recovery decisions implement Policy<RecoveryInput, RecoveryDecision>. Their input includes the relevant operation identity, attempt history, observed effects, and remaining limits. The operation owner awaits apply(), reconciles uncertain effects, and performs only a permitted action. Recovery recreates compatible policy objects from recorded identities/configuration instead of deserializing live objects. Memory-validation policies use the same shared contract with separate evidence-bearing inputs and outcomes.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
