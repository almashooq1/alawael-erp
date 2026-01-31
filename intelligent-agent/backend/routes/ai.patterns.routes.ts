import express from 'express';
import { detectProcessPatterns, identifySuccessfulSequences, predictProcessDurationFromPatterns, analyzeStepImpact } from '../models/process.patterns';
import { Process } from '../models/process.model';

const router = express.Router();

// Mock data
const mockProcessHistory: Process[] = [
  {
    name: 'عملية أولى',
    status: 'completed',
    steps: [
      { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
      { id: '2', name: 'موافقة', type: 'approval', status: 'done' },
      { id: '3', name: 'تنفيذ', type: 'automated', status: 'done' },
      { id: '4', name: 'إغلاق', type: 'automated', status: 'done' }
    ],
    createdAt: new Date(Date.now() - 20*24*60*60*1000).toISOString(),
    updatedAt: new Date(Date.now() - 15*24*60*60*1000).toISOString()
  },
  {
    name: 'عملية ثانية',
    status: 'completed',
    steps: [
      { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
      { id: '2', name: 'موافقة', type: 'approval', status: 'done', dueDate: new Date(Date.now() - 2*24*60*60*1000).toISOString() },
      { id: '3', name: 'تنفيذ', type: 'automated', status: 'done' },
      { id: '4', name: 'إغلاق', type: 'automated', status: 'done' }
    ],
    createdAt: new Date(Date.now() - 10*24*60*60*1000).toISOString(),
    updatedAt: new Date(Date.now() - 5*24*60*60*1000).toISOString()
  }
];

// GET /api/ai/detect-patterns
router.get('/detect-patterns', (req, res) => {
  const patterns = detectProcessPatterns(mockProcessHistory);
  res.json(patterns);
});

// GET /api/ai/successful-sequences
router.get('/successful-sequences', (req, res) => {
  const sequences = identifySuccessfulSequences(mockProcessHistory);
  res.json({ sequences, count: sequences.length });
});

// GET /api/ai/predict-duration
router.get('/predict-duration', (req, res) => {
  const currentProcess: Process = {
    name: 'عملية جديدة',
    status: 'active',
    steps: [
      { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
      { id: '2', name: 'موافقة', type: 'approval', status: 'in_progress' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const predictedDays = predictProcessDurationFromPatterns(currentProcess, mockProcessHistory);
  res.json({
    predictedDays,
    estimatedCompletionDate: new Date(Date.now() + predictedDays * 24*60*60*1000).toISOString()
  });
});

// GET /api/ai/step-impact
router.get('/step-impact', (req, res) => {
  const impact = analyzeStepImpact(mockProcessHistory);
  res.json({ stepImpact: impact, topBottleneck: impact[0] });
});

// GET /api/ai/patterns-analysis
router.get('/patterns-analysis', (req, res) => {
  const analysis = {
    patterns: detectProcessPatterns(mockProcessHistory),
    successfulSequences: identifySuccessfulSequences(mockProcessHistory),
    stepImpact: analyzeStepImpact(mockProcessHistory),
    averageDuration: predictProcessDurationFromPatterns({
      name: '',
      status: 'active',
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, mockProcessHistory),
    totalProcessesAnalyzed: mockProcessHistory.length
  };
  res.json(analysis);
});

export default router;
