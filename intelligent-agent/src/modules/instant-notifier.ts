// Instant Notifier Module (Slack/Teams/Telegram)
export type InstantChannel = 'slack' | 'teams' | 'telegram';
export interface InstantDestination {
  id: string;
  channel: InstantChannel;
  target: string; // webhook URL or chat ID
  enabled: boolean;
}

export class InstantNotifier {
  private destinations: InstantDestination[] = [];

  addDestination(dest: Omit<InstantDestination, 'id'>) {
    const d: InstantDestination = { ...dest, id: Math.random().toString(36).slice(2) };
    this.destinations.push(d);
    return d;
  }
  removeDestination(id: string) {
    this.destinations = this.destinations.filter(d => d.id !== id);
  }
  listDestinations(): InstantDestination[] {
    return this.destinations;
  }
  setEnabled(id: string, enabled: boolean) {
    const d = this.destinations.find(x => x.id === id);
    if (d) d.enabled = enabled;
  }

  sendInstant(message: string, channel: InstantChannel) {
    for (const d of this.destinations.filter(x => x.enabled && x.channel === channel)) {
      // postWebhook(d.target, { text: message }) -- mock only
    }
  }
}
