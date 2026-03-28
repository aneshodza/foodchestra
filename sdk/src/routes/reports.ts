import type { Report, ReportsResponse, CreateReportInput } from '../types/reports.js';

type GetFn = <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>;
type PostFn = <T>(path: string, body: unknown) => Promise<T>;

export function reportRoutes(get: GetFn, post: PostFn) {
  return {
    getReports: (barcode: string) =>
      get<ReportsResponse>(`/products/${encodeURIComponent(barcode)}/reports`),
    createReport: (barcode: string, input: CreateReportInput) =>
      post<Report>(`/products/${encodeURIComponent(barcode)}/reports`, input),
  };
}
