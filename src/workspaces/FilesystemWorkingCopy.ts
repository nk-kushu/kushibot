import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/** Creates a retained, per-run filesystem copy for tools and checks to use. */
export class FilesystemWorkingCopy {
  async create(source: string): Promise<string> {
    const root = await realpath(source);
    const parent = await mkdtemp(path.join(tmpdir(), "kushibot-workspace-"));
    const destination = path.join(parent, "workspace");
    try {
      await cp(root, destination, {
        recursive: true,
        verbatimSymlinks: true,
        filter: (entry) => path.basename(entry) !== ".git",
      });
      return destination;
    } catch (error) {
      await rm(parent, { recursive: true, force: true });
      throw error;
    }
  }
}
