// AI Ticket Classifier Module
// This module uses a simple keyword-based classifier for demonstration.
// In production, integrate with an AI/ML service or OpenAI API.
import { Ticket } from './smart-ticketing';

export type TicketCategory = 'technical' | 'billing' | 'account' | 'feature_request' | 'other';

const KEYWORDS: Record<TicketCategory, string[]> = {
  technical: ['error', 'bug', 'crash', 'issue', 'problem', 'fail'],
  billing: ['invoice', 'payment', 'refund', 'charge', 'billing'],
  account: ['login', 'password', 'account', 'signup', 'register'],
  feature_request: ['feature', 'request', 'add', 'improve', 'enhance'],
  other: []
};

export class AITicketClassifier {
  classify(ticket: Pick<Ticket, 'title' | 'description'>): TicketCategory {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    for (const [cat, words] of Object.entries(KEYWORDS)) {
      if (words.some(w => text.includes(w))) return cat as TicketCategory;
    }
    return 'other';
  }
}
