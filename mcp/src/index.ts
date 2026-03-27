import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@foodchestra/sdk';
import { registerHealthTools } from './tools/health.js';
import { registerProductTools } from './tools/products.js';
import { registerRecallTools } from './tools/recalls.js';
import { registerScanTools } from './tools/scans.js';

const apiUrl = process.env['FOODCHESTRA_API_URL'] ?? 'http://localhost:3000';
const client = createClient({ baseUrl: apiUrl });

const server = new McpServer({
  name: 'foodchestra',
  version: '1.0.0',
});

registerHealthTools(server, client);
registerProductTools(server, client);
registerRecallTools(server, client);
registerScanTools(server, client);
// Add new tool groups here as SDK routes grow

const transport = new StdioServerTransport();
await server.connect(transport);
