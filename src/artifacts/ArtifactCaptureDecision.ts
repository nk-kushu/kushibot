export type ArtifactCaptureDecision = Readonly<{ allowed: true }> | Readonly<{ allowed: false; reason: string }>;
