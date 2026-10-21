import type { NotebookEntry } from "./NotebookEntry.js";
export type NotebookSnapshot = Readonly<{ entries: readonly NotebookEntry[] }>;
