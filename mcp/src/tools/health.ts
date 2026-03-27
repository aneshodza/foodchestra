import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

export const healthToolDefinitions = [
  {
    name: 'get_alive',
    description: 'Check whether the Foodchestra backend is alive and reachable.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

export function healthToolHandlers(client: Client) {
  return {
    get_alive: async () => {
      const result = await client.health.getAlive();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  };
}
