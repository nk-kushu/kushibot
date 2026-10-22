export type TraceContext = Readonly<{
  traceId: string; spanId: string; parentSpanId: string | null; causationEventId: string | null;
}>;
