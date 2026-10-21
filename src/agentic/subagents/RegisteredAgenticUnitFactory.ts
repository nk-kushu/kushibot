import type { IAgenticUnitFactory } from "./IAgenticUnitFactory.js";
import type { IChildAgentBuilder } from "./IChildAgentBuilder.js";
import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
import type { ChildAgentBinding } from "./ChildAgentBinding.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class RegisteredAgenticUnitFactory implements IAgenticUnitFactory {
  private readonly builders = new Map<string, IChildAgentBuilder>();
  constructor(builders: readonly IChildAgentBuilder[]) {
    for (const builder of builders) { const key = this.key(builder.modelRole,builder.resultContractId); if (this.builders.has(key)) throw new SubAgentCoordinationError(); this.builders.set(key,builder); }
  }
  async create(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding> {
    const builder = this.builders.get(this.key(child.request.modelRole,child.request.resultContractId));
    if (builder === undefined) throw new SubAgentCoordinationError();
    const binding = await builder.build(child,context);
    if (binding.resultContract.id !== child.request.resultContractId) throw new SubAgentCoordinationError();
    return binding;
  }
  private key(role: string, contract: string): string { return JSON.stringify([role,contract]); }
}
