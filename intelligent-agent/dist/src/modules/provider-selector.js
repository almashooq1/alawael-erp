"use strict";
// Dynamic AI Provider Selector
// Switches provider/model based on self-evaluation and task type
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderSelector = void 0;
const self_evaluator_1 = require("./self-evaluator");
class ProviderSelector {
    static selectProvider(taskType) {
        // مثال: إذا كان متوسط التقييم منخفضاً، استخدم مزود آخر
        const avg = self_evaluator_1.SelfEvaluator.averageScore();
        if (avg < 2.5) {
            return { provider: 'openai' };
        }
        else if (taskType === 'arabic') {
            return { provider: 'deepseek' };
        }
        else {
            return { provider: 'deepseek' };
        }
    }
}
exports.ProviderSelector = ProviderSelector;
