import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetBatchByIdInput = z.object({
  id: z.string().uuid().describe('UUID of the batch'),
});

const GetBatchByNumberInput = z.object({
  batchNumber: z.string().describe('Batch number string as printed on the product (e.g. LOT-2026-JW-042)'),
});

const CreateBatchInput = z.object({
  productBarcode: z.string().describe('Barcode of the product'),
  batchNumber: z.string().describe('Batch number string as defined by the manufacturer'),
});

export function registerBatchTools(server: McpServer, client: Client) {
  server.tool(
    'get_batch_by_id',
    'Get a batch by its UUID.',
    GetBatchByIdInput.shape,
    async ({ id }: z.infer<typeof GetBatchByIdInput>) => {
      const result = await client.batches.getById(id);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    'get_batch_by_number',
    'Find batches by batch number (as printed on the product). May return multiple results if different products share the same batch number string.',
    GetBatchByNumberInput.shape,
    async ({ batchNumber }: z.infer<typeof GetBatchByNumberInput>) => {
      const result = await client.batches.getByBatchNumber(batchNumber);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    'get_supply_chain',
    'Get the full supply chain for a batch by batch UUID. Returns all nodes (stops) with their location and party info, plus the edges connecting them.',
    GetBatchByIdInput.shape,
    async ({ id }: z.infer<typeof GetBatchByIdInput>) => {
      const result = await client.batches.getSupplyChain(id);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    'create_batch',
    'Create a new batch for a product.',
    CreateBatchInput.shape,
    async ({ productBarcode, batchNumber }: z.infer<typeof CreateBatchInput>) => {
      const result = await client.batches.create({ productBarcode, batchNumber });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
