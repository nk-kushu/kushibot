import type { IArtifactReader } from "./IArtifactReader.js";
import type { IArtifactWriter } from "./IArtifactWriter.js";

export interface IArtifactStore extends IArtifactReader, IArtifactWriter {}
