import type { Batch, CreateBatchInput, SupplyChain } from '../types/batches.js';

type GetFn = <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>;
type PostFn = <T>(path: string, body: unknown) => Promise<T>;

export function batchRoutes(get: GetFn, post: PostFn) {
  return {
    create: (input: CreateBatchInput) =>
      post<Batch>('/batches', input),
    getById: (id: string) =>
      get<Batch>(`/batches/${id}`),
    getByBatchNumber: (batchNumber: string) =>
      get<Batch[]>(`/batches/by-number/${encodeURIComponent(batchNumber)}`),
    getSupplyChain: (id: string) =>
      get<SupplyChain>(`/batches/${id}/supply-chain`),
  };
}
