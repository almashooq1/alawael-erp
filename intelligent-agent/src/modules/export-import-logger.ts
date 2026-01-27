// سجل عمليات التصدير/الاستيراد
// يتم تسجيل كل عملية مع الوقت، المستخدم (إن وجد)، نوع العملية، التفاصيل
import fs from 'fs';
import path from 'path';

export interface ExportImportLog {
  timestamp: string;
  userId?: string;
  operation: 'export' | 'import';
  format: string; // csv, zip, json, ...
  details?: any;
}

const LOG_PATH = path.join(__dirname, '../../data/export-import-log.jsonl');

export class ExportImportLogger {
  static log(entry: ExportImportLog) {
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  }
  static getAll() {
    if (!fs.existsSync(LOG_PATH)) return [];
    return fs.readFileSync(LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }
  static clearAll() {
    if (fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '', 'utf8');
  }
}
