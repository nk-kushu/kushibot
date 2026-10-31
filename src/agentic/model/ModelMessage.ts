/**
 * Provider transport roles, not authorship: `user` carries both task input and
 * runtime observations (including tool results). In debug displays, label these
 * origins as `task`, `tool` or `runtime`; label assistant actions as `model`.
 */
export type ModelMessage = Readonly<{ role: "user" | "assistant"; text: string }>;
