import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetLocationsInput = z.object({
  partyId: z.string().uuid().describe('UUID of the party'),
});

export function registerPartyTools(server: McpServer, client: Client) {
  server.tool(
    'get_parties',
    'List all supply chain parties (farmers, processors, distributors, warehouses, retailers).',
    {},
    async () => {
      const result = await client.parties.getAll();
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    'get_party_locations',
    'Get all physical locations for a party. Each location has latitude/longitude for map rendering.',
    GetLocationsInput.shape,
    async ({ partyId }: z.infer<typeof GetLocationsInput>) => {
      const result = await client.parties.getLocations(partyId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
