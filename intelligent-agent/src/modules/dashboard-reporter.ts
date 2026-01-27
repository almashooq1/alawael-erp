// Advanced Reporting & Dashboard Module
// Provides aggregated metrics and visual-ready data for dashboards.
import { Ticket } from './smart-ticketing';
import { TicketSurvey } from './ticket-survey';

export interface DashboardReport {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  avgResolutionHours: number;
  satisfactionAvg: number;
  satisfactionCount: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  ticketsByStatus: Record<string, number>;
  busiestDepartments: [string, number][];
}

export class DashboardReporter {
  constructor(
    private getTickets: () => Ticket[],
    private getSurveys: () => TicketSurvey[]
  ) {}

  getReport(): DashboardReport {
    const tickets = this.getTickets();
    const surveys = this.getSurveys();
    const total = tickets.length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    const open = total - closed;
    const avgResolution = this.getAvgResolutionTime(tickets);
    const satisfaction = this.getSatisfaction(surveys);
    const byCat: Record<string, number> = {};
    const byPri: Record<string, number> = {};
    const byStat: Record<string, number> = {};
    const byDept: Record<string, number> = {};
    for (const t of tickets) {
      if (t.category) byCat[t.category] = (byCat[t.category] || 0) + 1;
      byPri[t.priority] = (byPri[t.priority] || 0) + 1;
      byStat[t.status] = (byStat[t.status] || 0) + 1;
      if (t.department) byDept[t.department] = (byDept[t.department] || 0) + 1;
    }
    return {
      totalTickets: total,
      openTickets: open,
      closedTickets: closed,
      avgResolutionHours: avgResolution,
      satisfactionAvg: satisfaction.avg,
      satisfactionCount: satisfaction.count,
      ticketsByCategory: byCat,
      ticketsByPriority: byPri,
      ticketsByStatus: byStat,
      busiestDepartments: Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,3),
    };
  }

  getAvgResolutionTime(tickets: Ticket[]): number {
    const times = tickets.filter(t => t.status === 'closed').map(t => {
      const created = new Date(t.createdAt).getTime();
      const closed = new Date(t.updatedAt).getTime();
      return (closed - created) / (1000*60*60);
    });
    if (!times.length) return 0;
    return +(times.reduce((a,b)=>a+b,0)/times.length).toFixed(2);
  }

  getSatisfaction(surveys: TicketSurvey[]) {
    if (!surveys.length) return { avg: 0, count: 0 };
    const avg = +(surveys.reduce((a,s)=>a+s.rating,0)/surveys.length).toFixed(2);
    return { avg, count: surveys.length };
  }
}
