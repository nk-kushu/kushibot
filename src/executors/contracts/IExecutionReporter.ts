/** Reports diagnostic progress; production implementations must bound and redact messages. */
export interface IExecutionReporter {
  progress(message: string): Promise<void>;
}
