import type { IExecutionReporter } from "../../src/executors/contracts/IExecutionReporter.js";

export class RecordingExecutionReporter implements IExecutionReporter {
  private readonly messages: string[] = [];

  async progress(message: string): Promise<void> {
    this.messages.push(message);
  }

  snapshot(): readonly string[] {
    return [...this.messages];
  }
}
