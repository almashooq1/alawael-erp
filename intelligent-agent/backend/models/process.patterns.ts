// process.patterns.ts
// التعرف على الأنماط والسلوكيات المتكررة في العمليات

import { Process } from './process.model';

// التعرف على أنماط العمليات (مثل التأخير المتكرر، الخطوات الحرجة)
export function detectProcessPatterns(processHistory: Process[]): {
  frequentDelays: string[];
  bottlenecks: string[];
  successfulSequences: string[];
} {
  const patterns = {
    frequentDelays: [] as string[],
    bottlenecks: [] as string[],
    successfulSequences: [] as string[]
  };

  // تتبع الخطوات المتأخرة
  const stepDelayCount: { [key: string]: number } = {};

  for (const process of processHistory) {
    for (const step of process.steps) {
      if (step.dueDate && new Date().getTime() > new Date(step.dueDate).getTime()) {
        stepDelayCount[step.name] = (stepDelayCount[step.name] || 0) + 1;
      }
    }
  }

  // استخراج الخطوات المتأخرة المتكررة
  patterns.frequentDelays = Object.entries(stepDelayCount)
    .filter(([_, count]) => count >= 2)
    .map(([name]) => name);

  // تحديد الاختناقات (الخطوات البطيئة)
  for (const process of processHistory) {
    for (const step of process.steps) {
      if (step.status === 'in_progress' && step.type === 'manual') {
        patterns.bottlenecks.push(step.name);
      }
    }
  }
  patterns.bottlenecks = [...new Set(patterns.bottlenecks)];

  return patterns;
}

// استخراج الترتيبات الناجحة للخطوات
export function identifySuccessfulSequences(processHistory: Process[]): string[][] {
  const sequences: string[][] = [];

  for (const process of processHistory) {
    if (process.status === 'completed') {
      const sequence = process.steps.map(s => s.name);
      sequences.push(sequence);
    }
  }

  return sequences;
}

// توقع مدة العملية بناءً على الأنماط التاريخية
export function predictProcessDurationFromPatterns(
  current: Process,
  history: Process[]
): number {
  if (!history.length) return 7; // قيمة افتراضية: 7 أيام

  const completedProcesses = history.filter(p => p.status === 'completed');
  if (!completedProcesses.length) return 7;

  // حساب متوسط المدة
  let totalDuration = 0;
  for (const process of completedProcesses) {
    const startDate = new Date(process.createdAt).getTime();
    const endDate = new Date(process.updatedAt).getTime();
    const duration = (endDate - startDate) / (1000 * 60 * 60 * 24);
    totalDuration += duration;
  }

  return Math.round(totalDuration / completedProcesses.length);
}

// تحليل تأثير الخطوات على الأداء العام
export function analyzeStepImpact(processHistory: Process[]): {
  stepName: string;
  impactScore: number;
}[] {
  const stepImpact: { [key: string]: number } = {};

  for (const process of processHistory) {
    for (const step of process.steps) {
      if (!stepImpact[step.name]) {
        stepImpact[step.name] = 0;
      }

      // زيادة الدرجة إذا كانت الخطوة تسبب تأخيراً
      if (step.dueDate && step.status !== 'done') {
        const delay = Math.max(0, new Date().getTime() - new Date(step.dueDate).getTime());
        stepImpact[step.name] += delay / (1000 * 60 * 60);
      }
    }
  }

  return Object.entries(stepImpact)
    .map(([name, score]) => ({ stepName: name, impactScore: Math.round(score) }))
    .sort((a, b) => b.impactScore - a.impactScore);
}
