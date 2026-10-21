import type { PersistenceServices } from "./PersistenceServices.js";

export interface IPersistenceFactory {
  create(): PersistenceServices;
}
