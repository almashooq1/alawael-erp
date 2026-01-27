"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketAnalytics = void 0;
class TicketAnalytics {
    constructor(getTickets) {
        this.getTickets = getTickets;
    }
    getSummary() {
        const tickets = this.getTickets();
        const total = tickets.length;
        const closed = tickets.filter(t => t.status === 'closed').length;
        const avgResolution = this.getAvgResolutionTime(tickets);
        const byDept = {};
        for (const t of tickets) {
            if (t.department)
                byDept[t.department] = (byDept[t.department] || 0) + 1;
        }
        return {
            total,
            closed,
            open: total - closed,
            avgResolutionHours: avgResolution,
            busiestDepartments: Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 3),
        };
    }
    getAvgResolutionTime(tickets) {
        const times = tickets.filter(t => t.status === 'closed').map(t => {
            const created = new Date(t.createdAt).getTime();
            const closed = new Date(t.updatedAt).getTime();
            return (closed - created) / (1000 * 60 * 60);
        });
        if (!times.length)
            return 0;
        return +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
    }
}
exports.TicketAnalytics = TicketAnalytics;
