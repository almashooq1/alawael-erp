import express from 'express';
import { extractKeywords, analyzeSentiment, generateProcessSummary, identifyCriticalSteps } from '../models/process.nlp';
import { Process } from '../models/process.model';

const router = express.Router();

// Mock: Replace with real DB fetch
const mockProcess: Process = {
  name: 'عملية تنفيذ سريعة ومهمة',
  status: 'active',
  steps: [
    { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
    { id: '2', name: 'موافقة رسمية', type: 'approval', status: 'done' },
    { id: '3', name: 'تنفيذ الخطوة الأساسية', type: 'automated', status: 'in_progress' },
    { id: '4', name: 'اختبار الجودة', type: 'manual', status: 'pending' },
    { id: '5', name: 'الموافقة النهائية', type: 'approval', status: 'pending' },
    { id: '6', name: 'إغلاق وتوثيق', type: 'automated', status: 'pending' }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// GET /api/ai/extract-keywords
router.get('/extract-keywords', (req, res) => {
  const keywords = extractKeywords(mockProcess.name);
  res.json({ keywords });
});

// GET /api/ai/analyze-sentiment
router.get('/analyze-sentiment', (req, res) => {
  const sentiment = analyzeSentiment(mockProcess.name);
  res.json({ sentiment, processName: mockProcess.name });
});

// GET /api/ai/process-summary
router.get('/process-summary', (req, res) => {
  const summary = generateProcessSummary(mockProcess);
  res.json({ summary });
});

// GET /api/ai/critical-steps
router.get('/critical-steps', (req, res) => {
  const criticalSteps = identifyCriticalSteps(mockProcess);
  res.json({ criticalSteps, count: criticalSteps.length });
});

// GET /api/ai/nlp-analysis
router.get('/nlp-analysis', (req, res) => {
  const analysis = {
    processName: mockProcess.name,
    keywords: extractKeywords(mockProcess.name),
    sentiment: analyzeSentiment(mockProcess.name),
    summary: generateProcessSummary(mockProcess),
    criticalSteps: identifyCriticalSteps(mockProcess),
    totalSteps: mockProcess.steps.length
  };
  res.json(analysis);
});

export default router;
