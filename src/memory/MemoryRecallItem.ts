import type { MemoryRecord } from "./MemoryRecord.js";
import type { ContextFragment } from "../agentic/context/ContextFragment.js";
export type MemoryRecallItem=Readonly<{record:MemoryRecord;verificationRef:string;validUntilEpochMs:number;fragment:ContextFragment}>;
