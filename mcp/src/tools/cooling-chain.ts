import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetCoolingChainInput = z.object({
  batchNumber: z.string().describe('Batch number as printed on the product (e.g. LOT-2026-JW-042)'),
  barcode: z.string().optional().describe('Optional product barcode to disambiguate when multiple products share the same batch number'),
});

export function registerCoolingChainTools(server: McpServer, client: Client) {
  server.tool(
    'get_cooling_chain',
    'Get all temperature readings for each transport edge in a batch\'s supply chain, grouped by edge. Use this to detect cold chain breaks or temperature anomalies during transit.',
    GetCoolingChainInput.shape,
    async ({ batchNumber, barcode }: z.infer<typeof GetCoolingChainInput>) => {
      try {
        const result = await client.coolingChain.getCoolingChain(batchNumber, barcode);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
