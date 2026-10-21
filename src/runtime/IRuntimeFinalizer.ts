import type { RuntimeControl } from "./RuntimeControl.js";
export interface IRuntimeFinalizer {readonly id:string;flush(control:RuntimeControl):Promise<void>;}
