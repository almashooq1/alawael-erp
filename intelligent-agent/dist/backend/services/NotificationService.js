"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
exports.createNotificationService = createNotificationService;
const nodemailer = __importStar(require("nodemailer"));
const events = __importStar(require("events"));
class NotificationService extends events.EventEmitter {
    constructor(emailConfig) {
        super();
        this.notifications = new Map();
        this.templates = new Map();
        this.emailTransporter = null;
        this.queue = [];
        this.isProcessing = false;
        this.userPreferences = new Map();
        if (emailConfig) {
            this.initializeEmail(emailConfig);
        }
        this.loadDefaultTemplates();
        this.startQueueProcessor();
    }
    /**
     * Initialize Email Service
     */
    initializeEmail(config) {
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
    loadDefaultTemplates() {
        const templates = [
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
    createNotification(userId, type, title, message, priority = 'medium', recipients = []) {
        const notification = {
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
    async sendEmailNotification(recipients, subject, htmlContent) {
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
        }
        catch (error) {
            console.error('Email send error:', error);
            return false;
        }
    }
    /**
     * Send Push Notification
     */
    async sendPushNotification(userId, title, message) {
        try {
            // Integration with Firebase Cloud Messaging, OneSignal, or similar
            console.log(`📱 Push notification queued for ${userId}: ${title}`);
            return true;
        }
        catch (error) {
            console.error('Push notification error:', error);
            return false;
        }
    }
    /**
     * Create Notification from Template
     */
    createFromTemplate(userId, type, templateName, variables, recipients = []) {
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
    startQueueProcessor() {
        setInterval(() => {
            this.processQueue();
        }, 1000); // Process every second
    }
    /**
     * Process Notification Queue
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0)
            return;
        this.isProcessing = true;
        try {
            while (this.queue.length > 0) {
                const notification = this.queue.shift();
                if (notification) {
                    await this.sendNotification(notification);
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Send Notification
     */
    async sendNotification(notification) {
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
        }
        catch (error) {
            notification.status = 'failed';
            this.notifications.set(notification.id, notification);
            console.error(`✗ Notification failed: ${notification.id}`, error);
            this.emit('notification-failed', notification);
        }
    }
    /**
     * Mark Notification as Read
     */
    markAsRead(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification)
            return false;
        notification.status = 'read';
        notification.readAt = new Date();
        this.notifications.set(notificationId, notification);
        this.emit('notification-read', notification);
        return true;
    }
    /**
     * Get User Notifications
     */
    getUserNotifications(userId, limit = 50) {
        const userNotifications = Array.from(this.notifications.values())
            .filter(n => n.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
        return userNotifications;
    }
    /**
     * Get Unread Notifications
     */
    getUnreadNotifications(userId) {
        return this.getUserNotifications(userId).filter(n => n.status !== 'read');
    }
    /**
     * Delete Notification
     */
    deleteNotification(notificationId) {
        return this.notifications.delete(notificationId);
    }
    /**
     * Clear User Notifications
     */
    clearUserNotifications(userId, type) {
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
    setUserPreferences(userId, preferences) {
        this.userPreferences.set(userId, {
            ...this.userPreferences.get(userId),
            ...preferences,
        });
        console.log(`✓ Preferences updated for ${userId}`);
    }
    /**
     * Get User Preferences
     */
    getUserPreferences(userId) {
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
    bulkCreate(userIds, type, title, message, priority = 'medium') {
        const notifications = [];
        for (const userId of userIds) {
            const notification = this.createNotification(userId, type, title, message, priority);
            notifications.push(notification);
        }
        return notifications;
    }
    /**
     * Get Notification Statistics
     */
    getStats() {
        const notifications = Array.from(this.notifications.values());
        const byType = notifications.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
        }, {});
        const byStatus = notifications.reduce((acc, n) => {
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
    addTemplate(name, template) {
        this.templates.set(name, template);
        console.log(`✓ Template added: ${name}`);
    }
    /**
     * Generate Notification ID
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.NotificationService = NotificationService;
// Export factory function
function createNotificationService(emailConfig) {
    return new NotificationService(emailConfig);
}
