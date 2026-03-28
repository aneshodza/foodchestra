import { makeHttpHelpers } from './client.js';
import { healthRoutes } from './routes/health.js';
import { productRoutes } from './routes/products.js';
import { recallRoutes } from './routes/recalls.js';
import { scanRoutes } from './routes/scans.js';
import { partyRoutes } from './routes/parties.js';
import { batchRoutes } from './routes/batches.js';
import { reportRoutes } from './routes/reports.js';
import { coolingChainRoutes } from './routes/cooling-chain.js';
import { chatRoutes } from './routes/chat.js';

export { makeHttpHelpers } from './client.js';
export * from './routes/health.js';
export * from './routes/products.js';
export * from './routes/recalls.js';
export * from './routes/scans.js';
export * from './routes/parties.js';
export * from './routes/batches.js';
export * from './routes/reports.js';
export * from './routes/cooling-chain.js';
export * from './routes/chat.js';
export * from './types/index.js';
export * from './external/recallswiss.js';

export interface SdkConfig {
  baseUrl: string;
}

export function createClient(config: SdkConfig) {
  const { get, post } = makeHttpHelpers(config.baseUrl);

  return {
    health: healthRoutes(get),
    products: productRoutes(get),
    recalls: recallRoutes(get),
    scans: scanRoutes(post),
    parties: partyRoutes(get),
    batches: batchRoutes(get, post),
    reports: reportRoutes(get, post),
    coolingChain: coolingChainRoutes(get),
    chat: chatRoutes(post),
    _http: { get, post }, // escape hatch for one-off calls
  };
}

export const client = createClient({
  baseUrl:
    (typeof process !== 'undefined' && process.env['FOODCHESTRA_API_URL']) ||
    'http://localhost:3000',
});
