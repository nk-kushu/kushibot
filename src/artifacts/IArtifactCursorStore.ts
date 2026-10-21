import type { ArtifactCursorState } from "./ArtifactCursorState.js";

export interface IArtifactCursorStore {
  put(state: ArtifactCursorState): string;
  get(token: string): ArtifactCursorState;
}
