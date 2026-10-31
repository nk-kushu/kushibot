export type DebugPayload = Readonly<{
  /** A bounded chunk of explicitly captured execution content. */
  content?: string;
  operation?: string; summary?: string; code?: string;
  count?: number; durationMs?: number; revision?: number;
  previousState?: string; nextState?: string;
  relatedRefs?: readonly string[];
  /** Named measurements (sizes, counts, token estimates); never content. */
  metrics?: Readonly<Record<string, number>>;
}>;
