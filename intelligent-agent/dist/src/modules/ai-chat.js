"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChat = void 0;
const provider_selector_1 = require("./provider-selector");
const interaction_logger_1 = require("./interaction-logger");
// وحدة الدردشة الذكية (AI Chat)
// ملاحظة: هذه واجهة أولية ويمكن ربطها بأي مزود ذكاء اصطناعي لاحقًا
const ai_provider_1 = require("./ai-provider");
class AIChat {
    constructor(config) {
        // الافتراضي OpenAI إذا لم يحدد
        this.providerManager = new ai_provider_1.AIProviderManager(config || { provider: 'openai' });
    }
    setProvider(config) {
        this.providerManager = new ai_provider_1.AIProviderManager(config);
    }
    async chat(message, userId, context, taskType, feedback) {
        // اختيار المزود تلقائياً حسب نوع المهمة أو جودة الأداء
        if (taskType) {
            const config = provider_selector_1.ProviderSelector.selectProvider(taskType);
            this.setProvider(config);
        }
        const output = await this.providerManager.chat(message);
        // سجل التفاعل للتعلم الذاتي مع feedback إن وجد
        interaction_logger_1.InteractionLogger.log({
            timestamp: new Date().toISOString(),
            userId,
            input: message,
            output,
            context,
            feedback
        });
        return output;
    }
}
exports.AIChat = AIChat;
