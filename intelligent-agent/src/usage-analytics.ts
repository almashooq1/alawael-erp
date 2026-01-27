// وحدة تحليلات الاستخدام (Usage Analytics)
import fs from 'fs';

export class UsageAnalytics {
  static track(event: string, details: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details
    };
    fs.appendFileSync('usage.log', JSON.stringify(entry) + '\n');
  }
}
