import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const BarcodeInput = z.object({
  barcode: z.string().describe('Numeric product barcode (EAN-8, EAN-13, or UPC-A)'),
});

const VALID_CATEGORIES = ['damaged_packaging', 'quality_issue', 'foreign_object', 'mislabeled', 'other'] as const;
type ReportCategory = typeof VALID_CATEGORIES[number];

const CreateReportInput = z.object({
  barcode: z.string().describe('Numeric product barcode (EAN-8, EAN-13, or UPC-A)'),
  category: z.string().describe(
    'The exact API value for the category — do not use the human-friendly label. Mapping: ' +
    '"damaged_packaging" = Damaged packaging, ' +
    '"quality_issue" = Quality problems, ' +
    '"foreign_object" = Foreign objects, ' +
    '"mislabeled" = Wrong or misleading label, ' +
    '"other" = Anything else.',
  ),
  description: z.string().optional().describe('Optional short description of the issue'),
});

export function registerReportTools(server: McpServer, client: Client) {
  server.tool(
    'get_product_reports',
    'Get user-submitted reports for a product by barcode. Returns a 30-day count, a 24-hour count, a warning flag (true when more than 4 reports in 24 hours), and the individual report entries.',
    BarcodeInput.shape,
    async ({ barcode }: z.infer<typeof BarcodeInput>) => {
      try {
        const result = await client.reports.getReports(barcode);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'create_product_report',
    'File an anonymous user report for a product. Automatically ensures the product is cached before filing. Use this to flag issues like damaged packaging, foreign objects, or quality problems.',
    CreateReportInput.shape,
    async ({ barcode, category, description }: z.infer<typeof CreateReportInput>) => {
      if (!VALID_CATEGORIES.includes(category as ReportCategory)) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: "${category}" is not a valid category. Valid values are: ${VALID_CATEGORIES.join(', ')}. Mapping: "damaged_packaging" = Damaged packaging, "quality_issue" = Quality problems, "foreign_object" = Foreign objects, "mislabeled" = Wrong or misleading label, "other" = Anything else.`,
          }],
          isError: true,
        };
      }

      try {
        // Ensure the product is cached in the local DB before filing a report — the
        // reports endpoint requires the product to exist in the products table.
        await client.products.getByBarcode(barcode);

        const result = await client.reports.createReport(barcode, { category: category as ReportCategory, description });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
