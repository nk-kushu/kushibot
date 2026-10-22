# LLM Cache: Provider Prompt Caching

Imagine the agent reviews Google-login code several times using the same project instructions, tool definitions, and report format. Each request needs a new answer, but the provider may reuse computation spent processing unchanged input.

**Architecture requirement: kushibot must enable provider prompt caching through stable request structure and provider adapters.** Provider prompt caching is the only model caching in this design. The requirement is to preserve the opportunity for provider reuse throughout request composition and serialization; the provider determines whether a particular request actually hits its cache. Every new model request goes to the selected provider and generates a new response. The framework does not substitute saved answers, cached decisions, or semantically similar responses for that generation.

This chapter describes a proposed integration, not already implemented library code. Provider capabilities and API details must be checked for the concrete provider and model during implementation.

## Keep Caching at the Provider Boundary

AgenticMindUnit uses ModelGateway for model calls. Model-backed DecisionUnit evaluations and summarization use their respective provider boundaries. Their adapters apply supported provider prompt-cache controls without changing the calling operation's responsibilities.

```text
Resolve concrete provider/model and trusted configuration
        ↓
Compose current, authorized input with stable ordering where appropriate
        ↓
Check limits and reserve provider capacity
        ↓
Selected adapter applies supported prompt-cache controls
        ↓
Provider may reuse input computation and generates a new response
        ↓
Validate result, record actual usage, and continue the operation
```

There is no CachedModelGateway, SqliteLlmCache, DecisionCache, answer-reuse fingerprint, response-cache store, or semantic response lookup in this design. New model requests are not combined into one shared generation as a caching optimization. Each has its own provider call, result, and usage accounting.

Normal operation recovery may restore an already accepted result according to checkpoints and run records. That restores the same execution; it does not answer a new model request from a response cache.

## Compose Stable Input Without Changing Meaning

AgentContextComposer must keep unchanged shared material in a stable order and representation across compatible requests, where instruction authority and the provider protocol permit:

```text
Framework instructions and agent role
Required rules, tool definitions, and output contract
Useful shared project references
────────────────────────────────────────────────────
Current evidence, notebook updates, and latest request
```

Preserve message roles and instruction priority. Untrusted evidence must not acquire instruction authority just to improve cache reuse. Keep tool ordering stable when it has no reason to change. Avoid placing changing timestamps or operation IDs at the beginning; omit them from model-visible input when they are unnecessary.

For providers that reuse a matching beginning of the input, that beginning is a prefix. Changing early material can reduce reuse. Provider protocols differ, so the adapter must implement the concrete provider's supported behavior rather than assuming one universal prefix or cache-control format.

A session identifier, stable-looking input, or configured cache option does not guarantee a hit. Changing models must not assume cached computation transfers to the new model.

## Compose Objects With Separate Responsibilities

Use the existing model boundary and shared Policy contract:

- AgentContextComposer selects current authorized context and preserves stable ordering and representation of unchanged shared material.
- A configured Policy<PromptCachePolicyInput, PromptCacheIntent> resolves permitted cache intent from trusted configuration and concrete capabilities.
- The selected provider adapter preserves stable serialization of unchanged messages, tools, and output contracts, translates intent into supported API controls, and maps reported usage. Automatic provider caching must remain possible even when no explicit cache option is needed.
- The operation coordinator enforces limits, cancellation, validation, persistence, and lifecycle rules.

PromptCachePolicy names an implementation or purpose, not another base interface. Its consumer calls await policy.apply(input). Use injected collaborators and registered provider implementations instead of spreading provider-name branches through executors.

The framework owns configuration and request composition. The provider owns cached input computation and its availability. A policy decision cannot assert a cache hit before provider reporting or fabricate usage. Text inside a prompt cannot enable cache controls or broaden trusted access scope.

This arrangement applies to AgenticMindUnit loops, model-backed DecisionUnit evaluations, summarization, and child-session calls. Each operation still receives only its authorized context and produces a newly generated result through its normal provider contract.

## Follow Google Login Through Provider Caching

1. The coding unit sends its rules, authentication guidance, tools, current source, and assignment. The provider generates a new response and may retain supported input computation.
2. Later turns use the same instructions with updated evidence. A matching stable portion may benefit from provider reuse, while the provider generates another response.
3. After the callback changes from code-r4 to code-r5, the next review includes code-r5. Keep current evidence even when it reduces cache reuse.
4. An independent review makes another provider call. Shared instructions may benefit from prompt caching; the review still receives its own fresh generation. Review context and policy must also support the required independence.
5. The framework validates each result. Tool execution, tests, sub-agent completion, and publication approval retain their normal evidence and authorization requirements.

Prompt caching cannot prove that an edit happened, that tests ran, or that a workflow completed. It does not grant permission to publish.

## Keep Rolling Context Correct Before Keeping It Cached

Replacing an early conversation section with a summary changes the prefix and can reduce reuse. Think of accepted compression as the start of a new context period:

1. Preserve useful, current instructions and append new turns within the applicable context budget.
2. Compress when relevance or context limits require it.
3. Compose a new stable prefix from authoritative instructions and the accepted summary at their proper message roles.
4. Build reuse again as the session continues.

Never retain stale evidence, discard requirements, or keep unnecessary history to increase cache hits. Measure cost and quality across the whole run, including summarization. See [Rolling Context and Compression](29-rolling-context-and-compression.md).

## Account for Actual Provider Usage

Every model request still incurs a provider call and output generation. Prompt caching may reduce supported input-processing costs or latency; it does not make the whole request free.

Record concrete provider/model identity, actual calls, input/output usage, and provider-reported cached-input categories when available. Preserve the provider's field semantics so cached tokens are not counted twice. Record unavailable cache details as unknown rather than inventing a hit, miss, or zero cost.

Reserve enough budget for a miss, then reconcile actual usage using applicable pricing and accounting rules. Keep deadlines, rate limits, concurrency, and cancellation intact. Cache availability, minimum input requirements, retention, and charges depend on the provider and model.

Report safe cache configuration and usage details through the existing debug recorder without dumping prompts or responses. Optional logging follows KUSHIBOT_LOG_ENABLED and KUSHIBOT_LOG_LEVEL; required execution accounting remains intact. Provider cache keys or accounting groups do not replace framework authorization and project scope.

## Handle Misses and Unsupported Controls

A normal miss or expired prefix allows ordinary provider processing under existing limits. A provider without prompt caching uses its normal generation path.

If an explicit cache reference is unavailable or a cache option is rejected, handle the provider's documented behavior through the adapter. Any fallback or retry follows normal error handling, deadlines, and budget rules. Do not repeat a successful generation merely to populate a cache or improve cache metrics.

Resuming a session restores valid execution state; it does not guarantee the provider still retains cached input. Neither cache retention nor a cache miss changes the evidence needed for task correctness.

## Keep Memory, Artifacts, and Recovery Separate

Provider prompt caching reuses supported input computation while producing a new response. It does not permanently train the model on the project or provide durable memory.

RunRepository and checkpoints restore a particular execution and its accepted results. AgentMemory retrieves supported facts and lessons for a new task. ArtifactStore retains reports and other materials by reference. These capabilities keep their own authority and lifecycle; they do not become model-response caches because they store data.

## Verify the Integration

Use deterministic fake providers to verify stable request composition, current evidence, preserved message authority, supported/unsupported capability handling, policy intent translation, and accurate usage mapping. Compare final provider payloads from requests with the same shared material and different task evidence: the compatible shared portion must retain the same ordering and representation. Check that serialization does not shuffle tools or inject changing metadata into that portion. This is an architectural acceptance requirement, not merely a cache-performance tuning exercise. Check that repeated requests and independent reviews each make their own provider call. Cover compression transitions, model handoffs, misses, missing usage details, and bounded error handling.

Fake providers can verify framework behavior, not real provider cache hits. Measure actual provider reuse separately using reported usage. Correctness must hold even when no input computation is reused.

See [Model Routing](19-hierarchical-task-aware-model-routing.md), [AgenticMindUnit](12-agentic-mind-unit.md), [DecisionUnit](15-system-one-decision-unit.md), [Limits](18-limits-budgets-and-execution-control.md), and [One Shared Policy Concept](31-shared-policy-concept.md).

[Back to table of contents](harness-workflows-executors-framework-idea.md)
