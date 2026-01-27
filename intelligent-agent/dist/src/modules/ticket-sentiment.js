"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketSentiment = void 0;
const POSITIVE = ['thanks', 'great', 'good', 'resolved', 'happy', 'excellent', 'love'];
const NEGATIVE = ['bad', 'angry', 'hate', 'problem', 'issue', 'not working', 'unhappy', 'slow', 'terrible'];
class TicketSentiment {
    analyze(text) {
        const t = text.toLowerCase();
        if (NEGATIVE.some(w => t.includes(w)))
            return 'negative';
        if (POSITIVE.some(w => t.includes(w)))
            return 'positive';
        return 'neutral';
    }
    analyzeTicket(ticket) {
        const allText = [ticket.title, ticket.description, ...ticket.interactions.map(i => i.message)].join(' ');
        return this.analyze(allText);
    }
    getTrends(tickets) {
        const counts = { positive: 0, neutral: 0, negative: 0 };
        for (const t of tickets) {
            const s = this.analyzeTicket(t);
            counts[s]++;
        }
        return counts;
    }
}
exports.TicketSentiment = TicketSentiment;
