import type { RuntimeControl } from "./RuntimeControl.js";
import type { IRuntimeQuiescenceLease } from "./IRuntimeQuiescenceLease.js";
export interface IRuntimeQuiescenceBarrier {acquire(control:RuntimeControl):Promise<IRuntimeQuiescenceLease|null>;}
