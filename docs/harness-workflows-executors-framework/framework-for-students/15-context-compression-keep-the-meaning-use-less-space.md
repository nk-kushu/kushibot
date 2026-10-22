# 15. Context Compression: Keep the Meaning, Use Less Space

Imagine studying for an exam. You have fifty pages of notes, but only one small desk.

You make a shorter study sheet. It keeps the important facts, difficult questions, and page numbers for details you may need to check again.

**Context compression does the same thing for a model: it replaces suitable long material with a shorter version that preserves what matters for the current task.**

This chapter explains the proposed framework design. The examples are illustrative, not results from an implemented system.

## Why Do We Need It?

Each model request has a limited amount of space. The current assignment, required rules, tool descriptions, useful observations, and the model's answer all need room.

As a worker reads files and receives tool results, the available material grows. Eventually, even relevant material can be too large to include together.

Compression helps the worker continue with a smaller, useful view of its work.

It changes what we send in a request. It does not change the model's weights or increase its capacity.

## Selection and Compression Have Different Jobs

Suppose the worker has read a login file and an unrelated page about invoice formatting.

- **Selection:** Leave the invoice page out because it does not help with login.
- **Compression:** Replace a long, useful login investigation with a shorter explanation of its findings.

We first avoid unnecessary material. Then we shorten suitable information that still matters.

**Compression is also different from provider prompt caching. Prompt caching reuses supported input-processing computation while generating a new answer; compression makes information smaller.**

## Before and After

Our assignment is to add Google login while preserving password login.

The worker has produced a long investigation containing repeated searches, file excerpts, and test output. Its useful findings include:

```text
Password login creates sessions through SessionService.
The password-login test passed on source version code-v3.
The Google callback accepts expired state; its expiry test failed.
The host has not supplied Google application credentials.
Evidence is saved in investigation-report-7 and test-report-9.
```

A shorter version could be:

```text
At code-v3, password login uses SessionService and its test passed.
Google callback expiry still fails. Host credentials are missing.
Sources: investigation-report-7 and test-report-9.
```

The summary keeps the findings, source version, failure, missing detail, and evidence references. In a real run, those references must resolve to accessible saved evidence.

The assignment and required rules stay separately visible in the request. We do not replace them with a vague sentence such as “finish login.”

## What Must Survive?

| Information                                  | Why it matters                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Current assignment and required rules        | **The worker must still know what it should do and what it may do.**      |
| Relevant acceptance criteria                 | **A shorter request must not silently weaken the definition of success.** |
| **Important findings** and source references | The worker needs useful evidence and a way to inspect details.            |
| Source version                               | An old test result does not establish that newly edited code passes.      |
| Failures and unanswered questions            | “Not checked” must remain different from “passed.”                        |
| **Unfinished or uncertain actions**          | “Write requested, outcome unknown” must not become “file saved.”          |

#### A summary can lose meaning. Being shorter is not proof that it is correct.

## Who Does What in Our Framework?

The same components keep their jobs:

1. **AgenticMindUnitRunner** asks for the next model request.
2. **AgentContextComposer** gathers permitted material and applies its configured policy.
3. **The policy** selects useful information and identifies suitable older material that can be shortened.
4. **A compression capability** creates the shorter representation. It may use simple processing or an optional summarization model.
5. **The composer** checks the assembled request before the runner continues.

The configurable decision still uses the shared contract introduced in Chapter 13:

```typescript
interface Policy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

For example, a concrete policy can say: keep required instructions and the latest failure visible; summarize older investigation observations with their source references.

**We do not introduce another policy interface for compression.** Different policy objects use the same `apply()` agreement. **The composer and compression capability still perform their own work.**

## What Is Neural Compression?

**Here, neural prompt compression means using a smaller AI model to help shorten the information sent to the main model.** Think of a teaching assistant preparing short study notes before the student starts working.

The smaller model can help identify useful parts and remove less useful text. Some approaches generate a readable summary; others keep selected words or tokens, so the compressed result may look less natural to a person.

For example, [Microsoft's LLMLingua](https://www.microsoft.com/en-us/research/project/llmlingua/llmlingua/) uses a smaller model to identify less important tokens in a prompt. It is one possible technique to evaluate for our framework. Its results do not guarantee that every requirement will survive in our tasks.

The term **neural-network compression** means something different: making the model itself smaller through techniques such as pruning, quantization, or distillation. In this chapter, we are shortening the information supplied to the model.

## A Simple Neural-Compression Example in Our Framework

Suppose our Google-login worker has a long investigation report. We could configure an optional neural compressor as the composer's compression capability.

1. **Choose the material.** The shared Policy object identifies older investigation text that may be shortened. The current assignment, required rules, and latest failing test stay separately visible.
2. **Ask the smaller model to compress it.** AgentContextComposer passes the selected text to the configured compression capability. It receives a candidate shorter version.
3. **Keep the evidence attached.** The composer carries source references and source versions alongside the compressed text. The original report remains available in ArtifactStore.
4. **Check the candidate.** The framework checks required facts against the source, including the failed expiry test and missing credentials. If important meaning is lost, it rejects that candidate and keeps more original detail or tries a less aggressive reduction within the remaining budget.
5. **Prepare the main request.** The composer combines the accepted shorter material with the protected instructions and recent evidence, then measures the complete request.
6. **Continue working.** The main model receives that request and works on the expiry failure. It can retrieve original details through permitted tools when necessary.

An illustrative compressed note could read:

```text
code-v3: password login uses SessionService; regression test passed.
Google expiry test failed. Host credentials still missing.
Sources: investigation-report-7, test-report-9.
```

This is a teaching example, not actual output from LLMLingua or a promised compression ratio.

**The policy decides what may be shortened; the compression capability does the shortening; the composer assembles and checks the request.** All configurable decisions still use our shared Policy interface. We do not need a new policy concept for neural compression.

The smaller model adds processing time and resource use. We would enable this option only after checking that the overall workflow benefits and important meaning survives. Simple excerpts or ordinary summaries may already be enough.

## Low-Cost Options: Qwen and LLMLingua-2

**Alibaba's Qwen models are Chinese-developed options we could test for producing short, structured summaries.** They are general-purpose models. We would need to evaluate how well they preserve our findings, requirements, and unanswered questions.

| Option | How we could use it | What we pay for |
|---|---|---|
| Qwen-Flash API | Send selected older observations to a hosted model and ask for a compact summary. | Input and output tokens. |
| Qwen3-4B locally | Run a small model on our own infrastructure, with thinking disabled, to generate summaries. | Hardware, hosting, and operation; no external API token fee for the local model. |
| LLMLingua-2 locally | Use a dedicated prompt compressor to select which tokens to retain. | Hardware and operation; no paid Microsoft API is required. |

Qwen3-4B and the linked LLMLingua-2 model are available under Apache-2.0. See the [Qwen3-4B model documentation](https://huggingface.co/Qwen/Qwen3-4B) and [LLMLingua-2 model documentation](https://huggingface.co/microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank).

### A Small Pricing Example

As checked on **October 20, 2026**, Alibaba lists these standard **Qwen-Flash Singapore international** prices for requests with up to **256,000 input tokens**:

- **$0.05 per million input tokens.**
- **$0.40 per million output tokens.**

These rates depend on the region and request size and may change. [Alibaba's official pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)

Suppose a compression call receives 10,000 total input tokens and produces a 2,000-token summary:

```text
Input:  10,000 / 1,000,000 × $0.05 = $0.0005
Output:  2,000 / 1,000,000 × $0.40 = $0.0008
Total:                             $0.0013

1,000 such compression calls:       $1.30
```

This estimates only the compression calls. It excludes retries, extra validation calls, and the main model's subsequent request. The output length is an example, not a guaranteed compression result.

### How We Could Use Qwen in Our Framework

For the Google-login task:

1. **The shared Policy selects older investigation text.** Required instructions and the latest failure remain separately visible.
2. **AgentContextComposer calls a Qwen-backed compression capability.** The provider connection belongs to that capability, while configurable decisions continue to use our existing Policy contract.
3. **Qwen returns structured notes.** We ask for findings, unresolved questions, and references from the supplied material. Original source identifiers and versions remain attached by the framework.
4. **The composer checks and assembles the request.** A summary must retain the expiry failure and missing credentials. If the candidate loses necessary meaning, it is rejected or replaced with more original detail.
5. **The main model continues the task.** It receives the shorter accepted context and can inspect original evidence through permitted tools.

A reasonable first experiment would use **Qwen-Flash** because it avoids hosting another model. We would compare its summaries against local LLMLingua-2 and simple excerpts on the same tasks, measuring important-information retention, task success, total cost, and elapsed time. The lowest token price alone does not establish which option works best.

## Step by Step: Make Room to Fix Google Login

Assume the current request has a budget of **8,000 input tokens**, after reserving space for the answer. Tokens are the small units used to measure model input and output. These numbers are only a teaching example.

1. **Measure the request.** The complete input would use 10,500 tokens, including instructions and tool descriptions.
2. **Remove irrelevant material.** Leaving out unrelated observations reduces it to 9,500 tokens. It still does not fit.
3. **Choose older evidence to shorten.** The policy identifies a 4,000-token investigation section. Required rules and the latest expiry-test failure remain outside that section.
4. **Produce a summary.** The older section becomes 1,000 tokens containing the useful findings, source versions, references, and open questions.
5. **Check the meaning and request structure.** Verify the required information remains present. Keep any tool calls and their results correctly paired; do not cut them apart arbitrarily. Structural checks alone cannot prove every summary is accurate, so consequential details must be checked against the original evidence.
6. **Measure again.** The assembled input is now 6,500 tokens. It fits the illustrative input budget.
7. **Continue the task.** The model can focus on the expiry failure while still knowing that password login must keep working and credentials remain missing.

If the model needs an exact method signature, it reads the current source through an allowed tool. The short summary is a guide to the evidence, not a substitute for every detail.

## Where Does the Original Information Go?

Compressing a request **does not itself delete the original records.**

- Detailed reports can remain in **ArtifactStore**. 
- Active findings belong in **DraftNotebook**. 
- Session and execution records retain their own state. 
- Source files remain in their workspace.

The composer uses a smaller view of those records. It does not move everything into a new universal memory store.

Before replacing detailed material with a reference, the framework must ensure the necessary source is retained and can be retrieved within the worker's permissions. A reference to unavailable evidence is not enough.

## What If Compression Goes Wrong?

A poor summary might say:

> Login is working. Finish the task.

**That loses the failing test and missing credentials.** The framework must not accept it as evidence of completion.

It should rebuild the affected context from original records or use a less aggressive summary. Repeatedly summarizing earlier summaries can compound mistakes, so important facts should be refreshed from their sources.

If essential information still cannot fit, the session returns a clear context-limit outcome. It must not quietly discard a requirement.

If a model generates the summary, that call consumes time, tokens, and the applicable execution budget too. Compression does not reset those limits.

## Check Your Understanding

1. Does compression make the model's capacity larger?
2. Can a summary change “test not run” into “test passed”?
3. Does shortening a request automatically delete its original report?
4. Do we need a different policy interface for compression?

Possible answers:

1. No. It makes suitable input smaller.
2. No. Uncertainty must remain visible.
3. No. The report stays with its storage owner, subject to its retention rules.
4. No. Configurable decisions use the same `Policy<TInput, TOutput>` contract.

**Keep the meaning, keep the evidence, and use less space.**

For deeper technical detail, read [Rolling Context and Compression](../29-rolling-context-and-compression.md).

## Build Requests So the Provider Can Reuse Preparation

The framework must enable provider prompt caching by keeping unchanged instructions, tools, and answer requirements in a stable order and representation. The request composer builds that structure, and the provider adapter preserves it in the request it sends. Changing evidence still belongs in the correct current context; summaries or model changes may reduce reuse. Each request generates a new answer, and the provider decides whether cached input computation can be used. See [chapter 18](18-caching-reusing-work-when-it-is-still-useful.md).

**Next chapter:** [Memory: Keeping Useful Knowledge for Future Tasks](16-memory-keeping-useful-knowledge-for-future-tasks.md).

[Previous: Better Context: Give the Model the Right Information](14-better-context-give-the-model-the-right-information.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
