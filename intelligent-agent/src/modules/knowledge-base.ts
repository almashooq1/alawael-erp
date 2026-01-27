// Knowledge Base Module for Ticket Suggestions
// This is a simple in-memory knowledge base for demo. In production, connect to a real KB or AI service.
import { Ticket, TicketInteraction } from './smart-ticketing';

export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
  feedback?: { userId: string; comment?: string; rating?: number; createdAt: string }[];
}

export class KnowledgeBase {
  private entries: KnowledgeBaseEntry[] = [
    { id: '1', question: 'How to reset my password?', answer: 'Go to the login page and click "Forgot Password".', tags: ['account', 'password'] },
    { id: '2', question: 'How to request a refund?', answer: 'Contact billing support with your invoice number.', tags: ['billing', 'refund'] },
    { id: '3', question: 'App is crashing on launch', answer: 'Try reinstalling the app or clearing cache.', tags: ['technical', 'crash'] },
  ];

  addEntry(entry: Omit<KnowledgeBaseEntry, 'id'>) {
    const e: KnowledgeBaseEntry = { ...entry, id: Math.random().toString(36).slice(2) };
    this.entries.push(e);
    return e;
  }

  listEntries() {
    return this.entries;
  }

  // Suggest answers based on ticket content (simple keyword match)
  suggest(ticket: Pick<Ticket, 'title' | 'description' | 'category'>): KnowledgeBaseEntry[] {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    return this.entries.filter(e =>
      (e.tags || []).some(tag => ticket.category === tag || text.includes(tag)) ||
      e.question.toLowerCase().split(' ').some(word => text.includes(word))
    );
  }

  addFeedback(entryId: string, userId: string, rating?: number, comment?: string) {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;
    if (!entry.feedback) entry.feedback = [];
    entry.feedback.push({ userId, rating, comment, createdAt: new Date().toISOString() });
    return true;
  }

  getFeedback(entryId: string) {
    const entry = this.entries.find(e => e.id === entryId);
    return entry?.feedback || [];
  }
}
