import type { IArtifactPagedReader } from "./IArtifactPagedReader.js";
import type { IArtifactSearchReader } from "./IArtifactSearchReader.js";
import type { IArtifactRangeReader } from "./IArtifactRangeReader.js";
import type { IArtifactCursorStore } from "./IArtifactCursorStore.js";
import type { ArtifactPageRequest } from "./ArtifactPageRequest.js";
import type { ArtifactPage } from "./ArtifactPage.js";
import type { ArtifactSearchRequest } from "./ArtifactSearchRequest.js";
import type { ArtifactSearchResult } from "./ArtifactSearchResult.js";
import type { ArtifactRef } from "./ArtifactRef.js";
import type { ArtifactCursorState } from "./ArtifactCursorState.js";
import type { ArtifactLimits } from "./ArtifactLimits.js";
import { validateArtifactLimits } from "./validateArtifactLimits.js";
import { ArtifactError } from "../errors/ArtifactError.js";

export class TextArtifactReader implements IArtifactPagedReader, IArtifactSearchReader {
  private readonly limits: ArtifactLimits;
  constructor(private readonly reader: IArtifactRangeReader, private readonly cursors: IArtifactCursorStore, limits: ArtifactLimits) {
    this.limits = validateArtifactLimits(limits);
  }

  async readPage(request: ArtifactPageRequest, signal?: AbortSignal): Promise<ArtifactPage> {
    this.bound(request.maxLines, this.limits.maxPageLines);
    this.bound(request.maxBytes, this.limits.maxPageBytes);
    const state = this.position(request.reference, "page", "", request.cursor);
    const page = await this.collect(request.reference, state, request.maxBytes, request.maxLines,
      this.limits.maxSearchScanBytes, signal);
    return { ...page, nextCursor: page.done ? null : this.cursors.put({ ...state,
      offset: page.range.endByteExclusive, nextLine: state.nextLine + this.lineCount(page.content) }) };
  }

  async search(request: ArtifactSearchRequest, signal?: AbortSignal): Promise<ArtifactSearchResult> {
    this.bound(request.maxMatches, this.limits.maxSearchMatches);
    this.bound(request.maxBytes, this.limits.maxPageBytes);
    this.bound(request.maxScanBytes, this.limits.maxSearchScanBytes);
    if (!request.query || new TextEncoder().encode(request.query).byteLength > this.limits.maxPageBytes) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Search query is empty or too large.");
    }
    const state = this.position(request.reference, "search", request.query, request.cursor);
    // Read at most one bounded page per search call; continuation reports unsearched material.
    const page = await this.collect(request.reference, state, Math.min(this.limits.maxPageBytes, request.maxScanBytes),
      this.limits.maxPageLines, request.maxScanBytes, signal);
    const matches: Array<Readonly<{ line: number; startByte: number; endByteExclusive: number; content: string }>> = [];
    const lines = page.content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    let offset = state.offset;
    let lineNumber = state.nextLine;
    let returnedBytes = 0;
    for (const line of lines) {
      const bytes = new TextEncoder().encode(line).byteLength;
      if (line.includes(request.query)) {
        if (matches.length === request.maxMatches || returnedBytes + bytes > request.maxBytes) {
          if (matches.length === 0) throw new ArtifactError("ARTIFACT_LIMIT", "A matching line exceeds the result bound.");
          break;
        }
        matches.push({ line: lineNumber, startByte: offset, endByteExclusive: offset + bytes, content: line });
        returnedBytes += bytes;
      }
      offset += bytes;
      lineNumber += 1;
    }
    const done = page.done && offset === page.range.endByteExclusive;
    return { reference: page.reference, matches, scannedBytes: page.scannedBytes, done,
      nextCursor: done ? null : this.cursors.put({ ...state, offset, nextLine: lineNumber }) };
  }

  private async collect(reference: ArtifactRef, state: ArtifactCursorState, maxBytes: number,
    maxLines: number, maxScannedBytes: number, signal?: AbortSignal): Promise<ArtifactPage> {
    const metadata = await this.reader.info(reference, signal);
    if (metadata.ref.mediaType !== "text/plain") throw new ArtifactError("ARTIFACT_UNSUPPORTED", "This reader supports UTF-8 text/plain only.");
    const slice = await this.reader.readSlice(reference, state.offset, maxBytes, maxScannedBytes, signal);
    let end = 0;
    let lines = 0;
    for (let index = 0; index < slice.data.length; index += 1) {
      if (slice.data[index] === 10) {
        end = index + 1;
        lines += 1;
        if (lines === maxLines) break;
      }
    }
    const atEnd = state.offset + slice.data.length === reference.byteLength;
    if (atEnd && lines < maxLines && end < slice.data.length) { end = slice.data.length; lines += 1; }
    if (end === 0 && slice.data.length > 0) throw new ArtifactError("ARTIFACT_LIMIT", "A text line exceeds the page bound.");
    let content: string;
    try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(slice.data.subarray(0, end)); }
    catch (error: unknown) {
      if (!(error instanceof TypeError)) throw error;
      throw new ArtifactError("ARTIFACT_CORRUPT", "Artifact is not valid UTF-8 text.");
    }
    const endByte = state.offset + end;
    return { reference: metadata.ref, content,
      range: { firstLine: lines === 0 ? null : state.nextLine, lastLine: lines === 0 ? null : state.nextLine + lines - 1,
        startByte: state.offset, endByteExclusive: endByte },
      scannedBytes: slice.scannedBytes, done: endByte === reference.byteLength, nextCursor: null };
  }

  private position(reference: ArtifactRef, mode: "page" | "search", query: string, token?: string): ArtifactCursorState {
    if (token === undefined) return { artifactId: reference.artifactId, digest: reference.digest, mode, query, offset: 0, nextLine: 1 };
    const state = this.cursors.get(token);
    if (state.artifactId !== reference.artifactId || state.digest !== reference.digest || state.mode !== mode || state.query !== query) {
      throw new ArtifactError("ARTIFACT_CURSOR_INVALID", "Cursor does not match this immutable query.");
    }
    return state;
  }
  private lineCount(content: string): number { return (content.match(/[^\n]*\n|[^\n]+$/g) ?? []).length; }
  private bound(value: number, cap: number): void {
    if (!Number.isSafeInteger(value) || value < 1 || value > cap) throw new ArtifactError("ARTIFACT_LIMIT", "Requested bound exceeds permitted capacity.");
  }
}
