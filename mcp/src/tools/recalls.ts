import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetRecallsInput = z.object({
  page: z.number().int().min(1).optional().describe('Page number (1-indexed, default 1)'),
  pageSize: z.number().int().min(1).max(100).optional().describe('Results per page (default 20, max 100)'),
});

export function registerRecallTools(server: McpServer, client: Client) {
  server.tool(
    'get_recalls',
    'List Swiss government recalls from RecallSwiss. Returns product recall notices with names and descriptions in DE/FR/IT. Data is refreshed every hour.',
    GetRecallsInput.shape,
    async ({ page, pageSize }: z.infer<typeof GetRecallsInput>) => {
      const result = await client.recalls.getRecalls({ page, pageSize });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
