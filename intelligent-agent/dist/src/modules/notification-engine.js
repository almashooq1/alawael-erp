"use strict";
// Advanced Notification & Escalation Engine
// Centralizes notifications, escalations, and multi-channel delivery
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEngine = void 0;
class NotificationEngine {
    constructor() {
        this.notifications = [];
        this.escalationRules = [];
    }
    sendNotification(data) {
        const n = {
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
    listNotifications(userId) {
        return userId ? this.notifications.filter(n => n.userId === userId) : this.notifications;
    }
    addEscalationRule(rule) {
        const r = { ...rule, id: Math.random().toString(36).slice(2) };
        this.escalationRules.push(r);
        return r;
    }
    listEscalationRules() {
        return this.escalationRules;
    }
    triggerEscalation(trigger) {
        const rules = this.escalationRules.filter(r => r.enabled && r.trigger === trigger);
        const sent = [];
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
exports.NotificationEngine = NotificationEngine;
