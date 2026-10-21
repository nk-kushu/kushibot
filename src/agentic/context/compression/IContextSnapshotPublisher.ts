import type { CompressedContextSnapshotRequest } from "./CompressedContextSnapshotRequest.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
export interface IContextSnapshotPublisher { publish(request: CompressedContextSnapshotRequest, context: IExecutionContext): Promise<string>; }
