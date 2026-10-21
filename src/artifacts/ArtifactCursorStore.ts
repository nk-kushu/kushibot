import type { IArtifactCursorStore } from "./IArtifactCursorStore.js";
import type { ArtifactCursorState } from "./ArtifactCursorState.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import { ArtifactError } from "../errors/ArtifactError.js";

export class ArtifactCursorStore implements IArtifactCursorStore {
  private readonly entries = new Map<string, Readonly<{ expiresAt: number; state: ArtifactCursorState }>>();
  constructor(private readonly clock: IClock, private readonly ids: IIdGenerator,
    private readonly maxEntries: number, private readonly ttlMs: number) {
    if (![maxEntries, ttlMs].every(value => Number.isSafeInteger(value) && value > 0)) {
      throw new ArtifactError("ARTIFACT_INVALID", "Invalid cursor-store bounds.");
    }
  }

  put(state: ArtifactCursorState): string {
    if (!Number.isSafeInteger(state.offset) || state.offset < 0 || !Number.isSafeInteger(state.nextLine) || state.nextLine < 1 ||
        !state.artifactId || !/^[a-f0-9]{64}$/.test(state.digest) || !["page", "search"].includes(state.mode)) {
      throw new ArtifactError("ARTIFACT_CURSOR_INVALID", "Invalid cursor state.");
    }
    const now = this.clock.nowEpochMs();
    for (const [token, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(token);
    if (this.entries.size >= this.maxEntries || !Number.isSafeInteger(now + this.ttlMs)) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Cursor capacity reached.");
    }
    const token = this.ids.nextId();
    if (!token || token.length > 256 || this.entries.has(token)) throw new ArtifactError("ARTIFACT_CONFLICT", "Cursor identity collided.");
    this.entries.set(token, Object.freeze({ expiresAt: now + this.ttlMs, state: Object.freeze({ ...state }) }));
    return token;
  }
  get(token: string): ArtifactCursorState {
    const entry = this.entries.get(token);
    if (entry === undefined || entry.expiresAt <= this.clock.nowEpochMs()) {
      this.entries.delete(token);
      throw new ArtifactError("ARTIFACT_CURSOR_INVALID", "Cursor is missing or expired.");
    }
    return entry.state;
  }
}
