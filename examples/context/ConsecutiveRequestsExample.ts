import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import { AgentContextComposer } from "../../src/agentic/context/AgentContextComposer.js";
import { OpenAiTextRequestMapper } from "../../src/agentic/model/openai/OpenAiTextRequestMapper.js";
import { createLoginContextFixture } from "./createLoginContextFixture.js";
export class ConsecutiveRequestsExample {
  constructor(private readonly composer: AgentContextComposer, private readonly mapper: OpenAiTextRequestMapper, private readonly modelId: string) {}
  async build(context: IExecutionContext) {
    const fixture = createLoginContextFixture();
    const first = await this.composer.compose(fixture.first, context); const second = await this.composer.compose(fixture.second, context);
    if (first.status !== "ready" || second.status !== "ready") return { first, second };
    const firstPayload = this.mapper.map(first.context.request, this.modelId); const secondPayload = this.mapper.map(second.context.request, this.modelId);
    return Object.freeze({ first, second, firstPayload, secondPayload,
      sameInstructions: firstPayload.instructions === secondPayload.instructions,
      sameAssignment: firstPayload.input[0].content === secondPayload.input[0].content,
      changedEvidence: firstPayload.input[1].content !== secondPayload.input[1].content });
  }
}
