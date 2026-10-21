import type { IExecutionContext } from "../../src/index.js";
import type { IIdGenerator } from "../../src/index.js";
import type { SubAgentRequest } from "../../src/index.js";
import type { SubAgentOutcome } from "../../src/index.js";
import { SubAgentCoordinator } from "../../src/index.js";
export class LoginSubAgentExample {
  constructor(private readonly children: SubAgentCoordinator, private readonly ids: IIdGenerator) {}
  async run(context: IExecutionContext): Promise<Readonly<{ first: SubAgentOutcome; second: SubAgentOutcome | null }>> {
    const first = await this.children.spawn(this.request("Add Google-login validation while preserving password login."),this.command(context));
    if (first.status !== "returned" || first.outcome.status !== "completed") return { first, second: null };
    const second = await this.children.spawn(this.request("Inspect the current login.ts after child A, then add the expiry check without removing A's Google-login validation."),this.command(context));
    return { first, second };
  }
  private command(context: IExecutionContext): IExecutionContext { return Object.freeze({ ...context, identity: Object.freeze({ ...context.identity, operationId: this.ids.nextId(), parentOperationId: context.identity.operationId }) }); }
  private request(goal: string): SubAgentRequest { return Object.freeze({ goal, acceptanceCriteria: ["Password login remains supported.","Use current source revisions and return saved change/check references."], sourceRefs: [], modelRole: "login-editor", resultContractId: "login-change-report", toolIds: ["read-source","edit-source","check-login"], access: "edit", filePaths: ["src/login.ts"], maxTurns: 6, limits: { modelCalls: 6, inputTokens: 16000, outputTokens: 4000, toolCalls: 6, iterations: 6, fixes: 1 }, deadlineEpochMs: null }); }
}
