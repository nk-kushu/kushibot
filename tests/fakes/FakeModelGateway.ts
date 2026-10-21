import type { IModelGateway } from "../../src/models/contracts/IModelGateway.js";
import type { ModelRequest } from "../../src/agentic/model/ModelRequest.js";
import type { ModelCallControl } from "../../src/agentic/model/ModelCallControl.js";
import type { ModelReply } from "../../src/agentic/model/ModelReply.js";
export class FakeModelGateway implements IModelGateway {
  private calls = 0;
  constructor(private readonly reply: ModelReply) {}
  async generate(_request: ModelRequest, _control: ModelCallControl): Promise<ModelReply> { this.calls++; return this.reply; }
  count(): number { return this.calls; }
}
