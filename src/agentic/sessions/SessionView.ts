import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { NotebookSnapshot } from "./NotebookSnapshot.js";
export type SessionView = Readonly<{ sessionId: string; turn: number; notebook: NotebookSnapshot; lastObservation: JsonValue | null }>;
