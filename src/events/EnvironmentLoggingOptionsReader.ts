import type { LoggingOptions } from "./LoggingOptions.js";
import type { LogLevel } from "./LogLevel.js";
import { defaultLoggingOptions } from "./defaultLoggingOptions.js";
import { logLevelRanks } from "./logLevelRanks.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export class EnvironmentLoggingOptionsReader {
  private readonly environment: Readonly<Record<string, string | undefined>>;
  constructor(environment: Readonly<Record<string, string | undefined>>) {
    this.environment = Object.freeze({ ...environment });
  }
  read(base: LoggingOptions = defaultLoggingOptions): LoggingOptions {
    let enabled = base.enabled;
    let level = base.level;
    const rawEnabled = this.environment.KUSHIBOT_LOG_ENABLED;
    const rawLevel = this.environment.KUSHIBOT_LOG_LEVEL;
    if (rawEnabled !== undefined) {
      const normalized = rawEnabled.trim().toLowerCase();
      if (normalized !== "true" && normalized !== "false") throw new ConfigurationError("Invalid KUSHIBOT_LOG_ENABLED.");
      enabled = normalized === "true";
    }
    if (rawLevel !== undefined) {
      const normalized = rawLevel.trim().toLowerCase();
      if (!Object.hasOwnProperty.call(logLevelRanks, normalized)) throw new ConfigurationError("Invalid KUSHIBOT_LOG_LEVEL.");
      level = normalized as LogLevel;
    }
    if (typeof enabled !== "boolean" || !Object.hasOwnProperty.call(logLevelRanks, level)) throw new ConfigurationError("Invalid base logging options.");
    return Object.freeze({ enabled, level });
  }
}
