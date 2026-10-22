# 14. Better Context: Give the Model the Right Information

Imagine a student preparing to build a bridge.

The student has an assignment, safety rules, drawings, old notes, and test results. Putting every page on the desk makes it hard to find what matters. Putting too few pages there may hide an important requirement.

**The goal is to put enough of the right information on the desk for the next action.**

That is what we want to improve in our framework. The model's “desk” is its context: the information included in one model request.

These are proposed upgrades to the design. They build on the components we already described; they have not been implemented or measured yet.

## Keep the Same Policy Concept

Every configurable choice still uses our one shared interface:

```typescript
interface Policy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

#### A policy receives information, applies its rules, and returns a result. 

**Different policy objects have different jobs.**

| Choice                 | What a policy helps decide                                      |
| ---------------------- | --------------------------------------------------------------- |
| Prepare an assignment  | Which accepted results should this executor receive?            |
| Budget context         | How much space is available for this request's different parts? |
| Select evidence        | Which findings and excerpts help with the current action?       |
| Choose what to shorten | Which older observations can become a summary?                  |
| Select tools           | Which already-authorized tools are useful for this assignment?  |
| Arrange context        | In what order should the selected information appear?           |

We do not need **six new policy classes immediately.** A simple context policy can handle the first useful selection rules. Separate implementations become useful when those choices need independent configuration.

**One interface stays the same as the framework grows.**

## Upgrade 1: Give Each Piece of Evidence a Label

A loose note saying “the test passed” is difficult to trust. 

**Which test? Which version of the code? Where is the result?**

We should supply those details with the information:

```text
Information: Password-login regression test passed.
Source: Saved verification report.
Source version: code-v3.
Role: Evidence about this test run.
```

A small context item can carry an identifier, its text or excerpt, a source reference, the source version, and whether it is a required instruction or evidence.

**The existing report stays in ArtifactStore**. The context item points to it and carries the useful excerpt. It does not need to copy the entire report into another permanent store.

**This lets the composer notice that a result from code-v3 may need rechecking after an edit creates code-v4.**

**The trusted runtime identifies instructions and evidence.** Text inside a retrieved file cannot promote itself into a required framework rule.

### Why Evidence Matters for Context Notes

**A note says what we found. Evidence shows what supports that finding.** Think of a student writing an answer and keeping the page that helped them reach it.

A note saying “password login works” is too broad. A more useful note says:

> The password-login regression test passed on code-v3. See verification report 42. Google-login expiry handling has not been checked.

The evidence helps the next worker answer four questions:

- **Where did this come from?** A code excerpt, tool observation, or saved report provides something the worker can inspect.
- **Which version was checked?** A result about code-v3 does not establish that changed code-v4 passes the same check.
- **What was actually established?** One passing test supports that test's result; it does not prove that the whole login system is correct.
- **What is still unknown?** An unanswered question must remain visible instead of becoming a confident statement during summarization.

This is especially useful when we compress context. We can replace a long report with a short finding, its source reference, the tested version, and remaining questions. The full report stays in ArtifactStore and can be retrieved through authorized access when more detail is needed.

For example:

1. A worker runs the password-login test on code-v3 and saves the report.
2. Its notebook records the result with a reference to that report and version.
3. The composer includes a short version of the finding in the model's context.
4. An edit produces code-v4. The earlier evidence still describes code-v3.
5. The next request keeps verification of code-v4 open until a new check supplies its result.

Our shared **Policy** concept helps decide which evidence is relevant and whether it needs rechecking. A reference alone does not make a claim true, grant access, or turn retrieved text into an instruction. The source must support the claim, and the runtime still enforces permissions.

**Evidence lets us shorten notes while keeping a way to check what they mean and why we believe them.**

## Upgrade 2: Plan the Available Space

A model request has a size limit. Instructions, tool descriptions, evidence, recent conversation, and the answer all need space.

Think of packing a school bag. You first make room for what the assignment requires, then choose the useful extras.

The composer should:

1. **Reserve room f**or the model's answer and request overhead.
2. Account for required instructions and necessary tool descriptions.
3. Use the remaining allowance for relevant evidence and observations.
4. Measure the complete request before sending it.

Different assignments need different allocations. An investigation may need many source excerpts. A review may need the specification, proposed changes, and verification results.

We should measure what works for our tasks rather than give every executor the same fixed percentages. The context allowance must also respect the selected model and the framework's execution limits.

If essential information cannot fit safely, the framework reports a context-limit outcome. It cannot quietly drop a requirement to make room.

## Upgrade 3: Retrieve Useful Parts When Needed

A student looking for one measurement opens the relevant drawing. The model should be able to do something similar through permitted tools.

Our first version can use f**ile search, focused code excerpts, artifact search, and explicit report references.**

For larger collections, we could later improve retrieval:

| Technique | Simple explanation |
|---|---|
| Hybrid search | Search both exact words or names and similar meanings. |
| Parent-child retrieval | Find a small matching passage, then read enough surrounding material to understand it. |
| Reranking | Reorder the search results so the most useful candidates come first. |
| Contextual indexing | Add a short explanation of where an excerpt belongs to help search find it. |

For code, a method and its surrounding class may be more useful than an arbitrary number of characters. For a report, a section heading and nearby paragraphs may provide the missing meaning.

All retrieval stays within the worker's allowed scope. Results remain bounded, tied to their sources, and checked for freshness. A generated explanation used for search remains distinguishable from the original evidence.

These techniques are options to evaluate. Reported improvements elsewhere are not promised improvements in our framework. [Anthropic's contextual-retrieval explanation](https://www.anthropic.com/engineering/contextual-retrieval)

## Upgrade 4: Keep Useful Notes and Shorten Older Material

After many tool calls, raw output can crowd the model's desk.

A context policy can select current findings and recent relevant observations. The composer can use a configured compression capability to shorten suitable older material.

For example, many earlier observations might become:

> Password login uses the existing session service. Its regression test passed at code-v3. Google-login expiry handling is still unverified. The investigation and verification reports contain the supporting evidence.

Notice what survives: the finding, source version, evidence references, and open question.

Required rules and acceptance criteria must remain available. Unknown operation outcomes must stay unknown. Code and structured results need their meaning and syntax preserved; deleting arbitrary tokens is not a safe default.

We would start with deduplication, bounded excerpts, and structured summaries. More advanced compression tools can be tested later. Microsoft's LLMLingua research is one possible source of optional techniques, with results that need evaluation on our own tasks. [LLMLingua research](https://www.microsoft.com/en-us/research/project/llmlingua/)

## Upgrade 5: Keep Storage, Sessions, and Context Separate

The existing owners still have clear jobs:

| Information | Where it belongs |
|---|---|
| Conversation and tool-call state for one invocation | AgenticSession |
| Active findings, questions, and next actions | DraftNotebook |
| Detailed reports and produced material | ArtifactStore |
| Validated knowledge useful across tasks | AgentMemory |
| Accepted workflow progress and results | WorkflowRun and StepRun |

The composer selects a working view from permitted material. It does not become the owner of everything.

A child worker receives a bounded assignment and its own session. It returns useful findings, evidence references, and unresolved questions. The parent does not automatically receive every child message.

A summary is not automatically a confirmed long-term memory. Saving a report does not automatically complete a workflow step.

## How the Upgrades Work Together

AgentContextComposer remains the coordinator for preparing each model request:

```text
Current assignment, rules, notes, and permitted evidence
                         ↓
Apply the configured policies to budget and select material
                         ↓
Shorten suitable older observations if necessary
                         ↓
Arrange and measure the request; check required information
                         ↓
Send the model request
                         ↓
New tool observations become available for the next request
```

The composer must also preserve valid relationships between model tool calls and tool results. The runner asks it to prepare context before each model call.

This repeated preparation is rolling context. Anthropic describes the same broad approach of selecting useful information over time, retrieving details when needed, and keeping structured notes. [Context engineering for agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

Two related improvements fit around this process:

- **Caching:** Keep genuinely stable instructions arranged consistently where the provider supports reuse. Current evidence must remain current. Each request still calls the provider and generates a new answer; the framework does not reuse finished answers as a model cache.
- **External connections:** MCP adapters can make external tools and resources available through the framework's authorized capabilities. They provide access; our policies still choose what information is useful.

Clearly marking retrieved material as evidence helps explain its role. Actual permissions, budgets, and publication approval remain enforced by the runtime. A label around text is not an access-control mechanism.

## Follow One Google-Login Task

1. **Prepare the assignment.** The input policy selects the accepted specification: add Google login and preserve password login.
2. **Prepare the first request.** The context policy selects the required rules, relevant authentication code, and current findings.
3. **Inspect more detail.** The worker reads a needed file through an authorized tool. The next request includes the useful excerpt and its source version.
4. **Respond to a failure.** A test finds that expired login attempts are accepted. The next request emphasizes that result and the affected code.
5. **Make space.** Older investigation output becomes a referenced summary. The password-login requirement and unresolved expiry issue remain visible.
6. **Check the changed code.** After editing, earlier results remain tied to the older version. New checks supply evidence for the new version.
7. **Return the outcome.** The worker reports actual results and remaining questions. The engine accepts and saves the result before dependent work proceeds.

Every configurable choice still follows Policy and apply(). The executors, tools, composer, and engine carry out their own responsibilities.

## Start Small and Measure the Result

The first useful upgrade should include evidence labels, enforced context budgets, focused retrieval, and careful summaries.

We should compare the same representative tasks before and after a policy change:

| Question                                   | What we measure                                        |
| ------------------------------------------ | ------------------------------------------------------ |
| Did important requirements survive?        | Required-information retention                         |
| Did the model receive the facts it needed? | Evidence coverage and relevance                        |
| Did it rely on old source information?     | Stale-evidence mistakes                                |
| Did the task succeed?                      | Actual checks and accepted outcomes                    |
| Was the process efficient?                 | Token usage, elapsed time, and measured cache behavior |

A shorter request is not automatically better. **We want useful information, correct results, and reasonable resource use.**

Advanced search and compression should earn their place through these measurements.

## Check Your Understanding

1. Do these upgrades require a new policy interface for every feature?
2. Why should evidence carry a source version?
3. Can compression turn “not checked” into “passed”?
4. Does keeping a report in storage mean the model sees it?

Possible answers:

1. No. They use the same Policy<TInput, TOutput> interface and apply() method.
2. So the worker can distinguish evidence about older code from evidence about current code.
3. No. Uncertainty must survive until actual evidence resolves it.
4. No. Relevant content must be included in a request or retrieved through permitted tools.

**The upgrade is better information management, built with the same policy concept we already use throughout the framework.**

[Review: One Policy Concept](13-context-choosing-what-the-model-needs-to-see.md) · [Technical design: Shared Policies](../31-shared-policy-concept.md)

## Build Requests So the Provider Can Reuse Preparation

The framework must enable provider prompt caching by keeping unchanged instructions, tools, and answer requirements in a stable order and representation. The request composer builds that structure, and the provider adapter preserves it in the request it sends. Changing evidence still belongs in the correct current context; summaries or model changes may reduce reuse. Each request generates a new answer, and the provider decides whether cached input computation can be used. See [chapter 18](18-caching-reusing-work-when-it-is-still-useful.md).

**Next chapter:** [Context Compression: Keep the Meaning, Use Less Space](15-context-compression-keep-the-meaning-use-less-space.md).

[Previous: Context: One Policy Concept, Used Everywhere](13-context-choosing-what-the-model-needs-to-see.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
