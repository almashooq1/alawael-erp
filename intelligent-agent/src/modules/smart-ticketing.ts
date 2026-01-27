
import { TicketCategory } from './ai-ticket-classifier';
import { TicketWorkflowEngine, WorkflowRule } from './ticket-workflow';
import { KnowledgeBase } from './knowledge-base';


export type TicketIntegrationChannel = 'email' | 'slack' | 'teams' | 'telegram' | 'webhook';
export interface TicketIntegrationDestination {
  id: string;
  channel: TicketIntegrationChannel;
  target: string; // email, webhook URL, chat ID
  enabled: boolean;
  eventTypes: string[]; // e.g. ['created','closed','escalated']
}

export interface AutoReplyRule {
  id: string;
  keyword: string;
  reply: string;
  enabled: boolean;
}

export interface TicketEscalationRule {
  id: string;
  priority: TicketPriority;
  maxHours: number;

  targetStatus: TicketStatus;
  notifyChannels: string[];
  enabled: boolean;
}

export type TicketStatus = 'new' | 'in_progress' | 'waiting' | 'closed' | 'escalated';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  userId: string;
  department?: string;
  type?: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  interactions: TicketInteraction[];
  category?: TicketCategory;
}

export interface TicketInteraction {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  internal?: boolean;
}



export class SmartTicketing {
  private tickets: Ticket[] = [];
  private interactions: TicketInteraction[] = [];
  private autoReplyRules: AutoReplyRule[] = [];
  private escalationRules: TicketEscalationRule[] = [];
  private workflowEngine: TicketWorkflowEngine;
  private knowledgeBase: KnowledgeBase;

  constructor() {
    this.workflowEngine = new TicketWorkflowEngine();
    this.knowledgeBase = new KnowledgeBase();
  }

  // Public proxy methods for knowledge base feedback
  addKnowledgeFeedback(entryId: string, userId: string, rating?: number, comment?: string) {
    return this.knowledgeBase.addFeedback(entryId, userId, rating, comment);
  }
  getKnowledgeFeedback(entryId: string) {
    return this.knowledgeBase.getFeedback(entryId);
  }

  // Stubs for missing methods to resolve server.ts API usage errors
  addIntegration(dest: any) { return {}; }
  removeIntegration(id: string) { return true; }
  listIntegrations() { return []; }
  setIntegrationEnabled(id: string, enabled: boolean) { return true; }

  addAutoReplyRule(rule: AutoReplyRule) { this.autoReplyRules.push(rule); return rule; }
  removeAutoReplyRule(id: string) { this.autoReplyRules = this.autoReplyRules.filter(r => r.id !== id); return true; }
  listAutoReplyRules() { return this.autoReplyRules; }

  addEscalationRule(rule: TicketEscalationRule) { this.escalationRules.push(rule); return rule; }
  removeEscalationRule(id: string) { this.escalationRules = this.escalationRules.filter(r => r.id !== id); return true; }
  listEscalationRules() { return this.escalationRules; }

  createTicket(data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'interactions'>) {
    const ticket: Ticket = {
      ...data,
      id: Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      interactions: [],
    };
    this.tickets.push(ticket);
    return ticket;
  }
  updateTicket(id: string, data: Partial<Ticket>) {
    const t = this.getTicket(id);
    if (!t) return undefined;
    Object.assign(t, data, { updatedAt: new Date().toISOString() });
    return t;
  }

  suggestKnowledge(input: Pick<Ticket, 'title' | 'description' | 'category'>) {
    return this.knowledgeBase.suggest(input);
  }
  linkTickets(id1: string, id2: string) { return true; }
  mergeTickets(targetId: string, sourceId: string) { return true; }
  splitTicket(id: string, interactionIds: string[]) { return {}; }

  addWorkflowRule(rule: Omit<WorkflowRule, 'id'>) {
    return this.workflowEngine.addRule(rule);
  }
  removeWorkflowRule(id: string) {
    return this.workflowEngine.removeRule(id);
  }
  listWorkflowRules() {
    return this.workflowEngine.listRules();
  }

  getTicket(id: string): Ticket | undefined {
    return this.tickets.find(x => x.id === id);
  }

  listTickets(filter?: Partial<Pick<Ticket, 'userId' | 'status' | 'priority' | 'department'>>): Ticket[] {
    return this.tickets.filter(t =>
      (!filter?.userId || t.userId === filter.userId) &&
      (!filter?.status || t.status === filter.status) &&
      (!filter?.priority || t.priority === filter.priority) &&
      (!filter?.department || t.department === filter.department)
    );
  }

  addInteraction(ticketId: string, userId: string, message: string, internal = false): TicketInteraction | undefined {
    const t = this.getTicket(ticketId);
    if (!t) return undefined;
    const i: TicketInteraction = {
      id: Math.random().toString(36).slice(2),
      ticketId,
      userId,
      message,
      createdAt: new Date().toISOString(),
      internal,
    };
    t.interactions.push(i);
    this.interactions.push(i);
    t.updatedAt = new Date().toISOString();
    // الرد التلقائي
    if (!internal) {
      for (const rule of this.autoReplyRules.filter(r => r.enabled)) {
        if (message.includes(rule.keyword)) {
          const autoReply: TicketInteraction = {
            id: Math.random().toString(36).slice(2),
            ticketId,
            userId: 'auto-reply',
            message: rule.reply,
            createdAt: new Date().toISOString(),
            internal: false,
          };
          t.interactions.push(autoReply);
          this.interactions.push(autoReply);
        }
      }
    }
    return i;
  }

  // التصعيد الذكي: فحص التذاكر غير المحلولة وتصعيدها حسب القواعد
  autoEscalate(notifyFn: (channels: string[], ticket: Ticket) => void) {
    const now = Date.now();
    for (const rule of this.escalationRules.filter(r => r.enabled)) {
      for (const t of this.tickets.filter(t => t.priority === rule.priority && t.status !== rule.targetStatus)) {
        const hours = (now - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
        if (hours >= rule.maxHours) {
          t.status = rule.targetStatus;
          t.updatedAt = new Date().toISOString();
          notifyFn(rule.notifyChannels, t);
        }
      }
    }
  }

  listInteractions(ticketId: string): TicketInteraction[] {
    return this.interactions.filter(i => i.ticketId === ticketId);
  }
}
