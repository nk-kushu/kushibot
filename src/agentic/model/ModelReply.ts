import type { ModelUsage } from "./ModelUsage.js";
export type ModelReply = Readonly<{
  status: "completed" | "incomplete" | "refused" | "unavailable";
  text: string; responseId: string | null; usage: ModelUsage | null;
  providerId: string; modelId: string; errorCode: string | null;
}>;
