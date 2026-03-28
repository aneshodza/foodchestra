import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetProductInput = z.object({
  barcode: z.string().describe('Numeric barcode string (4–14 digits, EAN-8/13 or UPC-A)'),
});

export function registerProductTools(server: McpServer, client: Client) {
  server.tool(
    'get_product_by_barcode',
    'Look up a food product by its barcode. Returns nutri-score, ingredients, brands, and country of origin from OpenFoodFacts. Always call this before filing a report for a product.',
    GetProductInput.shape,
    async ({ barcode }: z.infer<typeof GetProductInput>) => {
      try {
        const result = await client.products.getByBarcode(barcode);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_product_cooling_status',
    'Check whether any cooling chain breach was detected across all known batches for a product.',
    GetProductInput.shape,
    async ({ barcode }: z.infer<typeof GetProductInput>) => {
      try {
        const result = await client.products.getCoolingStatus(barcode);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
