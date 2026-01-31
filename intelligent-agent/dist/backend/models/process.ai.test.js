"use strict";
// process.ai.test.ts
// اختبار إمكانيات الذكاء الاصطناعي للعمليات
Object.defineProperty(exports, "__esModule", { value: true });
const process_ai_1 = require("./process.ai");
describe('Process AI', () => {
    it('should suggest next step after approval', () => {
        const process = { steps: [{ type: 'approval', status: 'done' }] };
        expect((0, process_ai_1.suggestNextStep)(process)).toBe('تنفيذ الإجراء');
    });
    it('should analyze process performance', () => {
        const process = { steps: [{ status: 'done' }, { status: 'pending' }] };
        const perf = (0, process_ai_1.analyzeProcessPerformance)(process);
        expect(perf.done).toBe(1);
        expect(perf.pending).toBe(1);
        expect(perf.efficiency).toBe(0.5);
    });
    it('should detect overdue in_progress steps', () => {
        const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const process = { steps: [{ status: 'in_progress', dueDate: oldDate }] };
        const issues = (0, process_ai_1.detectProcessIssues)(process);
        expect(issues.length).toBe(1);
    });
});
