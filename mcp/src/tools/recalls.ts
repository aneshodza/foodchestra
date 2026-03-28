import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type createClient } from '@foodchestra/sdk';

type Client = ReturnType<typeof createClient>;

const GetRecallsInput = z.object({
  page: z.number().int().min(1).optional().describe('Page number (1-indexed, default 1)'),
  pageSize: z.number().int().min(1).max(100).optional().describe('Results per page (default 20, max 100)'),
});

const GetProductRecallsInput = z.object({
  barcode: z.string().describe('Product barcode (EAN-8, EAN-13, UPC-A — numeric digits only)'),
});

export function registerRecallTools(server: McpServer, client: Client) {
  server.tool(
    'get_recalls',
    'List Swiss government recalls from RecallSwiss. Returns product recall notices with names and descriptions in DE/FR/IT. Data is refreshed every hour.',
    GetRecallsInput.shape,
    async ({ page, pageSize }: z.infer<typeof GetRecallsInput>) => {
      try {
        const result = await client.recalls.getRecalls({ page, pageSize });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_product_recalls',
    `Fetch Swiss government recalls (RecallSwiss) matched to a specific product barcode.

HOW MATCHING WORKS
- The backend pulls the product name + brand from its OpenFoodFacts cache (populated when the product was last scanned)
- It runs PostgreSQL full-text search with the 'simple' dictionary (language-agnostic: lowercases, strips stopwords, no stemming) across all 6 text columns: header and description in German, French, and Italian
- Matches on individual words — "Lachs Filet" will match recalls mentioning just "Lachs", and "Poulet" will match "poulet rôti"

WHEN TO USE
- Always call this tool first when a user asks about product safety, recalls, or whether something is safe to eat
- If this returns an empty array, the product may not yet be in the cache — call get_product_by_barcode first to populate the cache, then retry
- For broader recall browsing not tied to a specific product, use get_recalls with pagination instead

HOW TO INTERPRET RESULTS
- A non-empty result is a HIGH-SEVERITY safety signal: a Swiss government body has issued an official recall
- headerDe / headerFr / headerIt: Short recall title, typically "[Brand] recalls [Product] due to [Reason]" — prefer the language that matches the product name
- descriptionDe / descriptionFr / descriptionIt: Full recall details — which batch numbers or best-before dates are affected, the specific hazard (e.g. Noroviren = norovirus, Listerien = listeria, Salmonellen = salmonella, Fremdkörper = foreign object, falsch deklariert = mislabeled), and what consumers should do (usually: do not consume, return to store)
- metaDe: Date and city of the recall notice (format: "Bern, DD.MM.YYYY") — important for gauging how recent the recall is
- authorityCodeDe / authorityNameDe: Issuing authority — most commonly "BLV" = "Bundesamt für Lebensmittelsicherheit und Veterinärwesen" (Swiss Federal Food Safety and Veterinary Office); sometimes a cantonal food inspection office
- imageUrlDe: Photo of the recalled product packaging — share this with the user so they can visually identify if their product matches

PRESENTING TO THE USER
- Always present recalls with urgency — do not minimise or hedge; these are official government safety notices
- Include the recall date (metaDe), the specific hazard (from the description), and the authority name
- If batch numbers are mentioned in the description, tell the user to check their product's batch number
- If multiple recalls match, list them all — each is a separate safety event
- Recommend the user not consume the product until they confirm their specific batch is unaffected
- If the imageUrlDe is present, tell the user to compare it with what they have in hand

LIMITATIONS
- Keyword-based, not semantic: "Thon" (French for tuna) may not match a product cached as "Tuna" unless French text appears in the recall entry. For borderline multilingual cases, also call get_recalls and manually reason about the last 1-2 pages of entries.
- Only matches products already in the cache — if the barcode was never looked up before, this returns empty. Always call get_product_by_barcode first.
- Returns up to 5 matches. If you suspect more exist (e.g. a brand with a known recall history), use get_recalls to browse recent entries manually.`,
    GetProductRecallsInput.shape,
    async ({ barcode }: z.infer<typeof GetProductRecallsInput>) => {
      try {
        const result = await client.recalls.getProductRecalls(barcode);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
