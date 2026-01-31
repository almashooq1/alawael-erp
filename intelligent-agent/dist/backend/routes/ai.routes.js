"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_ai_1 = require("../models/process.ai");
const router = express_1.default.Router();
// Mock: Replace with real DB fetch
const mockProcess = {
    name: 'عملية تجريبية',
    status: 'active',
    steps: [
        { id: '1', name: 'مراجعة', type: 'manual', status: 'done' },
        { id: '2', name: 'موافقة', type: 'approval', status: 'done' },
        { id: '3', name: 'تنفيذ', type: 'automated', status: 'in_progress', dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};
// GET /api/ai/suggest-next-step
router.get('/suggest-next-step', (req, res) => {
    const suggestion = (0, process_ai_1.suggestNextStep)(mockProcess);
    res.json({ suggestion });
});
// GET /api/ai/analyze-performance
router.get('/analyze-performance', (req, res) => {
    const analysis = (0, process_ai_1.analyzeProcessPerformance)(mockProcess);
    res.json(analysis);
});
// GET /api/ai/detect-issues
router.get('/detect-issues', (req, res) => {
    const issues = (0, process_ai_1.detectProcessIssues)(mockProcess);
    res.json({ issues });
});
exports.default = router;
