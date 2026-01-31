"use strict";
// process.prediction.ts
// قدرات تحليل تنبؤي ذكي للعمليات
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictNextStep = predictNextStep;
exports.predictCompletionTime = predictCompletionTime;
// توقع الخطوة التالية بناءً على بيانات تاريخية (نموذج مبسط)
function predictNextStep(process) {
    // مثال: إذا معظم العمليات السابقة انتهت بـ "إغلاق" بعد "تنفيذ"، اقترح "إغلاق"
    const lastStep = process.steps[process.steps.length - 1]?.name;
    if (lastStep === 'تنفيذ') {
        return 'إغلاق العملية';
    }
    return 'تنفيذ الإجراء التالي';
}
// توقع مدة إكمال العملية (نموذج مبسط)
function predictCompletionTime(process) {
    // مثال: متوسط مدة الخطوات المنجزة × عدد الخطوات المتبقية
    const doneSteps = process.steps.filter(s => s.status === 'done');
    const pendingSteps = process.steps.filter(s => s.status !== 'done');
    if (!doneSteps.length)
        return pendingSteps.length * 2; // فرضية: كل خطوة 2 يوم
    const avg = doneSteps.reduce((acc, s) => acc + 2, 0) / doneSteps.length; // فرضية: كل خطوة منجزة = 2 يوم
    return Math.round(avg * pendingSteps.length);
}
