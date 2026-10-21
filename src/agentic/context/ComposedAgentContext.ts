import type { ModelProfile } from "../../models/ModelProfile.js";
import type { ModelRequest } from "../model/ModelRequest.js";
export type ComposedAgentContext = Readonly<{ request: ModelRequest; profile: ModelProfile; snapshotRef: string; instructionRevision: string;
  included: readonly Readonly<{ id: string; sourceRef: string; revisionRef: string }>[]; omittedOptionalIds: readonly string[]; droppedForSizeIds: readonly string[] }>;
