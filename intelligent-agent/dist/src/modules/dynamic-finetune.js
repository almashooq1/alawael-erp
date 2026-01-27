"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDynamicFineTuning = scheduleDynamicFineTuning;
const fine_tuning_manager_1 = require("./fine-tuning-manager");
const interaction_logger_1 = require("./interaction-logger");
// جدولة Fine-tuning ديناميكية حسب الأداء
async function scheduleDynamicFineTuning() {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const feedbacks = weekLogs.map(l => l.feedback).filter(f => typeof f === 'number');
    const avg = feedbacks.length ? feedbacks.reduce((a, b) => a + b, 0) / feedbacks.length : 0;
    // إذا كان متوسط التقييم أقل من 3، فعّل Fine-tuning إضافي
    if (avg > 0 && avg < 3) {
        await fine_tuning_manager_1.FineTuningManager.scheduleFineTuning('0 9 * * 0', 'openai', { fineTuneEndpoint: process.env.OPENAI_FINE_TUNE_ENDPOINT });
        await fine_tuning_manager_1.FineTuningManager.scheduleFineTuning('0 10 * * 0', 'deepseek', { fineTuneEndpoint: process.env.DEEPSEEK_FINE_TUNE_ENDPOINT });
    }
}
