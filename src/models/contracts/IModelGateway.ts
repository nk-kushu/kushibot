import type { ModelRequest } from "../../agentic/model/ModelRequest.js";
import type { ModelReply } from "../../agentic/model/ModelReply.js";
import type { ModelCallControl } from "../../agentic/model/ModelCallControl.js";
export interface IModelGateway { generate(request: ModelRequest, control: ModelCallControl): Promise<ModelReply>; }
