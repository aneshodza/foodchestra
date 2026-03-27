import { makeHttpHelpers } from './client.js';
import { healthRoutes } from './routes/health.js';
import { productRoutes } from './routes/products.js';

export { makeHttpHelpers } from './client.js';
export * from './routes/health.js';
export * from './routes/products.js';
export * from './types/index.js';

export interface SdkConfig {
  baseUrl: string;
}

export function createClient(config: SdkConfig) {
  const { get, post } = makeHttpHelpers(config.baseUrl);

  return {
    health: healthRoutes(get),
    products: productRoutes(get),
    // New route groups are added here as: <concern>: <concern>Routes(get, post)
    _http: { get, post }, // escape hatch for one-off calls
  };
}

export const client = createClient({
  baseUrl:
    (typeof process !== 'undefined' && process.env['FOODCHESTRA_API_URL']) ||
    'http://localhost:3000',
});
