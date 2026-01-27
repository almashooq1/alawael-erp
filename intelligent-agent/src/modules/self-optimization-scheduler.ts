// Weekly Self-Evaluation & Provider Optimization Scheduler
import { SelfEvaluator } from './self-evaluator';
import { ProviderSelector } from './provider-selector';
import schedule from 'node-schedule';
import { SmartNotifier } from './smart-notifier';
import { SMSService } from './sms-service';

export function scheduleWeeklySelfOptimization() {
  const smsService = new SMSService();
  const smartNotifier = new SmartNotifier(smsService);
  schedule.scheduleJob('0 2 * * 0', async () => {
    const avg = SelfEvaluator.averageScore();
    const bestProvider = ProviderSelector.selectProvider('auto');
    console.log(`[SelfEval] Weekly average score: ${avg}. Recommended provider:`, bestProvider);
    if (avg < 2.5) {
      await smartNotifier.notifyAll(
        `تنبيه: متوسط تقييم جودة الذكاء الاصطناعي منخفض (${avg.toFixed(2)}). يوصى بمراجعة إعدادات المزود أو تفعيل fine-tuning.`
      );
    }
    // يمكن هنا تفعيل تغيير المزود تلقائياً أو إرسال تنبيه للمسؤول
  });
}
