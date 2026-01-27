import { Asset } from '../../src/modules/asset-management';
// src/modules/notification-center.ts
// Advanced Notification Center (Multi-Channel)
// Supports notifications via email, SMS, push, and in-app

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  sent: boolean;
  sentAt?: string;
  metadata?: Record<string, any>;
}

const notifications: Notification[] = [];

function generateId() {
  return 'N' + Math.random().toString(36).slice(2, 10);
}

export class NotificationCenter {
  // Send maintenance alerts for assets
  sendMaintenanceAlerts(assets: Asset[], channel: NotificationChannel = 'in-app') {
    const alerts = [];
    for (const asset of assets) {
      const notif: Notification = {
        id: generateId(),
        userId: asset.owner || 'admin',
        title: `Maintenance Alert: ${asset.name}`,
        message: asset.aiRecommendation || 'Asset requires maintenance soon.',
        channel,
        sent: true,
        sentAt: new Date().toISOString(),
        metadata: { assetId: asset.id, nextMaintenanceDue: asset.nextMaintenanceDue },
      };
      notifications.push(notif);
      alerts.push(notif);
    }
    return alerts;
  }
  listNotifications(userId?: string) {
    return userId ? notifications.filter(n => n.userId === userId) : notifications;
  }
  sendNotification(data: Omit<Notification, 'id' | 'sent' | 'sentAt'>) {
    const notif: Notification = {
      id: generateId(),
      sent: true,
      sentAt: new Date().toISOString(),
      ...data,
    };
    notifications.push(notif);
    return notif;
  }
  // Simulate multi-channel delivery
  resendNotification(id: string) {
    const n = notifications.find(n => n.id === id);
    if (!n) return null;
    n.sent = true;
    n.sentAt = new Date().toISOString();
    return n;
  }
}
