"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const exporters_1 = require("./exporters");
// تصدير PDF
router.get('/export/pdf', (req, res) => {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const total = logs.length;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const topQuestions = Object.entries(weekLogs.reduce((acc, l) => {
        const q = (l.input || '').trim();
        if (q)
            acc[q] = (acc[q] || 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
    (0, exporters_1.exportReportPDF)(res, { total, weekCount: weekLogs.length, topQuestions, errorCount });
});
// تصدير Excel
router.get('/export/excel', (req, res) => {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const total = logs.length;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const topQuestions = Object.entries(weekLogs.reduce((acc, l) => {
        const q = (l.input || '').trim();
        if (q)
            acc[q] = (acc[q] || 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
    (0, exporters_1.exportReportExcel)(res, { total, weekCount: weekLogs.length, topQuestions, errorCount });
});
const express_1 = __importDefault(require("express"));
const interaction_logger_1 = require("../src/modules/interaction-logger");
const router = express_1.default.Router();
// API: إحصائيات عامة
router.get('/stats', (req, res) => {
    const logs = interaction_logger_1.InteractionLogger.getAll();
    const total = logs.length;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const topQuestions = Object.entries(weekLogs.reduce((acc, l) => {
        const q = (l.input || '').trim();
        if (q)
            acc[q] = (acc[q] || 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
    const feedbacks = weekLogs.map(l => l.feedback).filter(f => typeof f === 'number');
    res.json({
        total,
        weekCount: weekLogs.length,
        topQuestions,
        errorCount,
        feedbackStats: feedbacks.length ? {
            max: Math.max(...feedbacks),
            min: Math.min(...feedbacks),
            all: feedbacks
        } : null
    });
});
exports.default = router;
