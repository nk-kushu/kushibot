import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot.js";
import type { RuntimeControl } from "./RuntimeControl.js";
export interface IRuntimeRecoveryWriter {save(snapshot:RuntimeShutdownSnapshot,control:RuntimeControl):Promise<string>;}
