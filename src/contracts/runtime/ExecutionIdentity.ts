export type ExecutionIdentity = Readonly<{
  operationId: string;
  runId?: string;
  stepRunId?: string;
  sessionId?: string;
  parentOperationId?: string;
}>;
