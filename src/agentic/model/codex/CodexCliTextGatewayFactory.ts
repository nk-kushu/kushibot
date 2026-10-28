import type { IModelGatewayFactory } from "../../../models/contracts/IModelGatewayFactory.js";
import type { IModelGateway } from "../../../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../../../models/ModelProfile.js";
import type { IClock } from "../../../contracts/runtime/IClock.js";
import type { CodexCliOptions } from "./CodexCliOptions.js";
import type { ICodexCliTransport } from "./ICodexCliTransport.js";
import { SystemClock } from "../../../runtime/SystemClock.js";
import { CodexCliTransport } from "./CodexCliTransport.js";
import { CodexCliTextGateway } from "./CodexCliTextGateway.js";

export class CodexCliTextGatewayFactory implements IModelGatewayFactory {
  constructor(private readonly options: CodexCliOptions = {}, private readonly clock: IClock = new SystemClock(),
    private readonly createTransport: () => ICodexCliTransport = () => new CodexCliTransport(options)) {}
  create(profile: ModelProfile): IModelGateway {
    return new CodexCliTextGateway(profile, this.createTransport(), this.clock);
  }
}
