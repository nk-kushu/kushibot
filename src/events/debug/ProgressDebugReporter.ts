import type { IExecutionReporter } from "../../executors/contracts/IExecutionReporter.js";
import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";

export class ProgressDebugReporter implements IExecutionReporter {
  constructor(private readonly recorder: IScopedDebugRecorder) {}
  async progress(message: string): Promise<void> { this.recorder.event("progress.reported", "info", { summary: message }); }
}
