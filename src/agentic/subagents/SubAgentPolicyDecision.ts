export type SubAgentPolicyDecision = Readonly<{ allowed: true }> | Readonly<{ allowed: false; code: string }>;
