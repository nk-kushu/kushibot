import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import type { IIdGenerator } from "../../src/contracts/runtime/IIdGenerator.js";
import { AgentContextComposer } from "../../src/agentic/context/AgentContextComposer.js";
import { PromptCacheRequestPreparer } from "../../src/agentic/model/prompt-cache/PromptCacheRequestPreparer.js";
import { BudgetedModelCall } from "../../src/agentic/model/BudgetedModelCall.js";
import { OpenAiTextRequestMapper } from "../../src/agentic/model/openai/OpenAiTextRequestMapper.js";
import { OpenAiPromptCacheInspector } from "../../src/agentic/model/openai/OpenAiPromptCacheInspector.js";
import { PromptCacheUsageAnalyzer } from "../../src/agentic/model/prompt-cache/PromptCacheUsageAnalyzer.js";
import { createLoginContextFixture } from "../context/createLoginContextFixture.js";
export class ProviderPromptCachingExample {
  constructor(private readonly composer: AgentContextComposer, private readonly cache: PromptCacheRequestPreparer,
    private readonly calls: BudgetedModelCall, private readonly mapper: OpenAiTextRequestMapper,
    private readonly inspector: OpenAiPromptCacheInspector, private readonly usage: PromptCacheUsageAnalyzer,
    private readonly ids: IIdGenerator) {}
  async run(context: IExecutionContext) {
    const fixture = createLoginContextFixture();
    const firstComposed = await this.composer.compose(fixture.first, context);
    if (firstComposed.status !== "ready") return { stage: "first-composition" as const, outcome: firstComposed };
    const firstPrepared = await this.cache.prepare(firstComposed.context, context);
    if (firstPrepared.status !== "ready") return { stage: "first-cache-policy" as const, outcome: firstPrepared };
    const first = await this.calls.run(firstPrepared.context.request, { operationId: this.ids.nextId(), signal: context.signal, deadlineEpochMs: context.deadlineEpochMs, timeoutMs: 1000 });
    if (first.status !== "received" || first.stopReason !== null || first.reply.usage === null || first.reply.status !== "completed") return { stage: "first-call" as const, outcome: first };
    const secondComposed = await this.composer.compose(fixture.second, context);
    if (secondComposed.status !== "ready") return { stage: "second-composition" as const, first, outcome: secondComposed };
    const secondPrepared = await this.cache.prepare(secondComposed.context, context);
    if (secondPrepared.status !== "ready") return { stage: "second-cache-policy" as const, first, outcome: secondPrepared };
    const second = await this.calls.run(secondPrepared.context.request, { operationId: this.ids.nextId(), signal: context.signal, deadlineEpochMs: context.deadlineEpochMs, timeoutMs: 1000 });
    const a = this.mapper.map(firstPrepared.context.request, firstPrepared.context.profile.modelId);
    const b = this.mapper.map(secondPrepared.context.request, secondPrepared.context.profile.modelId);
    return Object.freeze({ stage: "attempted" as const, first, second, comparison: this.inspector.compare(a, b),
      firstUsage: this.usage.summarize(first.reply.usage), secondUsage: second.status === "received" ? this.usage.summarize(second.reply.usage) : { status: "unknown" as const } });
  }
}
