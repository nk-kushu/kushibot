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
    return {
      create: async () =>
        new AgenticSession<TResult>(
          sessionId,
          this.runtime.maxTurns,
          turn,
          binding.tools,
          new AgentActionParser(json),
          result,
          binding.acceptance,
          this.runtime.stores.journal,
          this.runtime.stores.usage,
          this.runtime.budgetScopeId,
          this.runtime.ids,
          this.runtime.clock,
        ),
    };
  }
}
