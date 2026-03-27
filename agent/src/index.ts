import "dotenv/config";
import { FoodAgent } from "./agent.js";
import { createApp } from "./server.js";

const PORT = process.env.PORT ?? "3001";

const agent = await FoodAgent.create();
const app = createApp(agent);

app.listen(Number(PORT), () => {
  console.log(`Foodchestra agent server running on port ${PORT}`);
});

process.on("SIGTERM", () => agent.close());
process.on("SIGINT", () => agent.close());
