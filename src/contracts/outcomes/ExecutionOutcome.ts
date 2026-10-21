import type { PartialProgress } from "./PartialProgress.js";

export type ExecutionOutcome<TResult> =
  | Readonly<{
      status: "completed";
      result: TResult;
    }>
  | Readonly<{
      status: "stopped";
      reason: Readonly<{
        code: "limit-reached" | "deadline-reached" | "cancelled" | "no-progress";
        message: string;
      }>;
      partial: PartialProgress;
      pendingOperationRefs: readonly string[];
    }>
  | Readonly<{
      status: "failed";
      error: Readonly<{ code: string; message: string }>;
      partial: PartialProgress;
      pendingOperationRefs: readonly string[];
    }>;
