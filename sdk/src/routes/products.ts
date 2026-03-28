import type { ProductLookupResponse, CoolingStatusResponse, EnrichmentResult } from '../types/products.js';

type GetFn = <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>;

export function productRoutes(get: GetFn) {
  return {
    getByBarcode: (barcode: string) =>
      get<ProductLookupResponse>(`/products/${encodeURIComponent(barcode)}`),
    getCoolingStatus: (barcode: string) =>
      get<CoolingStatusResponse>(`/products/${encodeURIComponent(barcode)}/cooling-status`),
    getEnrichment: (barcode: string) =>
      get<EnrichmentResult>(`/products/${encodeURIComponent(barcode)}/enrichment`, { cache: 'no-store' }),
  };
}
