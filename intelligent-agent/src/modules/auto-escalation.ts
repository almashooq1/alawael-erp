// Auto-Escalation Module
import { SecurityEvent } from './cyber-monitor';

export interface EscalationRule {
  id: string;
  type: string; // event type
  threshold: number; // number of events
  windowMinutes: number;
  targetChannels: string[]; // e.g. ['email','slack']
  description?: string;
}

export interface EscalationLog {
  timestamp: string;
  event: SecurityEvent;
  ruleId: string;
  targets: string[];
}

export class AutoEscalation {
  private rules: EscalationRule[] = [];
  private log: EscalationLog[] = [];

  addRule(rule: Omit<EscalationRule, 'id'>) {
    const r: EscalationRule = { ...rule, id: Math.random().toString(36).slice(2) };
    this.rules.push(r);
    return r;
  }
  removeRule(id: string) {
    this.rules = this.rules.filter(r => r.id !== id);
  }
  listRules() {
    return this.rules;
  }
  getLog() {
    return this.log;
  }

  checkAndEscalate(event: SecurityEvent, recentEvents: SecurityEvent[], sendFn: (channels: string[], event: SecurityEvent) => void) {
    for (const rule of this.rules) {
      if (event.type === rule.type) {
        const since = Date.now() - rule.windowMinutes * 60 * 1000;
        const count = recentEvents.filter(e => e.type === rule.type && new Date(e.timestamp).getTime() >= since).length;
        if (count >= rule.threshold) {
          sendFn(rule.targetChannels, event);
          this.log.push({ timestamp: new Date().toISOString(), event, ruleId: rule.id, targets: rule.targetChannels });
        }
      }
    }
  }
}
