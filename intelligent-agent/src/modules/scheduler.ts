// وحدة جدولة المهام (Scheduler)
import cron from 'node-cron';
// وحدة جدولة المهام (Scheduler)
export class Scheduler {
  schedule(delayMs: number, task: () => void) {
    setTimeout(task, delayMs);
  }

  repeat(intervalMs: number, task: () => void) {
    setInterval(task, intervalMs);
  }

  scheduleCron(cronExpr: string, task: () => void) {
    cron.schedule(cronExpr, task);
  }
}
