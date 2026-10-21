import type { ModelRequest } from "./ModelRequest.js";
export interface IModelInputSizer {
  upperBound(request: Pick<ModelRequest, "instructions" | "messages">): Promise<number>;
}
