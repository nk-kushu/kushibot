export interface ITextLogWriter { write(line: string, signal: AbortSignal): Promise<void>; }
