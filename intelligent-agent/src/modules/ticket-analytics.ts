// Ticket Analytics Module
import { Ticket } from './smart-ticketing';

export class TicketAnalytics {
  constructor(private getTickets: () => Ticket[]) {}

  getSummary() {
    const tickets = this.getTickets();
    const total = tickets.length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    const avgResolution = this.getAvgResolutionTime(tickets);
    const byDept: Record<string, number> = {};
    for (const t of tickets) {
      if (t.department) byDept[t.department] = (byDept[t.department] || 0) + 1;
    }
    return {
      total,
      closed,
      open: total - closed,
      avgResolutionHours: avgResolution,
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
}
