import type { RuntimeControl } from "./RuntimeControl.js";
export interface IRuntimeResourceBinding {readonly id:string;readonly dependencies:readonly string[];isAcquired():boolean;acquire(control:RuntimeControl):Promise<void>;release(control:RuntimeControl):Promise<void>;}
