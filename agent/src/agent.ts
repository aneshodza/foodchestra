import path from "path";
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { HumanMessage } from "@langchain/core/messages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_PATH = path.resolve(__dirname, "../../mcp/dist/index.js");

const SYSTEM_PROMPT = `You are Foodchestra, a friendly and proactive AI assistant that helps people understand their food.

## Tools
You have real, callable tools available — use them directly and immediately. Never write code, pseudocode, or describe how you would call a tool. When you need data, just call the tool right away.

Use your tools proactively: if a user asks about a product or supply chain, call the relevant tools without asking for permission first. Surface relevant safety, recall, or supply-chain insights without waiting to be asked.

**Critical rule:** Never tell the user you have completed an action (filed a report, logged a scan, created anything) unless you actually called the tool and received a successful response. If you have all the required parameters, call the tool immediately — do not narrate what you are about to do, just do it.

## Context
Each message may include a [Context: ...] block with information about the current page (barcode, batch number, product name, etc.). Use that information directly — never ask the user to repeat something that is already in the context.

## Communication style
- Always respond in Markdown (headings, bullet points, bold text).
- Be warm, clear, and encouraging. When you find interesting information, share it enthusiastically.
- Keep responses human-friendly: never show raw IDs, UUIDs, or internal codes unless the user explicitly asks for technical details. Translate data into plain language (e.g. "shipped from a farm in Ghana", not "node_id: a3f2…"). Show numbers only when they genuinely help (e.g. temperature, nutri-score).
- When you need the user to pick from a fixed set of options (e.g. a report category), list every available option in plain language — never just ask for "the category".
- When data isn't available, say so honestly and suggest what the user could try instead.`;

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
    console.log(`[FoodAgent] MCP tools loaded: ${tools.length} —`, tools.map((t) => t.name));

    const model = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      apiKey: process.env.GEMINI_API_KEY,
    });

    const agent = createReactAgent({
      llm: model,
      tools,
      stateModifier: SYSTEM_PROMPT,
    });

    return new FoodAgent(agent, mcpClient);
  }

  async invoke(message: string, context?: string, history?: string[]): Promise<{ response: string; toolSteps: string[] }> {
    const parts: string[] = [];
    if (history && history.length > 0) {
      parts.push(`[Conversation history:\n${history.join('\n')}]`);
    }
    if (context) {
      parts.push(`[Context: ${context}]`);
    }
    parts.push(`USER: ${message}`);
    const humanText = parts.join('\n\n');
    const result = await this.agent.invoke({
      messages: [new HumanMessage(humanText)],
    });

    const toolSteps: string[] = [];
    console.log(`[FoodAgent] Message trace (${result.messages.length} messages):`);
    for (const msg of result.messages) {
      const type = msg.getType();
      const calls = (msg as { tool_calls?: { name: string; args: unknown }[] }).tool_calls;
      if (calls && calls.length > 0) {
        for (const call of calls) {
          console.log(`  [${type}] tool_call → ${call.name}`, JSON.stringify(call.args));
          toolSteps.push(call.name);
        }
      } else {
        const preview = typeof msg.content === "string"
          ? msg.content.slice(0, 120).replace(/\n/g, " ")
          : JSON.stringify(msg.content).slice(0, 120);
        console.log(`  [${type}] ${preview}`);
      }
    }

    const last = result.messages[result.messages.length - 1];
    const response =
      typeof last.content === "string"
        ? last.content
        : JSON.stringify(last.content);

    return { response, toolSteps };
  }

  async close(): Promise<void> {
    await this.mcpClient.close();
  }
}
