import express, { Request, Response } from 'express';
import {
  getFinancialSnapshot,
  getFinancialInsights,
  getAdvancedInsightsReport,
  getFinancialForecast,
} from '../services/accountingAi.service';

const router = express.Router();

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
router.get('/health', async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const { startDate, endDate } = defaultDateRange();
    const snapshot = await getFinancialSnapshot({
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
  } catch (error: any) {
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
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const asOfDate = (req.query.asOfDate as string) || new Date().toISOString();
    const startDate = (req.query.startDate as string) || defaultDateRange().startDate;
    const endDate = (req.query.endDate as string) || defaultDateRange().endDate;

    const snapshot = await getFinancialSnapshot({
      asOfDate,
      startDate,
      endDate,
      includeCashFlow: true,
    });

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
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
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const asOfDate = (req.query.asOfDate as string) || new Date().toISOString();
    const startDate = (req.query.startDate as string) || defaultDateRange().startDate;
    const endDate = (req.query.endDate as string) || defaultDateRange().endDate;

    const insights = await getFinancialInsights({ asOfDate, startDate, endDate });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
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
router.get('/reports/advanced', async (req: Request, res: Response) => {
  try {
    const asOfDate = (req.query.asOfDate as string) || new Date().toISOString();
    const startDate = (req.query.startDate as string) || defaultDateRange().startDate;
    const endDate = (req.query.endDate as string) || defaultDateRange().endDate;

    const report = await getAdvancedInsightsReport({ asOfDate, startDate, endDate });

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
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
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const asOfDate = (req.query.asOfDate as string) || new Date().toISOString();
    const historyMonths = req.query.historyMonths ? Number(req.query.historyMonths) : undefined;
    const forecastMonths = req.query.forecastMonths ? Number(req.query.forecastMonths) : undefined;

    const forecast = await getFinancialForecast({ asOfDate, historyMonths, forecastMonths });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate financial forecast',
    });
  }
});

export default router;
