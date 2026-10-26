import type { IAgentRunStoreFactory } from "../IAgentRunStoreFactory.js";
import type { IAgentRunStores } from "../IAgentRunStores.js";
import { InMemoryAgentRunStore } from "./InMemoryAgentRunStore.js";
import { InMemoryAgentUsageStore } from "./InMemoryAgentUsageStore.js";
import { InMemoryAgentSessionJournal } from "./InMemoryAgentSessionJournal.js";

export class InMemoryAgentStoreFactory implements IAgentRunStoreFactory {
  async create(): Promise<IAgentRunStores> {
    const journal = new InMemoryAgentSessionJournal();
    return {
      workflow: new InMemoryAgentRunStore(),
      usage: new InMemoryAgentUsageStore(),
      journal,
      readJournal: async () => journal.snapshot(),
    };
  }
}
