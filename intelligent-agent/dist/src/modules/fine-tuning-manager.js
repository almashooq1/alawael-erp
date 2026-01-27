"use strict";
// Fine-tuning Scheduler & Trigger
// Schedules and triggers fine-tuning for supported AI providers
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FineTuningManager = void 0;
const interaction_logger_1 = require("./interaction-logger");
const node_schedule_1 = __importDefault(require("node-schedule"));
class FineTuningManager {
    static scheduleFineTuning(cron, provider, config) {
        node_schedule_1.default.scheduleJob(cron, () => FineTuningManager.triggerFineTuning(provider, config));
    }
    static async triggerFineTuning(provider, config) {
        const data = interaction_logger_1.InteractionLogger.getAll();
        // Call provider-specific fine-tuning API with collected data
        // مثال: إرسال البيانات إلى endpoint خاص بالفين-تيون
        // await axios.post(config.fineTuneEndpoint, { data, ...config });
        // سجل العملية
        console.log(`[FineTuning] Triggered for ${provider} with ${data.length} samples.`);
    }
}
exports.FineTuningManager = FineTuningManager;
