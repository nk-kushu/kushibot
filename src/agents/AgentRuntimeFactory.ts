import type { IAgentRunOptions } from "./IAgentRunOptions.js";
import type { IAgentRuntimeOptions } from "./IAgentRuntimeOptions.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import { AgentRunRuntime } from "./AgentRunRuntime.js";
import { InMemoryAgentStoreFactory } from "./memory/InMemoryAgentStoreFactory.js";
import { ModelRequestValidator } from "../agentic/model/ModelRequestValidator.js";

/** Selects infrastructure once and allocates fresh stores and controls for every run. */
export class AgentRuntimeFactory {
  private readonly options: IAgentRuntimeOptions;
  private readonly clock: IClock;
  private readonly ids: IIdGenerator;
  constructor(options: IAgentRuntimeOptions) {
    this.options = {
      ...options,
      profile: Object.freeze({ ...options.profile }),
      limits: { ...options.limits },
      scope: options.scope ? Object.freeze({ ...options.scope }) : undefined,
    };
    this.clock = options.clock ?? { nowEpochMs: () => Date.now() };
    this.ids = options.ids ?? { nextId: () => crypto.randomUUID() };
    for (const [name, value, max] of [
      ["maxTurns", options.maxTurns ?? 30, 128],
      ["timeoutMs", options.timeoutMs ?? 600_000, 2_147_483_647],
      ["modelTimeoutMs", options.modelTimeoutMs ?? 60_000, 2_147_483_647],
    ] as const)
      if (!Number.isSafeInteger(value) || value < 1 || value > max)
        throw new Error(`Invalid ${name}.`);
    new ModelRequestValidator().validate(
      {
        instructions: "Validate profile.",
        messages: [{ role: "user", text: "Validate." }],
        maxOutputTokens: 1,
        inputTokenUpperBound: 1,
        promptCacheKey: null,
      },
      this.options.profile,
    );
  }
  async create(agentId: string, controls: IAgentRunOptions = {}): Promise<AgentRunRuntime> {
    const runId = this.ids.nextId(),
      operationId = this.ids.nextId();
    if (
      !/^[A-Za-z0-9_.:-]{1,120}$/.test(runId) ||
      !/^[A-Za-z0-9_.:-]{1,128}$/.test(operationId) ||
      runId === operationId
    )
      throw new Error("Invalid agent run identity.");
    const scope = Object.freeze({
      ...(this.options.scope ?? { scopeId: runId, projectId: agentId }),
    });
    const signal = controls.signal ?? new AbortController().signal;
    signal.throwIfAborted();
    const deadlineEpochMs = this.clock.nowEpochMs() + (this.options.timeoutMs ?? 600_000);
    const stores = await (this.options.stores ?? new InMemoryAgentStoreFactory()).create({
      runId,
      scope,
    });
    const budgetScopeId = `budget:${runId}`;
    await stores.usage.initialize({
      schemaVersion: 1,
      reservations: [],
      scopes: [
        {
          id: budgetScopeId,
          parentId: null,
          limits: {
            modelCalls: 120,
            inputTokens: 2_000_000,
            outputTokens: 250_000,
            toolCalls: 100,
            iterations: 120,
            fixes: 0,
            ...this.options.limits,
          },
        },
      ],
    });
    return new AgentRunRuntime(
      Object.freeze({
        identity: Object.freeze({ runId, operationId }),
        scope,
        signal,
        deadlineEpochMs,
        reporter: Object.freeze({
          progress: async (message: string) => {
            await controls.onProgress?.(message);
          },
        }),
      }),
      budgetScopeId,
      stores,
      this.ids,
      this.clock,
      this.options.maxTurns ?? 30,
      this.options.gateway,
      this.options.profile,
      this.options.modelTimeoutMs ?? 60_000,
    );
  }
}
