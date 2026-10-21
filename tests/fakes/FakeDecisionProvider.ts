import type { IDecisionProvider } from "../../src/decisions/IDecisionProvider.js";
import type { DecisionRequest } from "../../src/decisions/DecisionRequest.js";
import type { DecisionProviderResult } from "../../src/decisions/DecisionProviderResult.js";
import type { ModelCallControl } from "../../src/agentic/model/ModelCallControl.js";
export class FakeDecisionProvider implements IDecisionProvider {
  private calls = 0;
  constructor(private readonly result: DecisionProviderResult) {}
  async evaluate(_request: DecisionRequest, _control: ModelCallControl): Promise<DecisionProviderResult> { this.calls++; return this.result; }
  count(): number { return this.calls; }
}
