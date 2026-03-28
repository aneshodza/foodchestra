import { lookupProduct } from './products.service';
import { getAllRecalls, type RecallRow } from '../repositories/recalls.repository';

const AGENT_URL = process.env['AGENT_URL'] ?? 'http://localhost:3001';

export type SafetyLevel = 'safe' | 'caution' | 'danger';

export interface EnrichedRecall {
  id: number;
  headerDe: string | null;
  headerFr: string | null;
  headerIt: string | null;
  descriptionDe: string | null;
  metaDe: string | null;
  imageUrlDe: string | null;
  authorityNameDe: string | null;
}

export interface EnrichmentResult {
  safetyLevel: SafetyLevel;
  safetyReason: string;
  matchedRecalls: EnrichedRecall[];
  allergenWarnings: string[];
  sustainabilityNote: string;
  qualityNote: string;
}

interface AgentEnrichmentResponse {
  safetyLevel: SafetyLevel;
  safetyReason: string;
  matchedRecallIds: number[];
  allergenWarnings: string[];
  sustainabilityNote: string;
  qualityNote: string;
}

function buildPrompt(product: object, recalls: RecallRow[]): string {
  const recallSummaries = recalls.map((r) => ({
    id: r.id,
    de: r.header_de,
    fr: r.header_fr,
    it: r.header_it,
    date: r.meta_de,
  }));

  return `You are a food safety AI. Analyze this product and return a structured enrichment.

PRODUCT:
${JSON.stringify(product, null, 2)}

GOVERNMENT RECALLS (most recent ${recalls.length}, all languages):
${JSON.stringify(recallSummaries, null, 2)}

Instructions:
- Match recalls to the product by comparing product name and brand against recall headers in any language (DE/FR/IT). Be liberal: "Ruchbrot" matches "Ruchbrot", "Pain bis", "Pane di segale"; "Austern" matches "huîtres" / "ostriche". Even a partial word match on the product name or brand is sufficient.
- Assess safetyLevel: "danger" if there are matched recalls or cooling breach risk; "caution" if nutriscore D/E or notable allergens; "safe" otherwise.
- Extract notable allergens from the ingredients text (gluten, lactose, nuts, soy, eggs, fish, shellfish, sesame, etc.).
- Write a one-sentence sustainability note based on product origin, type, and packaging.
- Write a one-sentence quality note referencing the nutriscore grade and main ingredients.

Respond with ONLY a raw JSON object — no markdown, no code fences, no explanation:
{
  "safetyLevel": "safe" | "caution" | "danger",
  "safetyReason": "string",
  "matchedRecallIds": [array of integer recall IDs that match this product],
  "allergenWarnings": ["string"],
  "sustainabilityNote": "string",
  "qualityNote": "string"
}`;
}

function extractJson(text: string): AgentEnrichmentResponse | null {
  // Strip markdown code fences if present
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(stripped.slice(start, end + 1)) as AgentEnrichmentResponse;
  } catch {
    return null;
  }
}

function toEnrichedRecall(row: RecallRow): EnrichedRecall {
  return {
    id: row.id,
    headerDe: row.header_de,
    headerFr: row.header_fr,
    headerIt: row.header_it,
    descriptionDe: row.description_de,
    metaDe: row.meta_de,
    imageUrlDe: row.image_url_de,
    authorityNameDe: row.authority_name_de,
  };
}

export async function enrichProduct(barcode: string): Promise<EnrichmentResult | null> {
  const [productResult, recalls] = await Promise.all([
    lookupProduct(barcode),
    getAllRecalls(),
  ]);

  if ('error' in productResult || !productResult.found || !productResult.product) {
    return null;
  }

  const prompt = buildPrompt(productResult.product, recalls);

  let agentResponse: AgentEnrichmentResponse | null = null;

  try {
    const res = await fetch(`${AGENT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
    });

    if (res.ok) {
      const data = (await res.json()) as { response: string };
      agentResponse = extractJson(data.response);
    } else {
      console.error(`[enrichment] Agent responded with ${res.status}`);
    }
  } catch (err) {
    console.error('[enrichment] Failed to reach agent:', err);
  }

  if (!agentResponse) {
    // Graceful fallback — return minimal result without AI data
    return {
      safetyLevel: 'safe',
      safetyReason: 'AI enrichment unavailable.',
      matchedRecalls: [],
      allergenWarnings: [],
      sustainabilityNote: '',
      qualityNote: '',
    };
  }

  const recallsById = new Map(recalls.map((r) => [r.id, r]));
  const matchedRecalls = (agentResponse.matchedRecallIds ?? [])
    .map((id) => recallsById.get(id))
    .filter((r): r is RecallRow => r !== undefined)
    .map(toEnrichedRecall);

  return {
    safetyLevel: agentResponse.safetyLevel ?? 'safe',
    safetyReason: agentResponse.safetyReason ?? '',
    matchedRecalls,
    allergenWarnings: agentResponse.allergenWarnings ?? [],
    sustainabilityNote: agentResponse.sustainabilityNote ?? '',
    qualityNote: agentResponse.qualityNote ?? '',
  };
}
