import type { RuntimeControl } from "./RuntimeControl.js";
export interface IRuntimeReadinessCheck {readonly id:string;verify(control:RuntimeControl):Promise<boolean>;}
