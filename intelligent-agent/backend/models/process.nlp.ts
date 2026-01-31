// process.nlp.ts
// معالجة اللغة الطبيعية والفهم الذكي للعمليات

import { Process } from './process.model';

// تحليل النص واستخراج الكلمات الرئيسية
export function extractKeywords(text: string): string[] {
  const stopWords = ['و', 'ال', 'في', 'من', 'إلى', 'أن', 'هو', 'هي', 'تم'];
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(word => !stopWords.includes(word) && word.length > 2);
}

// تحليل مشاعر/أولويات العملية
export function analyzeSentiment(processName: string): 'positive' | 'neutral' | 'negative' {
  const positivWords = ['سريع', 'ممتاز', 'ناجح', 'مهم'];
  const negativeWords = ['بطيء', 'فاشل', 'حرج', 'طوارئ'];

  const name = processName.toLowerCase();
  if (negativeWords.some(word => name.includes(word))) return 'negative';
  if (positivWords.some(word => name.includes(word))) return 'positive';
  return 'neutral';
}

// توليد وصف ذكي للعملية
export function generateProcessSummary(process: Process): string {
  const completed = process.steps.filter(s => s.status === 'done').length;
  const total = process.steps.length;
  const percentage = Math.round((completed / total) * 100);

  return `العملية "${process.name}" جاري تنفيذها بنسبة ${percentage}% (${completed}/${total} خطوات مكتملة). الحالة: ${process.status}`;
}

// استخراج المراحل الحرجة
export function identifyCriticalSteps(process: Process): string[] {
  return process.steps
    .filter(s => s.type === 'approval' || s.type === 'manual')
    .filter(s => s.status !== 'done')
    .map(s => s.name);
}
