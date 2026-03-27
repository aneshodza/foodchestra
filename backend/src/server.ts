import app from './app';
import { runMigrations } from './migrate';
import { startRecallsCron } from './cron/recalls.cron';
import { fetchAndStoreRecalls } from './services/recalls.service';

const PORT = process.env.PORT ?? 3000;

async function start(): Promise<void> {
  await runMigrations();

  startRecallsCron();
  console.log('[startup] Recall sync starting…');
  fetchAndStoreRecalls()
    .then(({ stored }) => console.log(`[startup] Recall sync done: ${stored} entries stored.`))
    .catch((err) => console.error('[startup] Recall sync failed:', err));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs → http://localhost:${PORT}/docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
