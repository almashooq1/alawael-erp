// SIEM/Log Management Integration Module
import { SecurityEvent } from './cyber-monitor';
import { PolicyChangeLog } from './security-policies';

export interface SiemDestination {
  id: string;
  url: string;
  enabled: boolean;
  type: 'security_event' | 'policy_change' | 'all';
}

export class SiemIntegration {
  private destinations: SiemDestination[] = [];

  addDestination(dest: Omit<SiemDestination, 'id'>) {
    const d: SiemDestination = { ...dest, id: Math.random().toString(36).slice(2) };
    this.destinations.push(d);
    return d;
  }
  removeDestination(id: string) {
    this.destinations = this.destinations.filter(d => d.id !== id);
  }
  listDestinations(): SiemDestination[] {
    return this.destinations;
  }
  setEnabled(id: string, enabled: boolean) {
    const d = this.destinations.find(x => x.id === id);
    if (d) d.enabled = enabled;
  }

  sendSecurityEvent(event: SecurityEvent) {
    for (const d of this.destinations.filter(x => x.enabled && (x.type === 'security_event' || x.type === 'all'))) {
      // postWebhook(d.url, event) -- mock only
    }
  }
  sendPolicyChange(change: PolicyChangeLog) {
    for (const d of this.destinations.filter(x => x.enabled && (x.type === 'policy_change' || x.type === 'all'))) {
      // postWebhook(d.url, change) -- mock only
    }
  }
}
