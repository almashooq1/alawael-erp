// عقد: سجل نشاطات ذكي
// يسجل كل عملية على العقد (إنشاء، تعديل، حذف، رفع ملف، تغيير حالة، تجديد)
// ويتيح الاستعلام حسب العقد

import fs from 'fs';
import path from 'path';

export interface ContractActivityLog {
  contractId: string;
  timestamp: string;
  userId?: string;
  action: string; // create, update, delete, upload, status, renew
  details?: any;
}

const LOG_PATH = path.join(__dirname, '../../data/contract-activity-logs.jsonl');

export class ContractActivityLogger {
  static log(entry: ContractActivityLog) {
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  }
  static getByContract(contractId: string) {
    if (!fs.existsSync(LOG_PATH)) return [];
    return fs.readFileSync(LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .filter((l: ContractActivityLog) => l.contractId === contractId);
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
