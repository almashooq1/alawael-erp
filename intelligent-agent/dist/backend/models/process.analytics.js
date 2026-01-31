"use strict";
// process.analytics.ts
// وحدة تحليلات العمليات والتوصيات الذكية
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessStats = getProcessStats;
exports.getFrequentDelays = getFrequentDelays;
exports.recommendImprovements = recommendImprovements;
function getProcessStats(processes) {
    return {
        total: processes.length,
        completed: processes.filter(p => p.status === 'completed').length,
        avgSteps: processes.length ? processes.reduce((a, p) => a + p.steps.length, 0) / processes.length : 0
    };
}
function getFrequentDelays(processes) {
    // تحليل الخطوات المتأخرة المتكررة
    const delays = {};
    processes.forEach(p => p.steps.forEach(s => {
        if (s.status !== 'done' && s.dueDate && new Date(s.dueDate) < new Date()) {
            delays[s.name] = (delays[s.name] || 0) + 1;
        }
    }));
    return delays;
}
function recommendImprovements(processes) {
    // اقتراحات ذكية بناءً على الأنماط
    const delays = getFrequentDelays(processes);
    return Object.entries(delays).filter(([_, c]) => c > 2).map(([name]) => `ينصح بتسريع خطوة: ${name}`);
}
