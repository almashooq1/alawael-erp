import express from 'express';
import { InteractionLogger } from '../src/modules/interaction-logger';
import { exportReportPDF, exportReportExcel } from './exporters';

const router = express.Router();

// تصدير PDF
router.get('/export/pdf', (req, res) => {
  const logs = InteractionLogger.getAll();
  const total = logs.length;
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
  const topQuestions = Object.entries(
    weekLogs.reduce((acc, l) => {
      const q = (l.input || '').trim();
      if (q) acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
  exportReportPDF(res, { total, weekCount: weekLogs.length, topQuestions, errorCount });
});

// تصدير Excel
router.get('/export/excel', (req, res) => {
  const logs = InteractionLogger.getAll();
  const total = logs.length;
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
  const topQuestions = Object.entries(
    weekLogs.reduce((acc, l) => {
      const q = (l.input || '').trim();
      if (q) acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
  exportReportExcel(res, { total, weekCount: weekLogs.length, topQuestions, errorCount });
});
// API: إحصائيات عامة
router.get('/stats', (req, res) => {
  const logs = InteractionLogger.getAll();
  const total = logs.length;
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
  const topQuestions = Object.entries(
    weekLogs.reduce((acc, l) => {
      const q = (l.input || '').trim();
      if (q) acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
  const feedbacks = weekLogs.map(l => l.feedback).filter(f => typeof f === 'number');
  res.json({
    total,
    weekCount: weekLogs.length,
    topQuestions,
    errorCount,
    feedbackStats: feedbacks.length ? {
      max: Math.max(...feedbacks),
      min: Math.min(...feedbacks),
      all: feedbacks
    } : null
  });
});

export default router;
