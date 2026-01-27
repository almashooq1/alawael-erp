// Ticket Workflow Automation Module
// Allows defining custom workflow rules and automation actions for tickets.
import { Ticket, TicketStatus, TicketPriority } from './smart-ticketing';

export type WorkflowCondition = (ticket: Ticket) => boolean;
export type WorkflowAction = (ticket: Ticket) => void;

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  condition: WorkflowCondition;
  action: WorkflowAction;
  enabled: boolean;
}

export class TicketWorkflowEngine {
  private rules: WorkflowRule[] = [];

  addRule(rule: Omit<WorkflowRule, 'id'>) {
    const r: WorkflowRule = { ...rule, id: Math.random().toString(36).slice(2) };
    this.rules.push(r);
    return r;
  }

  removeRule(id: string) {
    this.rules = this.rules.filter(r => r.id !== id);
  }

  listRules() {
    return this.rules;
  }

  run(ticket: Ticket) {
    for (const rule of this.rules.filter(r => r.enabled)) {
      if (rule.condition(ticket)) {
        rule.action(ticket);
      }
    }
  }
}
