import type { IModelGatewayFactory } from "../../../models/contracts/IModelGatewayFactory.js";
import type { IModelGateway } from "../../../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../../../models/ModelProfile.js";
import type { IClock } from "../../../contracts/runtime/IClock.js";
import type { IOpenAiResponsesTransport } from "./IOpenAiResponsesTransport.js";
import { OpenAiTextGateway } from "./OpenAiTextGateway.js";
import { ModelRequestValidator } from "../ModelRequestValidator.js";
import { OpenAiTextRequestMapper } from "./OpenAiTextRequestMapper.js";
import { OpenAiTextReplyMapper } from "./OpenAiTextReplyMapper.js";
import { SystemClock } from "../../../runtime/SystemClock.js";
export class OpenAiTextGatewayFactory implements IModelGatewayFactory {
  constructor(private readonly createTransport: () => IOpenAiResponsesTransport, private readonly clock: IClock = new SystemClock()) {}
  create(profile: ModelProfile): IModelGateway { return new OpenAiTextGateway(profile, this.createTransport(), this.clock,
    new ModelRequestValidator(), new OpenAiTextRequestMapper(), new OpenAiTextReplyMapper()); }
}
