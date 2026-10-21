/** Supplies UTC wall-clock time as milliseconds since the Unix epoch. */
export interface IClock {
  nowEpochMs(): number;
}
