import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetBatchByIdInput = z.object({
  id: z.string().describe('UUID of the batch'),
});

const GetBatchByNumberInput = z.object({
  batchNumber: z.string().describe('Batch number string as printed on the product (e.g. LOT-2026-JW-042)'),
  barcode: z.string().optional().describe('Optional product barcode to narrow results to a single product'),
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
      try {
        const result = await client.batches.getById(id);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_batch_by_number',
    'Find batches by batch number (as printed on the product). Returns the batch including its UUID id field. Pass that id directly to get_supply_chain — do not try to create a new batch if one already exists.',
    GetBatchByNumberInput.shape,
    async ({ batchNumber, barcode }: z.infer<typeof GetBatchByNumberInput>) => {
      try {
        const result = await client.batches.getByBatchNumber(batchNumber, barcode);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_supply_chain',
    'Get the full supply chain for a batch by batch UUID (the id field from get_batch_by_number). Returns all nodes (stops) with their location and party info, plus the edges connecting them. An empty nodes array means no supply chain data exists for this batch.',
    GetBatchByIdInput.shape,
    async ({ id }: z.infer<typeof GetBatchByIdInput>) => {
      try {
        const result = await client.batches.getSupplyChain(id);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'create_batch',
    'Create a new batch for a product.',
    CreateBatchInput.shape,
    async ({ productBarcode, batchNumber }: z.infer<typeof CreateBatchInput>) => {
      try {
        const result = await client.batches.create({ productBarcode, batchNumber });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
