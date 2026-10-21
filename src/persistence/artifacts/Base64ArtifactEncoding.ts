import { ArtifactError } from "../../errors/ArtifactError.js";

export class Base64ArtifactEncoding {
  encode(bytes: Uint8Array): string {
    let value = "";
    for (const byte of bytes) value += String.fromCharCode(byte);
    return btoa(value);
  }

  decode(value: string): Uint8Array {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      throw new ArtifactError("ARTIFACT_CORRUPT", "Stored content is not valid base64.");
    }
    const decoded = atob(value);
    const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
    if (this.encode(bytes) !== value) throw new ArtifactError("ARTIFACT_CORRUPT", "Noncanonical stored content.");
    return bytes;
  }
}
