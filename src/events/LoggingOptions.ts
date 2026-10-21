import type { LogLevel } from "./LogLevel.js";

export type LoggingOptions = Readonly<{ enabled: boolean; level: LogLevel }>;
