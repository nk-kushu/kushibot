import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";

/** A host directory or file exposed inside the isolated environment. */
export type CliMount = Readonly<{
  source: string;
  /** Absolute path inside the environment. */
  target: string;
  writable: boolean;
}>;

/** One command in an isolated environment. An executor must fail rather than run it unconfined. */
export type CliInvocation = Readonly<{
  /** Executable followed by its arguments; not interpreted by a shell. */
  command: readonly string[];
  mounts: readonly CliMount[];
  workingDirectory: string;
  timeoutMs?: number;
  /** Bytes returned in `output`; anything past it only reaches `log`. */
  maxOutputBytes?: number;
}>;

/** Real results only: `exitCode` is null when the process was killed or never finished. */
export type CliExecutionResult = Readonly<{
  exitCode: number | null;
  /** Bounded combined output for the model. */
  output: string;
  /** True when `output` is cut. */
  truncated: boolean;
  timedOut: boolean;
  /** Up to the executor's log limit of output, for saving as an artifact. */
  log: string;
}>;

export interface ICliExecutor {
  /** @throws When isolation cannot be established; never degrades to the host shell. */
  run(invocation: CliInvocation, context: IExecutionContext): Promise<CliExecutionResult>;
}
