import type { ModelProfile } from "./ModelProfile.js";
import type { ModelCapability } from "./ModelCapability.js";
export type ModelProfileRegistration = Readonly<{ profile: ModelProfile; capabilities: readonly ModelCapability[] }>;
