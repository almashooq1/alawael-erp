"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifierAdvanced = void 0;
// إشعارات متقدمة (Slack/Email)
const axios_1 = __importDefault(require("axios"));
const secrets_1 = require("./secrets");
class NotifierAdvanced {
    async slack(message) {
        const webhook = secrets_1.Secrets.get('SLACK_WEBHOOK_URL');
        if (webhook) {
            await axios_1.default.post(webhook, { text: message });
        }
    }
    async email(to, subject, body) {
        // يمكن ربط وحدة البريد الحالية هنا
        // مثال: await emailService.send(to, subject, body);
        console.log(`[EMAIL] to: ${to} | subject: ${subject}`);
    }
}
exports.NotifierAdvanced = NotifierAdvanced;
