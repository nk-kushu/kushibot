import type { IChildAgentBuilder } from "./IChildAgentBuilder.js";
import type { IChildSessionFactoryProvider } from "./IChildSessionFactoryProvider.js";
import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
import type { ChildAgentBinding } from "./ChildAgentBinding.js";
import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { AgenticMindUnit } from "../sessions/AgenticMindUnit.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class SessionChildAgentBuilder implements IChildAgentBuilder {
  readonly resultContractId: string;
  constructor(readonly modelRole: string,
    private readonly resultContract: IResultContract<JsonValue>,
    private readonly sessions: IChildSessionFactoryProvider) { this.resultContractId = resultContract.id; }
  async build(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding> {
    if (child.request.modelRole !== this.modelRole ||
        child.request.resultContractId !== this.resultContractId ||
        context.identity.sessionId !== child.sessionId ||
        context.identity.operationId !== child.operationId) throw new SubAgentCoordinationError();
    const factory = await this.sessions.create(child,context);
    return Object.freeze({ unit: new AgenticMindUnit(factory), resultContract: this.resultContract });
  }
}
