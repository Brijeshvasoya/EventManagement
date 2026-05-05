import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { projectAgent } from './agents/project-agent.mjs';

export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: 'event-hub-storage',
    url: 'file:mastra.db',
  }),
  agents: { projectAgent },
});
