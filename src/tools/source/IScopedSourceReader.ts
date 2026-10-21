export interface IScopedSourceReader { read(sourceRef: string, maxBytes: number, signal: AbortSignal): Promise<string>; }
