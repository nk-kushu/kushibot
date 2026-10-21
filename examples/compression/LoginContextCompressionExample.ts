import type { ContextCompositionInput } from "../../src/agentic/context/ContextCompositionInput.js";
import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import { ContextCompressionService } from "../../src/agentic/context/compression/ContextCompressionService.js";
import { ContextSummaryInstaller } from "../../src/agentic/context/compression/ContextSummaryInstaller.js";
import { AgentContextComposer } from "../../src/agentic/context/AgentContextComposer.js";
export class LoginContextCompressionExample {
  constructor(private readonly compression: ContextCompressionService, private readonly installer: ContextSummaryInstaller, private readonly composer: AgentContextComposer) {}
  async run(input: ContextCompositionInput, context: IExecutionContext) {
    const compressed = await this.compression.compress(input, context);
    if (compressed.status !== "prepared") return { compressed, installed: null, composed: null };
    const installed = await this.installer.install(compressed, context);
    const composed = await this.composer.compose(installed, context);
    return { compressed, installed, composed };
  }
}
