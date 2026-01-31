import express from 'express';
import {
  suggestAutomationOpportunities,
  calculateAutomationBenefit,
  generateSmartTaskList,
  generateAutomationReport
} from '../models/process.automation';
import { Process } from '../models/process.model';

const router = express.Router();

// Mock data
const mockProcess: Process = {
  name: 'عملية مع فرص أتمتة',
  status: 'active',
  steps: [
    { id: '1', name: 'تحديث البيانات', type: 'manual', status: 'done' },
    { id: '2', name: 'مراجعة تقرير', type: 'manual', status: 'done' },
    { id: '3', name: 'موافقة', type: 'approval', status: 'in_progress', dueDate: new Date(Date.now() + 2*24*60*60*1000).toISOString() },
    { id: '4', name: 'تنفيذ', type: 'automated', status: 'pending' },
    { id: '5', name: 'إرسال إشعارات', type: 'automated', status: 'pending' }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// GET /api/ai/automation-opportunities
router.get('/automation-opportunities', (req, res) => {
  const opportunities = suggestAutomationOpportunities(mockProcess);
  res.json({ opportunities, count: opportunities.length });
});

// GET /api/ai/automation-benefit
router.get('/automation-benefit', (req, res) => {
  const benefit = calculateAutomationBenefit(mockProcess);
  res.json(benefit);
});

// GET /api/ai/smart-tasks
router.get('/smart-tasks', (req, res) => {
  const tasks = generateSmartTaskList(mockProcess);
  res.json({ tasks, totalTasks: tasks.length });
});

// GET /api/ai/automation-report
router.get('/automation-report', (req, res) => {
  const report = generateAutomationReport(mockProcess);
  res.json(report);
});

// GET /api/ai/full-automation-analysis
router.get('/full-automation-analysis', (req, res) => {
  const analysis = {
    process: mockProcess.name,
    opportunities: suggestAutomationOpportunities(mockProcess),
    benefit: calculateAutomationBenefit(mockProcess),
    smartTasks: generateSmartTaskList(mockProcess),
    automationReport: generateAutomationReport(mockProcess),
    totalSteps: mockProcess.steps.length,
    manualSteps: mockProcess.steps.filter(s => s.type === 'manual').length,
    automatedSteps: mockProcess.steps.filter(s => s.type === 'automated').length
  };
  res.json(analysis);
});

export default router;
