// Ticket Sentiment Analysis & Trends Module
// Simple keyword-based sentiment for demo. In production, use AI/ML APIs.
import { Ticket, TicketInteraction } from './smart-ticketing';

export type Sentiment = 'positive' | 'neutral' | 'negative';

const POSITIVE = ['thanks', 'great', 'good', 'resolved', 'happy', 'excellent', 'love'];
const NEGATIVE = ['bad', 'angry', 'hate', 'problem', 'issue', 'not working', 'unhappy', 'slow', 'terrible'];

export class TicketSentiment {
  analyze(text: string): Sentiment {
    const t = text.toLowerCase();
    if (NEGATIVE.some(w => t.includes(w))) return 'negative';
    if (POSITIVE.some(w => t.includes(w))) return 'positive';
    return 'neutral';
  }

  analyzeTicket(ticket: Ticket): Sentiment {
    const allText = [ticket.title, ticket.description, ...ticket.interactions.map(i => i.message)].join(' ');
    return this.analyze(allText);
  }

  getTrends(tickets: Ticket[]): Record<Sentiment, number> {
    const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
    for (const t of tickets) {
      const s = this.analyzeTicket(t);
      counts[s]++;
    }
    return counts;
  }
}
