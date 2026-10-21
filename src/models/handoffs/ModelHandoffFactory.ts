import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { ModelHandoff } from "./ModelHandoff.js";
import type { HandoffPreparation } from "./HandoffPreparation.js";
import { ModelHandoffContract } from "./ModelHandoffContract.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";
export class ModelHandoffFactory {
  constructor(private readonly clock: IClock, private readonly ids: IIdGenerator, private readonly contract: ModelHandoffContract) {}
  async prepare(input: Omit<ModelHandoff, "schemaVersion" | "handoffId" | "createdAtEpochMs">): Promise<HandoffPreparation> {
    const checked = await this.contract.validate({ ...input, schemaVersion: 1, handoffId: this.ids.nextId(), createdAtEpochMs: this.clock.nowEpochMs() });
    if (!checked.valid) throw new ConfigurationError("Cannot prepare invalid model handoff.");
    if (checked.value.pendingOperationRefs.length > 0) return { kind: "blocked", reasonCode: "UNRESOLVED_OPERATIONS", pendingOperationRefs: checked.value.pendingOperationRefs };
    return Object.freeze({ kind: "prepared", handoff: checked.value, requiresSourceRevalidation: true });
  }
}
