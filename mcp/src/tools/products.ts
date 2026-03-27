import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetProductInput = z.object({
  barcode: z.string().describe('Numeric barcode string (4–14 digits, EAN-8/13 or UPC-A)'),
});

export function registerProductTools(server: McpServer, client: Client) {
  server.tool(
    'get_product_by_barcode',
    'Look up a food product by its barcode. Returns nutri-score, ingredients, brands, and country of origin from OpenFoodFacts.',
    GetProductInput.shape,
    async ({ barcode }: z.infer<typeof GetProductInput>) => {
      const result = await client.products.getByBarcode(barcode);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
