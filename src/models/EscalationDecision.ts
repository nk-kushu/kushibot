export type EscalationDecision = Readonly<{ action: "stay" | "request-handoff" | "stop"; reasonCode: string }>;
