import type { IAgentRunStoreFactory, AgentRunStores } from "../AgentContracts.js";
import { InMemoryAgentRunStore } from "./InMemoryAgentRunStore.js";
import { InMemoryAgentUsageStore } from "./InMemoryAgentUsageStore.js";
import { InMemoryAgentSessionJournal } from "./InMemoryAgentSessionJournal.js";

export class InMemoryAgentStoreFactory implements IAgentRunStoreFactory {
  async create(): Promise<AgentRunStores> {
    const journal = new InMemoryAgentSessionJournal();
    return {
      workflow: new InMemoryAgentRunStore(),
      usage: new InMemoryAgentUsageStore(),
      journal,
      readJournal: async () => journal.snapshot(),
    };
  }
}
