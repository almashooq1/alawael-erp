"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_automation_1 = require("../models/process.automation");
const router = express_1.default.Router();
// Mock data
const mockProcess = {
    name: 'عملية مع فرص أتمتة',
    status: 'active',
    steps: [
        { id: '1', name: 'تحديث البيانات', type: 'manual', status: 'done' },
        { id: '2', name: 'مراجعة تقرير', type: 'manual', status: 'done' },
        { id: '3', name: 'موافقة', type: 'approval', status: 'in_progress', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '4', name: 'تنفيذ', type: 'automated', status: 'pending' },
        { id: '5', name: 'إرسال إشعارات', type: 'automated', status: 'pending' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};
// GET /api/ai/automation-opportunities
router.get('/automation-opportunities', (req, res) => {
    const opportunities = (0, process_automation_1.suggestAutomationOpportunities)(mockProcess);
    res.json({ opportunities, count: opportunities.length });
});
// GET /api/ai/automation-benefit
router.get('/automation-benefit', (req, res) => {
    const benefit = (0, process_automation_1.calculateAutomationBenefit)(mockProcess);
    res.json(benefit);
});
// GET /api/ai/smart-tasks
router.get('/smart-tasks', (req, res) => {
    const tasks = (0, process_automation_1.generateSmartTaskList)(mockProcess);
    res.json({ tasks, totalTasks: tasks.length });
});
// GET /api/ai/automation-report
router.get('/automation-report', (req, res) => {
    const report = (0, process_automation_1.generateAutomationReport)(mockProcess);
    res.json(report);
});
// GET /api/ai/full-automation-analysis
router.get('/full-automation-analysis', (req, res) => {
    const analysis = {
        process: mockProcess.name,
        opportunities: (0, process_automation_1.suggestAutomationOpportunities)(mockProcess),
        benefit: (0, process_automation_1.calculateAutomationBenefit)(mockProcess),
        smartTasks: (0, process_automation_1.generateSmartTaskList)(mockProcess),
        automationReport: (0, process_automation_1.generateAutomationReport)(mockProcess),
        totalSteps: mockProcess.steps.length,
        manualSteps: mockProcess.steps.filter(s => s.type === 'manual').length,
        automatedSteps: mockProcess.steps.filter(s => s.type === 'automated').length
    };
    res.json(analysis);
});
exports.default = router;
