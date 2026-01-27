// Security Reports Module
import { SecurityEvent } from './cyber-monitor';

export class SecurityReports {
  constructor(private getEvents: (filter?: any) => SecurityEvent[]) {}

  generateSummaryReport(period: 'daily' | 'weekly' | 'monthly'): { period: string; total: number; critical: number; suspicious: number; topTypes: string[] } {
    // Mock: استخدم فلترة حسب الفترة الزمنية الحقيقية لاحقاً
    const events = this.getEvents();
    const total = events.length;
    const critical = events.filter(e => e.severity === 'critical').length;
    const suspicious = events.filter(e => e.details?.aiReason || e.severity === 'warning').length;
    const typeCount: Record<string, number> = {};
    for (const e of events) typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
    return { period, total, critical, suspicious, topTypes };
  }
}
