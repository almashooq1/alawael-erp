// Dynamic AI Provider Selector
// Switches provider/model based on self-evaluation and task type

import { SelfEvaluator } from './self-evaluator';
import { AIProviderConfig } from './ai-provider';

export class ProviderSelector {
  static selectProvider(taskType: string): AIProviderConfig {
    // مثال: إذا كان متوسط التقييم منخفضاً، استخدم مزود آخر
    const avg = SelfEvaluator.averageScore();
    if (avg < 2.5) {
      return { provider: 'openai' };
    } else if (taskType === 'arabic') {
      return { provider: 'deepseek' };
    } else {
      return { provider: 'deepseek' };
    }
  }
}
