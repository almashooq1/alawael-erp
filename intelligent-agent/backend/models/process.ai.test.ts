// process.ai.test.ts
// اختبار إمكانيات الذكاء الاصطناعي للعمليات

import { suggestNextStep, analyzeProcessPerformance, detectProcessIssues } from './process.ai';

describe('Process AI', () => {
  it('should suggest next step after approval', () => {
    const process = { steps: [{ type: 'approval', status: 'done' }] } as any;
    expect(suggestNextStep(process)).toBe('تنفيذ الإجراء');
  });

  it('should analyze process performance', () => {
    const process = { steps: [ { status: 'done' }, { status: 'pending' } ] } as any;
    const perf = analyzeProcessPerformance(process);
    expect(perf.done).toBe(1);
    expect(perf.pending).toBe(1);
    expect(perf.efficiency).toBe(0.5);
  });

  it('should detect overdue in_progress steps', () => {
    const oldDate = new Date(Date.now() - 3*24*60*60*1000).toISOString();
    const process = { steps: [ { status: 'in_progress', dueDate: oldDate } ] } as any;
    const issues = detectProcessIssues(process);
    expect(issues.length).toBe(1);
  });
});
