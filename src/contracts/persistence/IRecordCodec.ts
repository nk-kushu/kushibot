export interface IRecordCodec<TRecord> {
  encode(value: unknown): Promise<string>;
  decode(serialized: string): Promise<TRecord>;
}
