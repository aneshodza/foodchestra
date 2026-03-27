import type { Scan, CreateScanInput } from '../types/scans.js';

type PostFn = <T>(path: string, body: unknown) => Promise<T>;

export function scanRoutes(post: PostFn) {
  return {
    logScan: (input: CreateScanInput) =>
      post<Scan>('/scans', input),
  };
}
