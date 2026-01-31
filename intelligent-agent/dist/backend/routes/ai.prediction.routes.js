"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_prediction_1 = require("../models/process.prediction");
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
// GET /api/ai/predict-next-step
router.get('/predict-next-step', (req, res) => {
    const prediction = (0, process_prediction_1.predictNextStep)(mockProcess);
    res.json({ prediction });
});
// GET /api/ai/predict-completion-time
router.get('/predict-completion-time', (req, res) => {
    const days = (0, process_prediction_1.predictCompletionTime)(mockProcess);
    res.json({ estimatedDays: days });
});
exports.default = router;
