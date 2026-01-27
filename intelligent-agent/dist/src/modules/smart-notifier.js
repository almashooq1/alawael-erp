"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartNotifier = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class SmartNotifier {
    constructor(sms, slackWebhookUrl, telegramBotToken, telegramChatId) {
        this.notifications = [];
        this.sms = sms;
        this.slackWebhookUrl = slackWebhookUrl;
        this.telegramBotToken = telegramBotToken;
        this.telegramChatId = telegramChatId;
    }
    sendNotification({ userId, message, channel }) {
        // For demo: just log and send SMS
        console.log(`[NOTIFY][${channel}] To: ${userId} - ${message}`);
        if (channel === 'sms') {
            this.sms.send(userId, message);
        }
        // Add email/push logic as needed
        const notif = {
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
    async notifyAll(message) {
        // Console
        console.log('[NOTIFY]', message);
        // SMS
        await this.sms.send(process.env.ALERT_PHONE || '', message);
        // Slack
        if (this.slackWebhookUrl) {
            await (0, node_fetch_1.default)(this.slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message })
            });
        }
        // Telegram
        if (this.telegramBotToken && this.telegramChatId) {
            await (0, node_fetch_1.default)(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: this.telegramChatId, text: message })
            });
        }
    }
    listNotifications(userId) {
        if (userId)
            return this.notifications.filter(n => n.userId === userId);
        return this.notifications;
    }
    getNotification(id) {
        return this.notifications.find(n => n.id === id);
    }
}
exports.SmartNotifier = SmartNotifier;
