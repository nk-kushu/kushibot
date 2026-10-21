/** A replaceable decision or transformation over a scoped input snapshot. */
export interface IPolicy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
