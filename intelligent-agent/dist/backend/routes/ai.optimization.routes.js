"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_optimization_1 = require("../models/process.optimization");
const router = express_1.default.Router();
// Mock data
const mockProcess = {
    name: 'عملية تحسين الأداء',
    status: 'active',
    steps: [
        { id: '1', name: 'التخطيط', type: 'manual', status: 'done', dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '2', name: 'الموافقة', type: 'approval', status: 'in_progress', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '3', name: 'التنفيذ', type: 'automated', status: 'pending', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '4', name: 'المراجعة', type: 'manual', status: 'pending' },
        { id: '5', name: 'الإغلاق', type: 'automated', status: 'pending' }
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
};
const mockProcessHistory = [
    { ...mockProcess, name: 'عملية سابقة 1', steps: mockProcess.steps.slice(0, 2) },
    { ...mockProcess, name: 'عملية سابقة 2', steps: mockProcess.steps.slice(0, 3) },
    mockProcess
];
// GET /api/ai/process-score
router.get('/process-score', (req, res) => {
    const score = (0, process_optimization_1.calculateProcessScore)(mockProcess);
    res.json({
        score: score.toFixed(2),
        percentage: score.toFixed(0) + '%',
        status: score >= 80 ? 'ممتاز' : score >= 60 ? 'جيد' : 'يحتاج تحسين'
    });
});
// GET /api/ai/optimize-sequence
router.get('/optimize-sequence', (req, res) => {
    const optimized = (0, process_optimization_1.optimizeStepSequence)(mockProcess);
    res.json({ recommendedSequence: optimized, count: optimized.length });
});
// GET /api/ai/delay-cost
router.get('/delay-cost', (req, res) => {
    const cost = (0, process_optimization_1.estimateDelayCost)(mockProcess);
    res.json({
        maxDelayDays: cost.days,
        impactLevel: cost.impactLevel,
        recommendation: cost.days > 0 ? 'اتخاذ إجراءات فورية' : 'على المسار الصحيح'
    });
});
// GET /api/ai/performance-trend
router.get('/performance-trend', (req, res) => {
    const trend = (0, process_optimization_1.analyzePerformanceTrend)(mockProcessHistory);
    res.json({
        trend,
        processCount: mockProcessHistory.length,
        currentScore: (0, process_optimization_1.calculateProcessScore)(mockProcess).toFixed(2)
    });
});
// GET /api/ai/optimization-report
router.get('/optimization-report', (req, res) => {
    const report = {
        processName: mockProcess.name,
        score: (0, process_optimization_1.calculateProcessScore)(mockProcess).toFixed(2),
        recommendedSequence: (0, process_optimization_1.optimizeStepSequence)(mockProcess),
        delayCost: (0, process_optimization_1.estimateDelayCost)(mockProcess),
        trend: (0, process_optimization_1.analyzePerformanceTrend)(mockProcessHistory),
        totalSteps: mockProcess.steps.length,
        completedSteps: mockProcess.steps.filter(s => s.status === 'done').length,
        timestamp: new Date().toISOString()
    };
    res.json(report);
});
exports.default = router;
