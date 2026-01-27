// process.ai.ts
// إمكانيات الذكاء الاصطناعي: اقتراح خطوات، تحليل الأداء، كشف الأعطال

import { Process, Task } from './process.model';

// اقتراح خطوة جديدة بناءً على العمليات السابقة
export function suggestNextStep(process: Process): string {
  // مثال بسيط: إذا آخر خطوة "موافقة"، اقترح "تنفيذ"
  if (process.steps.length && process.steps[process.steps.length-1].type === 'approval') {
    return 'تنفيذ الإجراء';
  }
  return 'مراجعة';
}

// تحليل أداء العملية (زمن التنفيذ، الاختناقات)
export function analyzeProcessPerformance(process: Process) {
  // مثال: حساب عدد الخطوات المنجزة والمتعثرة
  const done = process.steps.filter(s => s.status === 'done').length;
  const pending = process.steps.filter(s => s.status !== 'done').length;
  return {
    done,
    pending,
    efficiency: done / (done + pending)
  };
}

// كشف الأعطال أو التأخير
export function detectProcessIssues(process: Process) {
  // مثال: إذا هناك خطوة "in_progress" منذ أكثر من يومين
  const now = Date.now();
  const issues = process.steps.filter(s => s.status === 'in_progress' && s.dueDate && (now - new Date(s.dueDate).getTime()) > 2*24*60*60*1000);
  return issues;
}
