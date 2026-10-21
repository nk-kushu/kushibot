import type { IDecisionProvider } from "./IDecisionProvider.js";
import type { DecisionRequest } from "./DecisionRequest.js";
import type { DecisionProviderResult } from "./DecisionProviderResult.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
import type { IModelInputSizer } from "../agentic/model/IModelInputSizer.js";
import { BudgetedModelCall } from "../agentic/model/BudgetedModelCall.js";
import { DecisionPromptBuilder } from "./DecisionPromptBuilder.js";
import { DecisionRequestError } from "../errors/DecisionRequestError.js";
export class StructuredModelDecisionProvider implements IDecisionProvider {
  constructor(private readonly calls: BudgetedModelCall, private readonly prompts: DecisionPromptBuilder,
    private readonly sizer: IModelInputSizer, private readonly maxOutputTokens: number) {
    if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1) throw new DecisionRequestError();
  }
  async evaluate(request: DecisionRequest, control: ModelCallControl): Promise<DecisionProviderResult> {
    const prompt = this.prompts.build(request);
    const inputTokenUpperBound = await this.sizer.upperBound(prompt);
    const result = await this.calls.run({ ...prompt, maxOutputTokens: this.maxOutputTokens, inputTokenUpperBound, promptCacheKey: null }, control);
    if (result.status === "stopped" || result.status === "uncertain") return result;
    // A reply can be known while its usage remains unknown. Never hide that pending accounting operation.
    if (result.reply.usage === null) return { status: "uncertain", operationId: control.operationId };
    if (result.stopReason !== null) return { status: "stopped", reason: result.stopReason };
    if (result.reply.status === "unavailable" || result.reply.status === "refused") return { status: "unavailable" };
    if (result.reply.status !== "completed" || new TextEncoder().encode(result.reply.text).byteLength > 8192) return { status: "invalid-output" };
    try { return { status: "output", value: JSON.parse(result.reply.text) as unknown }; }
    catch { return { status: "invalid-output" }; }
  }
}
