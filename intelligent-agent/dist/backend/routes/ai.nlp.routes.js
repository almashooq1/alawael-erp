"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_nlp_1 = require("../models/process.nlp");
const router = express_1.default.Router();
// Mock: Replace with real DB fetch
const mockProcess = {
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
    const keywords = (0, process_nlp_1.extractKeywords)(mockProcess.name);
    res.json({ keywords });
});
// GET /api/ai/analyze-sentiment
router.get('/analyze-sentiment', (req, res) => {
    const sentiment = (0, process_nlp_1.analyzeSentiment)(mockProcess.name);
    res.json({ sentiment, processName: mockProcess.name });
});
// GET /api/ai/process-summary
router.get('/process-summary', (req, res) => {
    const summary = (0, process_nlp_1.generateProcessSummary)(mockProcess);
    res.json({ summary });
});
// GET /api/ai/critical-steps
router.get('/critical-steps', (req, res) => {
    const criticalSteps = (0, process_nlp_1.identifyCriticalSteps)(mockProcess);
    res.json({ criticalSteps, count: criticalSteps.length });
});
// GET /api/ai/nlp-analysis
router.get('/nlp-analysis', (req, res) => {
    const analysis = {
        processName: mockProcess.name,
        keywords: (0, process_nlp_1.extractKeywords)(mockProcess.name),
        sentiment: (0, process_nlp_1.analyzeSentiment)(mockProcess.name),
        summary: (0, process_nlp_1.generateProcessSummary)(mockProcess),
        criticalSteps: (0, process_nlp_1.identifyCriticalSteps)(mockProcess),
        totalSteps: mockProcess.steps.length
    };
    res.json(analysis);
});
exports.default = router;
