// SLA Management & Breach Alerts Module
// Allows defining SLA rules and checks for breaches.
import { Ticket, TicketPriority } from './smart-ticketing';

export interface SLARule {
  id: string;
  name: string;
  priority: TicketPriority;
  maxHours: number;
  enabled: boolean;
}

export interface SLABreach {
  ticketId: string;
  ruleId: string;
  breachedAt: string;
  hoursOpen: number;
}

export class SLAManager {
  private rules: SLARule[] = [];
  private breaches: SLABreach[] = [];

  addRule(rule: Omit<SLARule, 'id'>) {
    const r: SLARule = { ...rule, id: Math.random().toString(36).slice(2) };
    this.rules.push(r);
    return r;
  }

  removeRule(id: string) {
    this.rules = this.rules.filter(r => r.id !== id);
  }

  listRules() {
    return this.rules;
  }

  checkBreaches(tickets: Ticket[]) {
    const now = Date.now();
    for (const rule of this.rules.filter(r => r.enabled)) {
      for (const t of tickets.filter(t => t.priority === rule.priority && t.status !== 'closed')) {
        const hours = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        if (hours > rule.maxHours && !this.breaches.find(b => b.ticketId === t.id && b.ruleId === rule.id)) {
          this.breaches.push({ ticketId: t.id, ruleId: rule.id, breachedAt: new Date().toISOString(), hoursOpen: +hours.toFixed(2) });
        }
      }
    }
  }

  listBreaches() {
    return this.breaches;
  }
}
