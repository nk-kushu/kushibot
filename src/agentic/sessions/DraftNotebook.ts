import type { NotebookEntry } from "./NotebookEntry.js";
import type { NotebookSnapshot } from "./NotebookSnapshot.js";
import { AgentSessionError } from "../../errors/AgentSessionError.js";
export class DraftNotebook {
  private readonly entries: NotebookEntry[] = [];
  constructor(private readonly maxEntries = 16, private readonly maxBytes = 16384) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 32 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 32768) throw new AgentSessionError();
  }
  append(entry: NotebookEntry): boolean {
    if (typeof entry.text !== "string" || !entry.text.trim() || entry.text.length > 2048 || !Array.isArray(entry.evidenceRefs) || entry.evidenceRefs.length > 8 || entry.evidenceRefs.some(ref => typeof ref !== "string" || !ref || ref.length > 256)) return false;
    const copy = Object.freeze({ text: entry.text, evidenceRefs: Object.freeze([...new Set(entry.evidenceRefs)]) });
    if (this.entries.length >= this.maxEntries || new TextEncoder().encode(JSON.stringify([...this.entries, copy])).byteLength > this.maxBytes) return false;
    this.entries.push(copy); return true;
  }
  snapshot(): NotebookSnapshot { return Object.freeze({ entries: Object.freeze([...this.entries]) }); }
}
