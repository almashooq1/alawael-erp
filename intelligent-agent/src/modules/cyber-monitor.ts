import { AutoEscalation } from './auto-escalation';
import { InstantNotifier } from './instant-notifier';
import { AIThreatDetector } from './ai-threat-detector';

export type IntegrationType = 'email' | 'sms' | 'webhook';
export interface IntegrationDestination {
  id: string;
  type: IntegrationType;
  target: string; // email, phone, or URL
  enabled: boolean;
}

// Cybersecurity Monitoring Module
export interface SecurityEvent {
  id: string;
  type: string;
  userId?: string;
  details?: any;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export class CyberMonitor {
  private aiDetector = new AIThreatDetector();
  private integrations: IntegrationDestination[] = [];
  private events: SecurityEvent[] = [];
  private alerts: SecurityEvent[] = [];
  constructor(private autoEscalation?: AutoEscalation, private instantNotifier?: InstantNotifier) {}

  // Integration management
  addIntegration(dest: Omit<IntegrationDestination, 'id'>) {
    const d: IntegrationDestination = { ...dest, id: Math.random().toString(36).slice(2) };
    this.integrations.push(d);
    return d;
  }
  removeIntegration(id: string) {
    this.integrations = this.integrations.filter(d => d.id !== id);
  }
  listIntegrations(): IntegrationDestination[] {
    return this.integrations;
  }
  setIntegrationEnabled(id: string, enabled: boolean) {
    const d = this.integrations.find(i => i.id === id);
    if (d) d.enabled = enabled;
  }


  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>) {
    const e: SecurityEvent = {
      ...event,
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    };
    this.events.push(e);
    // تحليل التهديد بالذكاء الاصطناعي
    const aiResult = this.aiDetector.analyze(e);
    if (e.severity === 'critical' || this.isSuspicious(e) || aiResult.threat) {
      this.alerts.push({ ...e, details: { ...e.details, aiReason: aiResult.reason } });
      this.sendIntegrations(e);
      // التصعيد التلقائي
      if (this.autoEscalation && this.instantNotifier) {
        this.autoEscalation.checkAndEscalate(
          e,
          this.events,
          (channels, eventObj) => {
            if (this.instantNotifier) {
              for (const ch of channels) {
                this.instantNotifier.sendInstant(
                  `[تصعيد تلقائي] حدث أمني: ${eventObj.type} (${eventObj.severity})`,
                  ch as any
                );
              }
            }
          }
        );
      }
    }
    return e;
  }

  // Send to all enabled integrations (mocked)
  private sendIntegrations(event: SecurityEvent) {
    for (const dest of this.integrations.filter(i => i.enabled)) {
      if (dest.type === 'email') {
        // Integrate with real email service
        // sendEmail(dest.target, event)
      } else if (dest.type === 'sms') {
        // Integrate with real SMS service
        // sendSMS(dest.target, event)
      } else if (dest.type === 'webhook') {
        // Integrate with real webhook
        // postWebhook(dest.target, event)
      }
    }
  }

  isSuspicious(event: SecurityEvent): boolean {
    // Example: flag multiple failed logins, privilege escalation, etc.
    if (event.type === 'failed_login' && event.details?.count >= 3) return true;
    if (event.type === 'privilege_escalation') return true;
    return false;
  }

  listEvents(filter?: { userId?: string; type?: string; severity?: string }): SecurityEvent[] {
    return this.events.filter(e =>
      (!filter?.userId || e.userId === filter.userId) &&
      (!filter?.type || e.type === filter.type) &&
      (!filter?.severity || e.severity === filter.severity)
    );
  }

  listAlerts(): SecurityEvent[] {
    return this.alerts;
  }
}
