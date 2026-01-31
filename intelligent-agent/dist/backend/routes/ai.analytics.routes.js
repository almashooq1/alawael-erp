"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const process_analytics_new_1 = require("../models/process.analytics.new");
const router = express_1.default.Router();
// Mock data
const mockProcesses = [
    {
        name: 'عملية تحليلية 1',
        status: 'completed',
        steps: [
            { id: '1', name: 'مرحلة أولى', type: 'manual', status: 'done' },
            { id: '2', name: 'مرحلة ثانية', type: 'automated', status: 'done' }
        ],
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        name: 'عملية تحليلية 2',
        status: 'active',
        steps: [
            { id: '1', name: 'مرحلة أولى', type: 'manual', status: 'done' },
            { id: '2', name: 'مرحلة ثانية', type: 'automated', status: 'in_progress' }
        ],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        name: 'عملية تحليلية 3',
        status: 'active',
        steps: [
            { id: '1', name: 'مرحلة أولى', type: 'manual', status: 'in_progress' }
        ],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    }
];
// GET /api/ai/metrics
router.get('/metrics', (req, res) => {
    const metrics = (0, process_analytics_new_1.calculateProcessMetrics)(mockProcesses);
    res.json(metrics);
});
// GET /api/ai/trends
router.get('/trends', (req, res) => {
    const trends = (0, process_analytics_new_1.analyzeTrends)(mockProcesses);
    res.json(trends);
});
// GET /api/ai/forecast
router.get('/forecast', (req, res) => {
    const forecast = (0, process_analytics_new_1.forecastPerformance)(mockProcesses, 30);
    res.json(forecast);
});
// GET /api/ai/health-report
router.get('/health-report', (req, res) => {
    const report = (0, process_analytics_new_1.generateComprehensiveReport)(mockProcesses);
    res.json(report);
});
// GET /api/ai/dashboard
router.get('/dashboard', (req, res) => {
    const metrics = (0, process_analytics_new_1.calculateProcessMetrics)(mockProcesses);
    const trends = (0, process_analytics_new_1.analyzeTrends)(mockProcesses);
    const forecast = (0, process_analytics_new_1.forecastPerformance)(mockProcesses);
    const dashboard = {
        summary: {
            totalProcesses: metrics.totalProcesses,
            completed: metrics.completedProcesses,
            active: metrics.activeProcesses,
            successRate: metrics.successRate + '%',
            efficiency: metrics.efficiency + '%'
        },
        performance: {
            averageCompletionTime: metrics.averageCompletionTime + ' ساعة',
            riskScore: metrics.riskScore + '/100',
            bottlenecks: metrics.bottlenecks,
            trend: trends.trend
        },
        forecast: {
            estimatedCompletions: forecast.estimatedCompletion,
            confidence: forecast.confidenceLevel + '%',
            recommendation: forecast.recommendation
        },
        timestamp: new Date().toISOString()
    };
    res.json(dashboard);
});
exports.default = router;
