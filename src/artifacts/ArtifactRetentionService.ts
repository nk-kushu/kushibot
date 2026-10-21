import type { IArtifactStorageAdapter } from "./IArtifactStorageAdapter.js";
import type { IClock } from "../contracts/runtime/IClock.js";

export class ArtifactRetentionService {
  constructor(private readonly storage: IArtifactStorageAdapter, private readonly clock: IClock, private readonly maxPins: number) {}
  pin(artifactId: string, pinId: string): Promise<void> { return this.storage.pin(artifactId, pinId, this.clock.nowEpochMs(), this.maxPins); }
  unpin(artifactId: string, pinId: string): Promise<void> { return this.storage.unpin(artifactId, pinId); }
  deleteExpired(artifactId: string): Promise<boolean> { return this.storage.deleteExpired(artifactId, this.clock.nowEpochMs()); }
}
