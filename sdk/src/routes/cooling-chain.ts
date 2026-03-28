import type { CoolingChainEdgeData } from '../types/cooling-chain.js';

type GetFn = <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>;

export function coolingChainRoutes(get: GetFn) {
  return {
    getCoolingChain: (batchNumber: string, barcode?: string) => {
      const query = barcode ? `?barcode=${encodeURIComponent(barcode)}` : '';
      return get<CoolingChainEdgeData[]>(
        `/batches/by-number/${encodeURIComponent(batchNumber)}/supply-chain/cooling${query}`,
      );
    },
  };
}
