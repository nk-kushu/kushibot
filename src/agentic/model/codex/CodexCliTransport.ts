import type { CodexCliOptions } from "./CodexCliOptions.js";
import type { ICodexCliTransport } from "./ICodexCliTransport.js";

/** Runs a fresh CLI session; never reads, copies, or returns auth.json contents. */
export class CodexCliTransport implements ICodexCliTransport {
  private readonly options: CodexCliOptions;

  constructor(options: CodexCliOptions = {}) {
    for (const value of [options.executable, options.codexHome]) {
      if (value !== undefined && (!value.trim() || value.includes("\0")))
        throw new Error("Invalid Codex CLI options.");
    }
    this.options = Object.freeze({ ...options });
  }

  async run(input: Parameters<ICodexCliTransport["run"]>[0]): ReturnType<ICodexCliTransport["run"]> {
    // Load Node APIs only when the CLI transport is used, keeping other gateways
    // importable in hosts without Node's process and filesystem modules.
    const { spawn } = await import("node:child_process");
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir, homedir } = await import("node:os");
    const { join, resolve } = await import("node:path");
    input.signal.throwIfAborted();
    const cwd = await mkdtemp(join(tmpdir(), "kushibot-codex-"));
    try {
      input.signal.throwIfAborted();
      // Use an empty working directory so project instructions and files cannot
      // silently become extra model context. Authentication still uses CODEX_HOME.
      const env: NodeJS.ProcessEnv = { ...process.env, CODEX_HOME: resolve(this.options.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), ".codex")) };
      // Prefer the saved auth.json, not API keys inherited from the parent host.
      delete env.OPENAI_API_KEY;
      delete env.CODEX_API_KEY;
      const args = [
        "exec", "--strict-config", "--json", "--ephemeral", "--skip-git-repo-check",
        "--ignore-user-config", "--ignore-rules", "--sandbox", "read-only",
        "--color", "never", "--model", input.modelId,
        "-c", 'cli_auth_credentials_store="file"',
        "-c", 'approval_policy="never"',
        "-c", 'web_search="disabled"',
        "-c", "features.shell_tool=false", "-c", "features.apps=false",
        "-c", "features.hooks=false", "-c", "features.plugins=false",
        "-c", "features.multi_agent=false", "-c", "project_doc_max_bytes=0",
        "-c", `developer_instructions=${JSON.stringify(input.instructions)}`,
        "-",
      ];
      return await new Promise((accept, reject) => {
        const child = spawn(this.options.executable ?? "codex", args, {
          cwd, env, shell: false, stdio: ["pipe", "pipe", "pipe"],
          detached: process.platform !== "win32",
        });
        let output = "", bytes = 0, failure: Error | undefined;
        const stop = () => {
          // Kill the process group on POSIX so cancellation also stops descendants.
          try {
            if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
            else child.kill("SIGKILL");
          } catch { child.kill("SIGKILL"); }
        };
        const abort = () => { failure = new Error("Codex CLI cancelled."); stop(); };
        input.signal.addEventListener("abort", abort, { once: true });
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          bytes += new TextEncoder().encode(chunk).byteLength;
          if (bytes > input.maxResponseBytes) {
            failure = new Error("Codex CLI response exceeds byte limit.");
            stop();
          } else output += chunk;
        });
        // Drain diagnostics without retaining potentially sensitive CLI output.
        child.stderr.resume();
        child.stdin.on("error", () => { failure ??= new Error("Codex CLI input failed."); stop(); });
        child.on("error", () => { failure = new Error("Codex CLI could not start."); });
        child.on("close", (code) => {
          input.signal.removeEventListener("abort", abort);
          if (failure) reject(failure);
          else accept({ stdout: output, exitCode: code ?? -1 });
        });
        if (input.signal.aborted) abort();
        else child.stdin.end(input.prompt);
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
}
