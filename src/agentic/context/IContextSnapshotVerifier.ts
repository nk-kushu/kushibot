import type { ContextCompositionInput } from "./ContextCompositionInput.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export interface IContextSnapshotVerifier { verify(input: ContextCompositionInput, context: IExecutionContext): Promise<boolean>; }
