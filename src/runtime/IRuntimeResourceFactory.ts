import type { RuntimeControl } from "./RuntimeControl.js";
export interface IRuntimeResourceFactory<TResource extends object>{acquire(control:RuntimeControl):Promise<TResource>;release(resource:TResource,control:RuntimeControl):Promise<void>;}
