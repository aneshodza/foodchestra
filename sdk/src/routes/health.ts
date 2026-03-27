export interface AliveResponse {
  status: string;
}

export function healthRoutes(get: <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>) {
  return {
    getAlive: () => get<AliveResponse>('/alive', { cache: 'no-store' }),
  };
}
