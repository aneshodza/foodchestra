import path from "path";
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { HumanMessage } from "@langchain/core/messages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_PATH = path.resolve(__dirname, "../../mcp/dist/index.js");

const SYSTEM_PROMPT = `You are Foodchestra, an AI assistant that helps users understand their food.
You can look up product information, check safety recalls, analyse supply chains, and answer questions about food quality, ingredients, and sustainability.
Always be concise and helpful. When you don't have data for a specific product, say so clearly.`;

export class FoodAgent {
  private agent: ReturnType<typeof createReactAgent>;
  private mcpClient: MultiServerMCPClient;

  private constructor(
    agent: ReturnType<typeof createReactAgent>,
    mcpClient: MultiServerMCPClient,
  ) {
    this.agent = agent;
    this.mcpClient = mcpClient;
  }

  static async create(): Promise<FoodAgent> {
    const mcpClient = new MultiServerMCPClient({
      foodchestra: {
        transport: "stdio",
        command: "node",
        args: [MCP_PATH],
        env: {
          ...process.env,
          FOODCHESTRA_API_URL:
            process.env.FOODCHESTRA_API_URL ?? "http://localhost:3000",
        } as Record<string, string>,
      },
    });

    await mcpClient.initializeConnections();
    const tools = mcpClient.getTools();

    const model = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite",
      apiKey: process.env.GEMINI_API_KEY,
    });

    const agent = createReactAgent({
      llm: model,
      tools,
      stateModifier: SYSTEM_PROMPT,
    });

    return new FoodAgent(agent, mcpClient);
  }

  async invoke(message: string): Promise<string> {
    const result = await this.agent.invoke({
      messages: [new HumanMessage(message)],
    });

    const last = result.messages[result.messages.length - 1];
    return typeof last.content === "string"
      ? last.content
      : JSON.stringify(last.content);
  }

  async close(): Promise<void> {
    await this.mcpClient.close();
  }
}
