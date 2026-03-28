import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const BarcodeInput = z.object({
  barcode: z.string().describe('Numeric product barcode (EAN-8, EAN-13, or UPC-A)'),
});

const CreateReportInput = z.object({
  barcode: z.string().describe('Numeric product barcode (EAN-8, EAN-13, or UPC-A)'),
  category: z
    .enum(['damaged_packaging', 'quality_issue', 'foreign_object', 'mislabeled', 'other'])
    .describe('Category of the issue being reported'),
  description: z.string().optional().describe('Optional short description of the issue'),
});

export function registerReportTools(server: McpServer, client: Client) {
  server.tool(
    'get_product_reports',
    'Get user-submitted reports for a product by barcode. Returns a 30-day count, a 24-hour count, a warning flag (true when more than 4 reports in 24 hours), and the individual report entries.',
    BarcodeInput.shape,
    async ({ barcode }: z.infer<typeof BarcodeInput>) => {
      const result = await client.reports.getReports(barcode);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    'create_product_report',
    'File an anonymous user report for a product. The product must have been looked up at least once (i.e. exist in the local cache). Use this to flag issues like damaged packaging, foreign objects, or quality problems.',
    CreateReportInput.shape,
    async ({ barcode, category, description }: z.infer<typeof CreateReportInput>) => {
      const result = await client.reports.createReport(barcode, { category, description });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
