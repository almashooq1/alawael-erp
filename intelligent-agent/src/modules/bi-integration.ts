// وحدة تكامل ذكاء الأعمال (BI Integration)
import fs from 'fs';

export class BIIntegration {
  // Export audit log as CSV for BI tools
  static exportAuditCSV(): string {
    if (!fs.existsSync('audit.log')) return '';
    const lines = fs.readFileSync('audit.log', 'utf8').split('\n').filter(Boolean);
    const rows = lines.map(line => {
      try {
        const entry = JSON.parse(line);
        return [entry.timestamp, entry.action, entry.userId, entry.requestId, JSON.stringify(entry.details || {})].join(',');
      } catch {
        return '';
      }
    });
    return ['timestamp,action,userId,requestId,details', ...rows].filter(Boolean).join('\n');
  }
}
