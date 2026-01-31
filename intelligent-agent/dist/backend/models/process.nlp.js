"use strict";
// process.nlp.ts
// معالجة اللغة الطبيعية والفهم الذكي للعمليات
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractKeywords = extractKeywords;
exports.analyzeSentiment = analyzeSentiment;
exports.generateProcessSummary = generateProcessSummary;
exports.identifyCriticalSteps = identifyCriticalSteps;
// تحليل النص واستخراج الكلمات الرئيسية
function extractKeywords(text) {
    const stopWords = ['و', 'ال', 'في', 'من', 'إلى', 'أن', 'هو', 'هي', 'تم'];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => !stopWords.includes(word) && word.length > 2);
}
// تحليل مشاعر/أولويات العملية
function analyzeSentiment(processName) {
    const positivWords = ['سريع', 'ممتاز', 'ناجح', 'مهم'];
    const negativeWords = ['بطيء', 'فاشل', 'حرج', 'طوارئ'];
    const name = processName.toLowerCase();
    if (negativeWords.some(word => name.includes(word)))
        return 'negative';
    if (positivWords.some(word => name.includes(word)))
        return 'positive';
    return 'neutral';
}
// توليد وصف ذكي للعملية
function generateProcessSummary(process) {
    const completed = process.steps.filter(s => s.status === 'done').length;
    const total = process.steps.length;
    const percentage = Math.round((completed / total) * 100);
    return `العملية "${process.name}" جاري تنفيذها بنسبة ${percentage}% (${completed}/${total} خطوات مكتملة). الحالة: ${process.status}`;
}
// استخراج المراحل الحرجة
function identifyCriticalSteps(process) {
    return process.steps
        .filter(s => s.type === 'approval' || s.type === 'manual')
        .filter(s => s.status !== 'done')
        .map(s => s.name);
}
