// User analytics and reporting module
import { UserProfile } from './user-profile';

export interface UserEvent {
  userId: string;
  event: string;
  timestamp: number;
  details?: any;
}

export class UserAnalytics {
  private events: UserEvent[] = [];

  track(userId: string, event: string, details?: any) {
    this.events.push({ userId, event, timestamp: Date.now(), details });
  }

  getEvents(userId?: string): UserEvent[] {
    if (userId) return this.events.filter(e => e.userId === userId);
    return this.events;
  }

  getEventCounts(userId?: string): Record<string, number> {
    const filtered = userId ? this.events.filter(e => e.userId === userId) : this.events;
    return filtered.reduce((acc, e) => {
      acc[e.event] = (acc[e.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  getActiveUsers(sinceMs: number): string[] {
    const since = Date.now() - sinceMs;
    return Array.from(new Set(this.events.filter(e => e.timestamp >= since).map(e => e.userId)));
  }

  // Simple interactive report
  generateReport(userId?: string): string {
    const counts = this.getEventCounts(userId);
    return Object.entries(counts).map(([event, count]) => `${event}: ${count}`).join('\n');
  }
}
