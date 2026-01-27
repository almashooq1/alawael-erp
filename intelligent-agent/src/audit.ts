// نظام تدقيق (Audit Trail)
import fs from 'fs';
import readline from 'readline';

export class Audit {
  static log(action: string, userId: string, details: any, requestId?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      requestId,
      details
    };
    fs.appendFileSync('audit.log', JSON.stringify(entry) + '\n');
  }

  // بحث وتصفية في سجل التدقيق
  static async search(filter: Partial<{ action: string; userId: string; requestId: string }>): Promise<any[]> {
    const results: any[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream('audit.log'),
      crlfDelay: Infinity
    });
    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);
        let match = true;
        for (const key of Object.keys(filter) as (keyof typeof filter)[]) {
          if (filter[key] && entry[key] !== filter[key]) match = false;
        }
        if (match) results.push(entry);
      } catch {}
    }
    return results;
  }
}
