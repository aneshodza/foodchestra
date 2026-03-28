import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetLocationsInput = z.object({
  partyId: z.string().describe('UUID of the party'),
});

export function registerPartyTools(server: McpServer, client: Client) {
  server.tool(
    'get_parties',
    'List all supply chain parties (farmers, processors, distributors, warehouses, retailers).',
    {},
    async () => {
      try {
        const result = await client.parties.getAll();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_party_locations',
    'Get all physical locations for a party. Each location has latitude/longitude for map rendering.',
    GetLocationsInput.shape,
    async ({ partyId }: z.infer<typeof GetLocationsInput>) => {
      try {
        const result = await client.parties.getLocations(partyId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
