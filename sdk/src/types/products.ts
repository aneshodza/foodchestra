export interface Ingredient {
  id: string;
  text: string;
  percent_estimate?: number;
}

export interface Product {
  barcode: string;
  name: string | null;
  brands: string | null;
  stores: string | null;
  countries: string | null;
  quantity: string | null;
  nutriscoreGrade: string | null;
  ingredientsText: string | null;
  ingredients: Ingredient[];
  imageUrl: string | null;
}

export interface ProductLookupResponse {
  found: boolean;
  product: Product | null;
}

export interface CoolingStatusResponse {
  potentialBreach: boolean;
}

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
