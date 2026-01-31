import express from 'express';
import { suggestNextStep, analyzeProcessPerformance, detectProcessIssues } from '../models/process.ai';
import { Process } from '../models/process.model';

const router = express.Router();

// Mock: Replace with real DB fetch
const mockProcess: Process = {
  name: 'عملية تجريبية',
  status: 'active',
  steps: [
    { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
    { id: '2', name: 'موافقة', type: 'approval', status: 'done' },
    { id: '3', name: 'تنفيذ', type: 'automated', status: 'in_progress', dueDate: new Date(Date.now() - 3*24*60*60*1000).toISOString() }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// GET /api/ai/suggest-next-step
router.get('/suggest-next-step', (req, res) => {
  const suggestion = suggestNextStep(mockProcess);
  res.json({ suggestion });
});

// GET /api/ai/analyze-performance
router.get('/analyze-performance', (req, res) => {
  const analysis = analyzeProcessPerformance(mockProcess);
  res.json(analysis);
});

// GET /api/ai/detect-issues
router.get('/detect-issues', (req, res) => {
  const issues = detectProcessIssues(mockProcess);
  res.json({ issues });
});

export default router;
