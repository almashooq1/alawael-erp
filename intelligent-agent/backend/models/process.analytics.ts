// process.analytics.ts
// وحدة تحليلات العمليات والتوصيات الذكية

import { Process } from './process.model';

export function getProcessStats(processes: Process[]) {
  return {
    total: processes.length,
    completed: processes.filter(p=>p.status==='completed').length,
    avgSteps: processes.length ? processes.reduce((a,p)=>a+p.steps.length,0)/processes.length : 0
  };
}

export function getFrequentDelays(processes: Process[]) {
  // تحليل الخطوات المتأخرة المتكررة
  const delays: Record<string, number> = {};
  processes.forEach(p => p.steps.forEach(s => {
    if (s.status !== 'done' && s.dueDate && new Date(s.dueDate) < new Date()) {
      delays[s.name] = (delays[s.name]||0)+1;
    }
  }));
  return delays;
}

export function recommendImprovements(processes: Process[]) {
  // اقتراحات ذكية بناءً على الأنماط
  const delays = getFrequentDelays(processes);
  return Object.entries(delays).filter(([_,c])=>c>2).map(([name])=>`ينصح بتسريع خطوة: ${name}`);
}
