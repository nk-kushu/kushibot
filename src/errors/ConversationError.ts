export type ConversationErrorCode =
  "INVALID_INPUT" | "NOT_FOUND" | "IDENTITY_CONFLICT" | "CORRUPT_RECORD";

export class ConversationError extends Error {
  constructor(
    readonly code: ConversationErrorCode,
    message = "Conversation operation rejected.",
  ) {
    super(message);
    this.name = "ConversationError";
  }
}
