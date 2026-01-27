// process.automation.ts
// منطق أتمتة العمليات: تنفيذ الخطوات المؤتمتة، إشعارات، انتقالات تلقائية

import { Process, ProcessStep, Task } from './models/process.model';

// تنفيذ خطوة مؤتمتة (مثال: إرسال إشعار، استدعاء API)
export async function executeAutomatedStep(step: ProcessStep, context: any) {
  switch (step.type) {
    case 'automated':
      // مثال: تنفيذ إجراء حسب نوعه
      if (step.actions) {
        for (const action of step.actions) {
          if (action.type === 'notify') {
            // إرسال إشعار (يمكن ربطه بنظام إشعارات فعلي)
            console.log('Notify:', action.label, context);
          } else if (action.type === 'api_call') {
            // استدعاء API خارجي
            await fetch(action.config.url, { method: action.config.method || 'POST', body: JSON.stringify(context) });
          }
        }
      }
      break;
    default:
      break;
  }
}

// تحديث حالة الخطوة والانتقال للخطوة التالية تلقائياً
export function advanceProcess(process: Process, currentStepId: string): Process {
  const idx = process.steps.findIndex(s => s.id === currentStepId);
  if (idx === -1 || idx === process.steps.length - 1) return process;
  process.steps[idx].status = 'done';
  process.steps[idx + 1].status = 'in_progress';
  return { ...process };
}

// مثال: تنفيذ عملية كاملة بشكل مؤتمت
export async function runAutomatedProcess(process: Process, context: any) {
  for (const step of process.steps) {
    if (step.type === 'automated') {
      await executeAutomatedStep(step, context);
    }
    // تحديث الحالة
    step.status = 'done';
  }
  process.status = 'completed';
  return process;
}
