"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const accountingAi_service_1 = require("../services/accountingAi.service");
const router = express_1.default.Router();
const defaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
};
/**
 * @route   GET /api/ai/accounting/health
 * @desc    Health check for accounting integration
 */
router.get('/health', async (req, res) => {
    try {
        const now = new Date().toISOString();
        const { startDate, endDate } = defaultDateRange();
        const snapshot = await (0, accountingAi_service_1.getFinancialSnapshot)({
            asOfDate: now,
            startDate,
            endDate,
            includeCashFlow: false,
        });
        res.json({
            success: true,
            status: 'connected',
            timestamp: now,
            data: {
                company: snapshot.balanceSheet.company,
                currency: snapshot.balanceSheet.currency,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            status: 'disconnected',
            message: error.message || 'Accounting integration failed',
        });
    }
});
/**
 * @route   GET /api/ai/accounting/summary
 * @desc    Get aggregated accounting summary for ML/AI
 */
router.get('/summary', async (req, res) => {
    try {
        const asOfDate = req.query.asOfDate || new Date().toISOString();
        const startDate = req.query.startDate || defaultDateRange().startDate;
        const endDate = req.query.endDate || defaultDateRange().endDate;
        const snapshot = await (0, accountingAi_service_1.getFinancialSnapshot)({
            asOfDate,
            startDate,
            endDate,
            includeCashFlow: true,
        });
        res.json({
            success: true,
            data: snapshot,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to load accounting summary',
        });
    }
});
/**
 * @route   GET /api/ai/accounting/insights
 * @desc    Generate AI insights from accounting data
 */
router.get('/insights', async (req, res) => {
    try {
        const asOfDate = req.query.asOfDate || new Date().toISOString();
        const startDate = req.query.startDate || defaultDateRange().startDate;
        const endDate = req.query.endDate || defaultDateRange().endDate;
        const insights = await (0, accountingAi_service_1.getFinancialInsights)({ asOfDate, startDate, endDate });
        res.json({
            success: true,
            data: insights,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate insights',
        });
    }
});
/**
 * @route   GET /api/ai/accounting/reports/advanced
 * @desc    Generate advanced accounting report with AI insights
 */
router.get('/reports/advanced', async (req, res) => {
    try {
        const asOfDate = req.query.asOfDate || new Date().toISOString();
        const startDate = req.query.startDate || defaultDateRange().startDate;
        const endDate = req.query.endDate || defaultDateRange().endDate;
        const report = await (0, accountingAi_service_1.getAdvancedInsightsReport)({ asOfDate, startDate, endDate });
        res.json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate advanced accounting report',
        });
    }
});
/**
 * @route   GET /api/ai/accounting/forecast
 * @desc    Generate financial forecast using historical income statements
 */
router.get('/forecast', async (req, res) => {
    try {
        const asOfDate = req.query.asOfDate || new Date().toISOString();
        const historyMonths = req.query.historyMonths ? Number(req.query.historyMonths) : undefined;
        const forecastMonths = req.query.forecastMonths ? Number(req.query.forecastMonths) : undefined;
        const forecast = await (0, accountingAi_service_1.getFinancialForecast)({ asOfDate, historyMonths, forecastMonths });
        res.json({
            success: true,
            data: forecast,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate financial forecast',
        });
    }
});
exports.default = router;
