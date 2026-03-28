import express from "express";
import cors from "cors";
import type { FoodAgent } from "./agent.js";

export function createApp(agent: FoodAgent) {
  const app = express();
  app.use(express.json());
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:5173"],
    }),
  );

  app.get("/alive", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/chat", async (req, res) => {
    const { message, context, history } = req.body as { message?: string; context?: string; history?: string[] };
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    try {
      const { response, toolSteps } = await agent.invoke(message, context, history);
      res.json({ response, toolSteps });
    } catch (err) {
      console.error("Agent error:", err);
      res.status(500).json({ error: "Agent failed to respond" });
    }
  });

  return app;
}
