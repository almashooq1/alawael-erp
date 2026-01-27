import { ProviderSelector } from './provider-selector';
import { InteractionLogger } from './interaction-logger';
// وحدة الدردشة الذكية (AI Chat)
// ملاحظة: هذه واجهة أولية ويمكن ربطها بأي مزود ذكاء اصطناعي لاحقًا
import { AIProviderManager, AIProviderConfig } from './ai-provider';

export class AIChat {
  private providerManager: AIProviderManager;

  constructor(config?: AIProviderConfig) {
    // الافتراضي OpenAI إذا لم يحدد
    this.providerManager = new AIProviderManager(config || { provider: 'openai' });
  }

  setProvider(config: AIProviderConfig) {
    this.providerManager = new AIProviderManager(config);
  }

  async chat(message: string, userId?: string, context?: string, taskType?: string, feedback?: number): Promise<string> {
    // اختيار المزود تلقائياً حسب نوع المهمة أو جودة الأداء
    if (taskType) {
      const config = ProviderSelector.selectProvider(taskType);
      this.setProvider(config);
    }
    const output = await this.providerManager.chat(message);
    // سجل التفاعل للتعلم الذاتي مع feedback إن وجد
    InteractionLogger.log({
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
