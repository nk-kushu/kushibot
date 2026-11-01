export interface IAgentRunOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (message: string) => void | Promise<void>;
  /** Replaces the runtime's timeout for this process, e.g. the active time a resumed run has left. */
  readonly timeoutMs?: number;
  /** Reopens this run instead of allocating a new identity; only `Agent.resume` should set it. */
  readonly runId?: string;
}
