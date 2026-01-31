import express from 'express';
import { predictNextStep, predictCompletionTime } from '../models/process.prediction';
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

// GET /api/ai/predict-next-step
router.get('/predict-next-step', (req, res) => {
  const prediction = predictNextStep(mockProcess);
  res.json({ prediction });
});

// GET /api/ai/predict-completion-time
router.get('/predict-completion-time', (req, res) => {
  const days = predictCompletionTime(mockProcess);
  res.json({ estimatedDays: days });
});

export default router;
