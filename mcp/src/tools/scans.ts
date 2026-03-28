import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const LogScanInput = z.object({
  scanResult: z.string().describe('Decoded text from the QR code or barcode'),
  scanType: z.enum(['qr', 'barcode', 'ocr', 'manual']).describe('How the scan was captured. Allowed values: "qr", "barcode", "ocr", "manual"'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Optional additional data about the scan'),
});

export function registerScanTools(server: McpServer, client: Client) {
  server.tool(
    'log_scan',
    'Anonymously log a product scan (QR, barcode, OCR, or manual entry) to the backend for tracking.',
    LogScanInput.shape,
    async ({ scanResult, scanType, metadata }: z.infer<typeof LogScanInput>) => {
      try {
        const result = await client.scans.logScan({ scanResult, scanType, metadata });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
