export interface ICodexCliTransport {
  run(input: {
    readonly modelId: string;
    readonly instructions: string;
    readonly prompt: string;
    readonly maxResponseBytes: number;
    readonly signal: AbortSignal;
  }): Promise<{ readonly stdout: string; readonly exitCode: number }>;
}
