"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartNotifier = exports.Notifier = void 0;
const sms_service_1 = require("./sms-service");
const smart_notifier_1 = require("./smart-notifier");
// Legacy Notifier for backward compatibility
class Notifier {
    constructor(log) {
        this.log = log;
    }
    async notify(message) {
        this.log.info(`[NOTIFY] ${message}`);
    }
}
exports.Notifier = Notifier;
// SmartNotifier instance for multi-channel alerts
const config_1 = __importDefault(require("./config"));
const smsService = new sms_service_1.SMSService();
exports.smartNotifier = new smart_notifier_1.SmartNotifier(smsService, config_1.default.SLACK_WEBHOOK_URL, config_1.default.TELEGRAM_BOT_TOKEN, config_1.default.TELEGRAM_CHAT_ID);
