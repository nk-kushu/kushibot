export interface IAgentRunOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (message: string) => void | Promise<void>;
}
