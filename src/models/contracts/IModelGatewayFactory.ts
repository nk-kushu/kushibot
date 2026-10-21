import type { IModelGateway } from "./IModelGateway.js";
import type { ModelProfile } from "../ModelProfile.js";
export interface IModelGatewayFactory { create(profile: ModelProfile): IModelGateway; }
