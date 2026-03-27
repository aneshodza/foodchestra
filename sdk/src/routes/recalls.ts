import type { RecallsResponse } from '../types/recalls.js';

type GetFn = <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>;

export function recallRoutes(get: GetFn) {
  return {
    getRecalls: (params?: { page?: number; pageSize?: number }) => {
      const query = new URLSearchParams();
      if (params?.page !== undefined) query.set('page', String(params.page));
      if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
      const qs = query.toString();
      return get<RecallsResponse>(`/recalls${qs ? `?${qs}` : ''}`);
    },
  };
}
