"use strict";
// وحدة إعدادات النظام (Config)
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    get(key, def) {
        return process.env[key] || def;
    },
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
exports.default = config;
