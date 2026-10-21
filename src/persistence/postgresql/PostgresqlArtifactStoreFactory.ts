import type { ArtifactStoreDependencies } from "../../artifacts/ArtifactStoreDependencies.js";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";
import type { ArtifactServices } from "../../artifacts/ArtifactServices.js";
import { ArtifactStoreFactory } from "../../artifacts/ArtifactStoreFactory.js";
import { postgresqlArtifactStatements } from "./postgresqlArtifactStatements.js";

export class PostgresqlArtifactStoreFactory {
  private readonly factory: ArtifactStoreFactory;
  constructor(dependencies: ArtifactStoreDependencies) {
    const d = dependencies;
    this.factory = new ArtifactStoreFactory(d.database, postgresqlArtifactStatements, d.scope, d.limits,
      d.digest, d.clock, d.ids, d.capture, d.metadataMaxBytes);
  }
  create(producer: ExecutionIdentity): ArtifactServices { return this.factory.create(producer); }
}
