import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ArtifactStatements } from "./ArtifactStatements.js";
import { PersistenceError } from "../../errors/PersistenceError.js";

export class ArtifactSchema {
  constructor(private readonly database: ISqlDatabase, private readonly sql: ArtifactStatements) {}
  async initialize(): Promise<void> {
    await this.database.migrationTransaction(async transaction => {
      await transaction.query(this.sql.schema[0], []);
      const current = await transaction.query(this.sql.readVersion, []);
      if (current.rows.length === 1 && current.rows[0].version === 1) return;
      if (current.rows.length !== 0) throw new PersistenceError("Unsupported artifact schema version.");
      for (const ddl of this.sql.schema.slice(1)) await transaction.query(ddl, []);
      await transaction.query(this.sql.installVersion, []);
    });
  }
}
