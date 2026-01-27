// Self-Learning Data Collector
// Logs user interactions and system outputs for continuous learning

import fs from 'fs';
import path from 'path';

export interface InteractionLog {
  timestamp: string;
  userId?: string;
  input: string;
  output: string;
  context?: string;
  feedback?: number; // optional user feedback (1-5)
}

const LOG_PATH = path.join(__dirname, '../../data/interaction-logs.jsonl');

export class InteractionLogger {
  static log(entry: InteractionLog) {
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  }
  static getAll(filter?: { userId?: string; from?: string; to?: string }): InteractionLog[] {
    if (!fs.existsSync(LOG_PATH)) return [];
    let logs = fs.readFileSync(LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
    if (filter) {
      if (filter.userId) logs = logs.filter(l => l.userId === filter.userId);
      if (filter.from !== undefined) logs = logs.filter(l => l.timestamp >= filter.from!);
      if (filter.to !== undefined) logs = logs.filter(l => l.timestamp <= filter.to!);
    }
    return logs;
  }
  static clearAll() {
    if (fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '', 'utf8');
  }
  static deleteByUser(userId: string) {
    if (!fs.existsSync(LOG_PATH)) return;
    const logs = InteractionLogger.getAll().filter(l => l.userId !== userId);
    fs.writeFileSync(LOG_PATH, logs.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');
  }
}
