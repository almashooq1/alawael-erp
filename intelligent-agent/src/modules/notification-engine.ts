// Advanced Notification & Escalation Engine
// Centralizes notifications, escalations, and multi-channel delivery

export interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  channel: 'email' | 'sms' | 'push' | 'web' | 'slack';
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
}

export interface EscalationRule {
  id: string;
  trigger: string; // e.g. 'risk_high', 'task_overdue'
  channel: 'email' | 'sms' | 'push' | 'slack';
  targetUserIds: string[];
  message: string;
  enabled: boolean;
}

export class NotificationEngine {
  private notifications: Notification[] = [];
  private escalationRules: EscalationRule[] = [];

  sendNotification(data: Omit<Notification, 'id' | 'status' | 'createdAt' | 'sentAt'>): Notification {
    const n: Notification = {
      ...data,
      id: Math.random().toString(36).slice(2),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    // Simulate sending
    n.status = 'sent';
    n.sentAt = new Date().toISOString();
    this.notifications.push(n);
    return n;
  }

  listNotifications(userId?: string): Notification[] {
    return userId ? this.notifications.filter(n => n.userId === userId) : this.notifications;
  }

  addEscalationRule(rule: Omit<EscalationRule, 'id'>): EscalationRule {
    const r: EscalationRule = { ...rule, id: Math.random().toString(36).slice(2) };
    this.escalationRules.push(r);
    return r;
  }

  listEscalationRules(): EscalationRule[] {
    return this.escalationRules;
  }

  triggerEscalation(trigger: string): Notification[] {
    const rules = this.escalationRules.filter(r => r.enabled && r.trigger === trigger);
    const sent: Notification[] = [];
    for (const rule of rules) {
      for (const userId of rule.targetUserIds) {
        sent.push(this.sendNotification({
          userId,
          type: 'escalation',
          content: rule.message,
          channel: rule.channel,
        }));
      }
    }
    return sent;
  }
}
