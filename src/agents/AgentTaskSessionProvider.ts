import type { IAgentTaskSessionProvider } from "../executors/IAgentTaskSessionProvider.js";
import type { AgentTaskBindingRequest } from "../executors/AgentTaskBindingRequest.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IAgentSessionBinding } from "./IAgentSessionBinding.js";
import type { AgentRunRuntime } from "./AgentRunRuntime.js";
import { AgenticSession } from "../agentic/sessions/AgenticSession.js";
import { AgentActionParser } from "../agentic/sessions/AgentActionParser.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { DebugRecordingToolCall } from "./DebugRecordingToolCall.js";

export class AgentTaskSessionProvider<TResult> implements IAgentTaskSessionProvider<TResult> {
  constructor(
    private readonly runtime: AgentRunRuntime,
    private readonly bindings: IPolicy<AgentTaskBindingRequest, IAgentSessionBinding<TResult>>,
  ) {}
  async create(
    request: AgentTaskBindingRequest,
    result: IResultContract<TResult>,
    context: IExecutionContext,
  ) {
    const binding = await this.bindings.apply(request);
    const sessionId = context.identity.sessionId;
    if (!sessionId) throw new Error("Session identity is required.");
    const json = new JsonValueContract();
    const checked = await json.validate(binding.input);
    if (!checked.valid || !binding.instructions.trim())
      throw new Error("Invalid agent session binding.");
    const turn = this.runtime.createTurn(binding.instructions, checked.value);
    this.runtime.debug.event("progress.reported", "debug", {
      operation: "agent.session",
      relatedRefs: [
        `session:${sessionId}`,
        `mode:${request.mode}`,
        `max-turns:${this.runtime.maxTurns}`,
      ],
      // What this session starts from: its instructions and the task input handed to it.
      metrics: {
        instructionsBytes: new TextEncoder().encode(binding.instructions).byteLength,
        inputBytes: new TextEncoder().encode(JSON.stringify(checked.value)).byteLength,
        maxTurns: this.runtime.maxTurns,
      },
    });
    return {
      create: async () =>
        new AgenticSession<TResult>({
          sessionId,
          maxTurns: this.runtime.maxTurns,
          model: turn,
          tools: new DebugRecordingToolCall(binding.tools, this.runtime.debug),
          parser: new AgentActionParser(json),
          result,
          acceptance: binding.acceptance,
          journal: this.runtime.stores.journal,
          ledger: this.runtime.stores.usage,
          budgetScopeId: this.runtime.budgetScopeId,
          ids: this.runtime.ids,
          clock: this.runtime.clock,
          debug: this.runtime.debug,
        }),
    };
  }
}
