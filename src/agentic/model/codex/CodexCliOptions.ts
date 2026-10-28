/** Node.js host settings. Credentials are read and refreshed by Codex itself. */
export interface CodexCliOptions {
  /** CLI executable path; defaults to `codex` on PATH. */
  readonly executable?: string;
  /** Existing directory containing auth.json; defaults to Codex's normal home. */
  readonly codexHome?: string;
}
