import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@foodchestra/sdk';
import { healthToolDefinitions, healthToolHandlers } from './tools/health.js';

const apiUrl = process.env['FOODCHESTRA_API_URL'] ?? 'http://localhost:3000';
const client = createClient({ baseUrl: apiUrl });

const server = new McpServer({
  name: 'foodchestra',
  version: '1.0.0',
});

// Register all tool groups
const handlers = {
  ...healthToolHandlers(client),
  // Add new tool groups here as SDK routes grow
};

for (const tool of healthToolDefinitions) {
  server.tool(tool.name, tool.description, tool.inputSchema.properties, handlers[tool.name as keyof typeof handlers]);
}

const transport = new StdioServerTransport();
await server.connect(transport);
