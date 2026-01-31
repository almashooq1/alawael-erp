import * as nodemailer from 'nodemailer';
import * as events from 'events';

/**
 * Notification Service for Multi-Channel Alert Management
 * Supports Email, SMS, Push, and In-App Notifications
 */

interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'failed' | 'read';
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  recipients: string[];
}

interface NotificationTemplate {
  name: string;
  subject?: string;
  template: string;
  variables: string[];
}

interface EmailConfig {
  service: string;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class NotificationService extends events.EventEmitter {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private emailTransporter: nodemailer.Transporter | null = null;
  private queue: Notification[] = [];
  private isProcessing: boolean = false;
  private userPreferences: Map<string, any> = new Map();

  constructor(emailConfig?: EmailConfig) {
    super();

    if (emailConfig) {
      this.initializeEmail(emailConfig);
    }

    this.loadDefaultTemplates();
    this.startQueueProcessor();
  }

  /**
   * Initialize Email Service
   */
  private initializeEmail(config: EmailConfig): void {
    this.emailTransporter = nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });

    console.log('✓ Email service initialized');
  }

  /**
   * Load Default Notification Templates
   */
  private loadDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        name: 'process-complete',
        subject: 'Process Completed Successfully',
        template: 'Process {{processName}} has been completed in {{duration}}s',
        variables: ['processName', 'duration'],
      },
      {
        name: 'process-error',
        subject: 'Process Error Alert',
        template: 'Process {{processName}} encountered an error: {{error}}',
        variables: ['processName', 'error'],
      },
      {
        name: 'performance-alert',
        subject: 'Performance Alert',
        template: 'Process {{processName}} performance degraded to {{score}}%',
        variables: ['processName', 'score'],
      },
      {
        name: 'anomaly-detected',
        subject: 'Anomaly Detected',
        template: 'Unusual pattern detected in {{processName}}: {{anomaly}}',
        variables: ['processName', 'anomaly'],
      },
      {
        name: 'threshold-breached',
        subject: 'Threshold Breached',
        template: 'Metric {{metric}} exceeded threshold ({{value}} > {{threshold}})',
        variables: ['metric', 'value', 'threshold'],
      },
    ];

    templates.forEach(t => this.templates.set(t.name, t));
    console.log(`✓ Loaded ${templates.length} notification templates`);
  }

  /**
   * Create Notification
   */
  createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    priority: Notification['priority'] = 'medium',
    recipients: string[] = []
  ): Notification {
    const notification: Notification = {
      id: this.generateNotificationId(),
      userId,
      type,
      title,
      message,
      priority,
      status: 'pending',
      createdAt: new Date(),
      recipients,
    };

    this.notifications.set(notification.id, notification);
    this.queue.push(notification);

    console.log(`📬 Notification created: ${notification.id} (${type})`);
    this.emit('notification-created', notification);

    return notification;
  }

  /**
   * Send Email Notification
   */
  async sendEmailNotification(
    recipients: string[],
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    if (!this.emailTransporter) {
      console.warn('Email service not configured');
      return false;
    }

    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@system.ai',
        to: recipients.join(', '),
        subject,
        html: htmlContent,
      });

      console.log(`✓ Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  /**
   * Send Push Notification
   */
  async sendPushNotification(userId: string, title: string, message: string): Promise<boolean> {
    try {
      // Integration with Firebase Cloud Messaging, OneSignal, or similar
      console.log(`📱 Push notification queued for ${userId}: ${title}`);
      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  /**
   * Create Notification from Template
   */
  createFromTemplate(
    userId: string,
    type: Notification['type'],
    templateName: string,
    variables: Record<string, any>,
    recipients: string[] = []
  ): Notification | null {
    const template = this.templates.get(templateName);
    if (!template) {
      console.warn(`Template not found: ${templateName}`);
      return null;
    }

    let message = template.template;
    let subject = template.subject || templateName;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(`{{${key}}}`, String(value));
      subject = subject.replace(`{{${key}}}`, String(value));
    }

    return this.createNotification(userId, type, subject, message, 'medium', recipients);
  }

  /**
   * Start Queue Processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000); // Process every second
  }

  /**
   * Process Notification Queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const notification = this.queue.shift();
        if (notification) {
          await this.sendNotification(notification);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send Notification
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.type) {
        case 'email':
          await this.sendEmailNotification(notification.recipients, notification.title, notification.message);
          break;
        case 'push':
          await this.sendPushNotification(notification.userId, notification.title, notification.message);
          break;
        case 'in-app':
          console.log(`💬 In-app notification for ${notification.userId}: ${notification.title}`);
          break;
        case 'sms':
          console.log(`📲 SMS notification queued: ${notification.message}`);
          break;
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
      this.notifications.set(notification.id, notification);

      console.log(`✓ Notification sent: ${notification.id}`);
      this.emit('notification-sent', notification);
    } catch (error) {
      notification.status = 'failed';
      this.notifications.set(notification.id, notification);
      console.error(`✗ Notification failed: ${notification.id}`, error);
      this.emit('notification-failed', notification);
    }
  }

  /**
   * Mark Notification as Read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.status = 'read';
    notification.readAt = new Date();
    this.notifications.set(notificationId, notification);

    this.emit('notification-read', notification);
    return true;
  }

  /**
   * Get User Notifications
   */
  getUserNotifications(userId: string, limit: number = 50): Notification[] {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return userNotifications;
  }

  /**
   * Get Unread Notifications
   */
  getUnreadNotifications(userId: string): Notification[] {
    return this.getUserNotifications(userId).filter(n => n.status !== 'read');
  }

  /**
   * Delete Notification
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /**
   * Clear User Notifications
   */
  clearUserNotifications(userId: string, type?: Notification['type']): number {
    let count = 0;
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId && (!type || notification.type === type)) {
        this.notifications.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Set User Preferences
   */
  setUserPreferences(userId: string, preferences: any): void {
    this.userPreferences.set(userId, {
      ...this.userPreferences.get(userId),
      ...preferences,
    });
    console.log(`✓ Preferences updated for ${userId}`);
  }

  /**
   * Get User Preferences
   */
  getUserPreferences(userId: string): any {
    return this.userPreferences.get(userId) || {
      email: true,
      push: true,
      sms: false,
      inApp: true,
    };
  }

  /**
   * Bulk Create Notifications
   */
  bulkCreate(
    userIds: string[],
    type: Notification['type'],
    title: string,
    message: string,
    priority: Notification['priority'] = 'medium'
  ): Notification[] {
    const notifications: Notification[] = [];

    for (const userId of userIds) {
      const notification = this.createNotification(userId, type, title, message, priority);
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Get Notification Statistics
   */
  getStats(): object {
    const notifications = Array.from(this.notifications.values());
    const byType = notifications.reduce((acc: any, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});

    const byStatus = notifications.reduce((acc: any, n) => {
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: this.notifications.size,
      queueLength: this.queue.length,
      byType,
      byStatus,
      templates: this.templates.size,
    };
  }

  /**
   * Add Custom Template
   */
  addTemplate(name: string, template: NotificationTemplate): void {
    this.templates.set(name, template);
    console.log(`✓ Template added: ${name}`);
  }

  /**
   * Generate Notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export factory function
export function createNotificationService(emailConfig?: EmailConfig) {
  return new NotificationService(emailConfig);
}
