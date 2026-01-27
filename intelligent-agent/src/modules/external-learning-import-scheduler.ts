// External Learning Data Import Scheduler
import schedule from 'node-schedule';
import axios from 'axios';
import { InteractionLogger } from './interaction-logger';

export function scheduleExternalLearningImport(url: string, token?: string, cron = '0 8 * * 0') {
  schedule.scheduleJob(cron, async () => {
    try {
      const response = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      let arr = response.data;
      if (!Array.isArray(arr)) arr = [arr];
      for (const row of arr) {
        InteractionLogger.log({
          timestamp: new Date().toISOString(),
          input: JSON.stringify(row),
          output: '',
        });
      }
      console.log(`[ExternalLearning] Imported ${arr.length} records from external API.`);
    } catch (e: any) {
      console.error('[ExternalLearning] Import failed:', e.message);
    }
  });
}
