import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

export function registerHealthTools(server: McpServer, client: Client) {
  server.tool(
    'get_alive',
    'Check whether the Foodchestra backend is alive and reachable.',
    {},
    async () => {
      try {
        const result = await client.health.getAlive();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
