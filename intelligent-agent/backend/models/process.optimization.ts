// process.optimization.ts
// تحسينات الأداء والذكاء الاصطناعي المتقدمة

import { Process } from './process.model';

// حساب نقاط الأداء العام للعملية
export function calculateProcessScore(process: Process): number {
  const completedSteps = process.steps.filter(s => s.status === 'done').length;
  const completionRate = (completedSteps / process.steps.length) * 100;

  // نقاط بناءً على نسبة الإنجاز
  let score = completionRate;

  // تطبيق خصم للتأخيرات
  const delayedSteps = process.steps.filter(s => {
    if (!s.dueDate || s.status === 'done') return false;
    return new Date().getTime() > new Date(s.dueDate).getTime();
  }).length;

  score -= (delayedSteps * 10);

  return Math.max(0, Math.min(100, score));
}

// اقتراح أفضل ترتيب للخطوات التالية
export function optimizeStepSequence(process: Process): string[] {
  // فرز الخطوات المتبقية حسب الأولوية (الموافقات أولاً)
  const pendingSteps = process.steps
    .filter(s => s.status === 'pending')
    .sort((a, b) => {
      if (a.type === 'approval' && b.type !== 'approval') return -1;
      if (a.type !== 'approval' && b.type === 'approval') return 1;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });

  return pendingSteps.map(s => s.name);
}

// توقع تكاليف التأخير المحتملة
export function estimateDelayCost(process: Process): { days: number; impactLevel: string } {
  let maxDelay = 0;
  let delayedCount = 0;

  for (const step of process.steps) {
    if (step.dueDate && step.status !== 'done') {
      const dueTime = new Date(step.dueDate).getTime();
      const delay = Math.max(0, (Date.now() - dueTime) / (1000 * 60 * 60 * 24));
      maxDelay = Math.max(maxDelay, delay);
      if (delay > 0) delayedCount++;
    }
  }

  let impact = 'منخفضة';
  if (delayedCount > 2) impact = 'عالية';
  else if (delayedCount > 0) impact = 'متوسطة';

  return { days: Math.round(maxDelay), impactLevel: impact };
}

// تحليل اتجاهات الأداء
export function analyzePerformanceTrend(processHistory: Process[]): string {
  if (processHistory.length < 2) return 'البيانات غير كافية للتحليل';

  const recent = calculateProcessScore(processHistory[processHistory.length - 1]);
  const previous = calculateProcessScore(processHistory[processHistory.length - 2]);

  const trend = recent - previous;

  if (trend > 10) return 'تحسن ملحوظ في الأداء';
  if (trend > 0) return 'تحسن طفيف في الأداء';
  if (trend < -10) return 'تراجع ملحوظ في الأداء';
  if (trend < 0) return 'تراجع طفيف في الأداء';
  return 'الأداء مستقر';
}
