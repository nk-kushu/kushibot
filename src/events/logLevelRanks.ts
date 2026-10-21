import type { LogLevel } from "./LogLevel.js";

export const logLevelRanks: Readonly<Record<LogLevel, number>> = Object.freeze({
  debug: 10, info: 20, warn: 30, error: 40,
});
