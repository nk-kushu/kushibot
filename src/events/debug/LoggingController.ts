import type { LoggingOptions } from "./LoggingOptions.js";
import type { LogLevel } from "./LogLevel.js";
import { logLevelRanks } from "./logLevelRanks.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";

export class LoggingController {
  private options: LoggingOptions;
  constructor(options: LoggingOptions) {
    if (typeof options.enabled !== "boolean" || !Object.hasOwnProperty.call(logLevelRanks, options.level)) throw new ConfigurationError("Invalid logging options.");
    this.options = Object.freeze({ ...options });
  }
  snapshot(): LoggingOptions { return this.options; }
  setEnabled(enabled: boolean): void {
    if (typeof enabled !== "boolean") throw new ConfigurationError("Logging enabled must be boolean.");
    this.options = Object.freeze({ ...this.options, enabled });
  }
  setLevel(level: LogLevel): void {
    if (!Object.hasOwnProperty.call(logLevelRanks, level)) throw new ConfigurationError("Invalid logging level.");
    this.options = Object.freeze({ ...this.options, level });
  }
  allows(level: LogLevel, snapshot: LoggingOptions = this.options): boolean {
    return snapshot.enabled && logLevelRanks[level] >= logLevelRanks[snapshot.level];
  }
}
