"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_ml_1 = require("../models/process.ml");
const router = express_1.default.Router();
// Mock: Replace with real DB fetch
const mockProcess = {
    name: 'عملية تجريبية متقدمة',
    status: 'active',
    steps: [
        { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
        { id: '2', name: 'موافقة', type: 'approval', status: 'done' },
        { id: '3', name: 'تنفيذ', type: 'automated', status: 'in_progress', dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '4', name: 'اختبار', type: 'manual', status: 'pending', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '5', name: 'إغلاق', type: 'automated', status: 'pending' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};
// GET /api/ai/risk-classification
router.get('/risk-classification', (req, res) => {
    const riskLevel = (0, process_ml_1.classifyProcessRisk)(mockProcess);
    res.json({ riskLevel });
});
// GET /api/ai/delay-probability
router.get('/delay-probability', (req, res) => {
    const probability = (0, process_ml_1.predictDelayProbability)(mockProcess);
    res.json({ delayProbability: (probability * 100).toFixed(2) + '%' });
});
// GET /api/ai/recommendation
router.get('/recommendation', (req, res) => {
    const recommendation = (0, process_ml_1.generateAIRecommendation)(mockProcess);
    res.json({ recommendation });
});
// GET /api/ai/full-analysis
router.get('/full-analysis', (req, res) => {
    const analysis = {
        processName: mockProcess.name,
        riskLevel: (0, process_ml_1.classifyProcessRisk)(mockProcess),
        delayProbability: ((0, process_ml_1.predictDelayProbability)(mockProcess) * 100).toFixed(2) + '%',
        recommendation: (0, process_ml_1.generateAIRecommendation)(mockProcess),
        totalSteps: mockProcess.steps.length,
        completedSteps: mockProcess.steps.filter(s => s.status === 'done').length,
        inProgressSteps: mockProcess.steps.filter(s => s.status === 'in_progress').length,
        pendingSteps: mockProcess.steps.filter(s => s.status === 'pending').length
    };
    res.json(analysis);
});
exports.default = router;
