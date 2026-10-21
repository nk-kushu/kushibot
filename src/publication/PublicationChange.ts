import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
export type PublicationChange=Readonly<{path:string;beforeDigest:string|null;after:ArtifactRef|null}>;
