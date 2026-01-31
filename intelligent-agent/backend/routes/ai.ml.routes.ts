import express from 'express';
import { classifyProcessRisk, predictDelayProbability, generateAIRecommendation } from '../models/process.ml';
import { Process } from '../models/process.model';

const router = express.Router();

// Mock: Replace with real DB fetch
const mockProcess: Process = {
  name: 'عملية تجريبية متقدمة',
  status: 'active',
  steps: [
    { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
    { id: '2', name: 'موافقة', type: 'approval', status: 'done' },
    { id: '3', name: 'تنفيذ', type: 'automated', status: 'in_progress', dueDate: new Date(Date.now() - 3*24*60*60*1000).toISOString() },
    { id: '4', name: 'اختبار', type: 'manual', status: 'pending', dueDate: new Date(Date.now() + 2*24*60*60*1000).toISOString() },
    { id: '5', name: 'إغلاق', type: 'automated', status: 'pending' }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// GET /api/ai/risk-classification
router.get('/risk-classification', (req, res) => {
  const riskLevel = classifyProcessRisk(mockProcess);
  res.json({ riskLevel });
});

// GET /api/ai/delay-probability
router.get('/delay-probability', (req, res) => {
  const probability = predictDelayProbability(mockProcess);
  res.json({ delayProbability: (probability * 100).toFixed(2) + '%' });
});

// GET /api/ai/recommendation
router.get('/recommendation', (req, res) => {
  const recommendation = generateAIRecommendation(mockProcess);
  res.json({ recommendation });
});

// GET /api/ai/full-analysis
router.get('/full-analysis', (req, res) => {
  const analysis = {
    processName: mockProcess.name,
    riskLevel: classifyProcessRisk(mockProcess),
    delayProbability: (predictDelayProbability(mockProcess) * 100).toFixed(2) + '%',
    recommendation: generateAIRecommendation(mockProcess),
    totalSteps: mockProcess.steps.length,
    completedSteps: mockProcess.steps.filter(s => s.status === 'done').length,
    inProgressSteps: mockProcess.steps.filter(s => s.status === 'in_progress').length,
    pendingSteps: mockProcess.steps.filter(s => s.status === 'pending').length
  };
  res.json(analysis);
});

export default router;
