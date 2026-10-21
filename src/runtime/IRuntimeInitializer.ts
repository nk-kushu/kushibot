import type { RuntimeControl } from "./RuntimeControl.js";
export interface IRuntimeInitializer {readonly id:string;initialize(control:RuntimeControl):Promise<void>;}
