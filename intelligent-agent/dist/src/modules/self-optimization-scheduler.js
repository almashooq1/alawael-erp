"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleWeeklySelfOptimization = scheduleWeeklySelfOptimization;
// Weekly Self-Evaluation & Provider Optimization Scheduler
const self_evaluator_1 = require("./self-evaluator");
const provider_selector_1 = require("./provider-selector");
const node_schedule_1 = __importDefault(require("node-schedule"));
const smart_notifier_1 = require("./smart-notifier");
const sms_service_1 = require("./sms-service");
function scheduleWeeklySelfOptimization() {
    const smsService = new sms_service_1.SMSService();
    const smartNotifier = new smart_notifier_1.SmartNotifier(smsService);
    node_schedule_1.default.scheduleJob('0 2 * * 0', async () => {
        const avg = self_evaluator_1.SelfEvaluator.averageScore();
        const bestProvider = provider_selector_1.ProviderSelector.selectProvider('auto');
        console.log(`[SelfEval] Weekly average score: ${avg}. Recommended provider:`, bestProvider);
        if (avg < 2.5) {
            await smartNotifier.notifyAll(`تنبيه: متوسط تقييم جودة الذكاء الاصطناعي منخفض (${avg.toFixed(2)}). يوصى بمراجعة إعدادات المزود أو تفعيل fine-tuning.`);
        }
        // يمكن هنا تفعيل تغيير المزود تلقائياً أو إرسال تنبيه للمسؤول
    });
}
