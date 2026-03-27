import cron from 'node-cron';
import { fetchAndStoreRecalls } from '../services/recalls.service';

export function startRecallsCron(): void {
  cron.schedule('0 * * * *', async () => {
    console.log('[recalls-cron] Starting hourly recall sync…');
    try {
      const { stored } = await fetchAndStoreRecalls();
      console.log(`[recalls-cron] Synced ${stored} recalls.`);
    } catch (err) {
      console.error('[recalls-cron] Sync failed:', err);
    }
  });
}
