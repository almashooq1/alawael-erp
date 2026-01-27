// Advanced User Notification Preferences Module
// Allows users to customize notification channels and event types.
export type NotificationChannel = 'email' | 'sms' | 'slack' | 'teams' | 'web' | 'push';

export interface UserNotificationPreference {
  userId: string;
  channels: NotificationChannel[];
  eventTypes: string[]; // e.g. ['ticket_created','ticket_closed','escalated']
  muteUntil?: string; // ISO date
}

export class NotificationPreferencesManager {
  private prefs: UserNotificationPreference[] = [];

  setPreference(pref: UserNotificationPreference) {
    const idx = this.prefs.findIndex(p => p.userId === pref.userId);
    if (idx >= 0) this.prefs[idx] = pref;
    else this.prefs.push(pref);
    return pref;
  }

  getPreference(userId: string): UserNotificationPreference | undefined {
    return this.prefs.find(p => p.userId === userId);
  }

  listPreferences() {
    return this.prefs;
  }
}
