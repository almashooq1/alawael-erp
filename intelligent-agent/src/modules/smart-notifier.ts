  // Smart Notifier Module
export type NotificationChannel = 'email' | 'sms' | 'push';
export interface Notification {
  id: string;
  userId: string;
  message: string;
  channel: NotificationChannel;
  sentAt?: string;
  status?: 'pending' | 'sent' | 'failed';
}

import fetch from 'node-fetch';
import { SMSService } from './sms-service';

export class SmartNotifier {
  sms: SMSService;
  slackWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;

  private notifications: Notification[] = [];

  constructor(sms: SMSService, slackWebhookUrl?: string, telegramBotToken?: string, telegramChatId?: string) {
    this.sms = sms;
    this.slackWebhookUrl = slackWebhookUrl;
    this.telegramBotToken = telegramBotToken;
    this.telegramChatId = telegramChatId;
  }

  sendNotification({ userId, message, channel }: { userId: string; message: string; channel: NotificationChannel }) {
    // For demo: just log and send SMS
    console.log(`[NOTIFY][${channel}] To: ${userId} - ${message}`);
    if (channel === 'sms') {
      this.sms.send(userId, message);
    }
    // Add email/push logic as needed
    const notif: Notification = {
      id: Math.random().toString(36).slice(2),
      userId,
      message,
      channel,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    this.notifications.push(notif);
    return notif;
  }

  async notifyAll(message: string) {
    // Console
    console.log('[NOTIFY]', message);
    // SMS
    await this.sms.send(process.env.ALERT_PHONE || '', message);
    // Slack
    if (this.slackWebhookUrl) {
      await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
      });
    }
    // Telegram
    if (this.telegramBotToken && this.telegramChatId) {
      await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.telegramChatId, text: message })
      });
    }
  }

  listNotifications(userId?: string) {
    if (userId) return this.notifications.filter(n => n.userId === userId);
    return this.notifications;
  }

  getNotification(id: string) {
    return this.notifications.find(n => n.id === id);
  }
}
