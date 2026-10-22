import type { DebugHealthCode } from "./DebugHealthCode.js";

export interface IDebugHealthReporter { record(code: DebugHealthCode): void; }
