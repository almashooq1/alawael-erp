// Advanced Business Intelligence (BI) & Interactive Reporting Module
// Provides interactive dashboards, charts, and analytics for projects

export interface BIReport {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'table' | 'custom';
  data: any;
  createdAt: string;
}

export class BIReports {
  private reports: BIReport[] = [];

  createReport(title: string, type: BIReport['type'], data: any): BIReport {
    const r: BIReport = {
      id: Math.random().toString(36).slice(2),
      title,
      type,
      data,
      createdAt: new Date().toISOString(),
    };
    this.reports.push(r);
    return r;
  }

  listReports(): BIReport[] {
    return this.reports;
  }

  getReport(id: string): BIReport | undefined {
    return this.reports.find(r => r.id === id);
  }
}
