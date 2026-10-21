import type { RecordedDebugEvent } from "./RecordedDebugEvent.js";
export type RequiredEventCommitResult<TValue> =
  | Readonly<{ applied: true; value: TValue; recorded: RecordedDebugEvent }>
  | Readonly<{ applied: false; recorded: RecordedDebugEvent }>;
