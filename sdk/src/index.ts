import { makeHttpHelpers } from './client';
import { healthRoutes } from './routes/health';

export { makeHttpHelpers } from './client';
export * from './routes/health';

export interface SdkConfig {
  baseUrl: string;
}

export function createClient(config: SdkConfig) {
  const { get, post } = makeHttpHelpers(config.baseUrl);

  return {
    health: healthRoutes(get),
    // New route groups are added here as: <concern>: <concern>Routes(get, post)
    _http: { get, post }, // escape hatch for one-off calls
  };
}

export const client = createClient({
  baseUrl:
    (typeof process !== 'undefined' && process.env['FOODCHESTRA_API_URL']) ||
    'http://localhost:3000',
});
