import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";

export type RuntimeDependencies = Readonly<{
  clock: IClock;
  ids: IIdGenerator;
}>;
