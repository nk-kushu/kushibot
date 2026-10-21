import type { IModelInputSizer } from "../../src/agentic/model/IModelInputSizer.js";
import type { ModelRequest } from "../../src/agentic/model/ModelRequest.js";
export class FixtureModelInputSizer implements IModelInputSizer {
  async upperBound(request: Pick<ModelRequest, "instructions" | "messages">): Promise<number> {
    return request.instructions.length + request.messages.reduce((total, message) => total + message.text.length + 16, 0);
  }
}
