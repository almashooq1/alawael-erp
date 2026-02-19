/**
 * Advanced SAMA API Routes
 * مسارات API متقدمة لـ SAMA
 *
 * Endpoints:
 * ✅ IBAN Validation
 * ✅ Payment Processing
 * ✅ Account Management
 * ✅ Financial Analytics
 * ✅ Fraud Detection
 * ✅ Compliance Reporting
 */

import express, { Request, Response, NextFunction } from 'express';
import { AdvancedSAMAService } from '../services/sama-advanced.service';
import FinancialIntelligenceService from '../services/financial-intelligence.service';
import FraudDetectionService from '../services/fraud-detection.service';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();
const samaService = new AdvancedSAMAService();

// ============================================
// Middleware
// ============================================

router.use(authenticateToken);

// ============================================
// IBAN & Account Validation
// ============================================

/**
 * POST /api/sama-advanced/iban/validate
 * Validate IBAN format and check with SAMA
 */
router.post('/iban/validate', async (req: Request, res: Response) => {
  try {
    const { iban } = req.body;

    if (!iban) {
      return res.status(400).json({
        success: false,
        message: 'IBAN is required',
      });
    }

    const validation = await samaService.validateIBAN(iban);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/account/verify
 * Verify account exists and is active
 */
router.post('/account/verify', async (req: Request, res: Response) => {
  try {
    const { iban } = req.body;

    if (!iban) {
      return res.status(400).json({
        success: false,
        message: 'IBAN is required',
      });
    }

    const account = await samaService.verifyAccount(iban);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or invalid',
      });
    }

    res.json({
      success: true,
      data: account,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/sama-advanced/account/:iban/balance
 * Get account balance
 */
router.get('/account/:iban/balance', async (req: Request, res: Response) => {
  try {
    const { iban } = req.params;

    const balance = await samaService.getAccountBalance(iban);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Payment Processing
// ============================================

/**
 * POST /api/sama-advanced/payments/transfer
 * Process payment transfer between accounts
 */
router.post(
  '/payments/transfer',
  authorizeRole(['USER', 'ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { sourceIban, destinationIban, amount, description } = req.body;

      // Validate inputs
      if (!sourceIban || !destinationIban || !amount || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be positive',
        });
      }

      const transaction = await samaService.processPayment(
        sourceIban,
        destinationIban,
        amount,
        description
      );

      // Check fraud status
      if (transaction.fraudStatus !== 'clean') {
        return res.status(403).json({
          success: false,
          message: 'Transaction blocked due to fraud detection',
          data: { fraudScore: transaction.fraudScore },
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/sama-advanced/payments/schedule
 * Schedule recurring payment
 */
router.post(
  '/payments/schedule',
  authorizeRole(['USER', 'ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const {
        sourceIban,
        destinationIban,
        amount,
        frequency,
        description,
      } = req.body;

      // Validate inputs
      if (!sourceIban || !destinationIban || !amount || !frequency) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const schedule = await samaService.schedulePayment(
        sourceIban,
        destinationIban,
        amount,
        frequency,
        description || 'Scheduled Payment'
      );

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================
// Financial Analytics
// ============================================

/**
 * GET /api/sama-advanced/account/:iban/analysis
 * Analyze account financial health
 */
router.get('/account/:iban/analysis', async (req: Request, res: Response) => {
  try {
    const { iban } = req.params;
    const { periodDays = 30 } = req.query;

    const analysis = await samaService.analyzeAccount(iban, parseInt(periodDays as string));

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/analytics/forecast
 * Generate cash flow forecast
 */
router.post('/analytics/forecast', async (req: Request, res: Response) => {
  try {
    const {
      currentBalance,
      monthlyIncome,
      monthlyExpenses,
      forecastDays = 90,
    } = req.body;

    const forecast = await FinancialIntelligenceService.generateCashFlowForecast(
      currentBalance,
      monthlyIncome,
      monthlyExpenses,
      forecastDays
    );

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/analytics/financial-score
 * Calculate financial health score
 */
router.post('/analytics/financial-score', async (req: Request, res: Response) => {
  try {
    const profile = req.body;

    const score = await FinancialIntelligenceService.calculateFinancialScore(profile);

    res.json({
      success: true,
      data: score,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/analytics/spending-patterns
 * Analyze spending patterns
 */
router.post('/analytics/spending-patterns', async (req: Request, res: Response) => {
  try {
    const { transactions, periodMonths = 6 } = req.body;

    if (!transactions || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transactions are required',
      });
    }

    const patterns = await FinancialIntelligenceService.analyzeSpendingPatterns(
      transactions,
      periodMonths
    );

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/analytics/budget-recommendations
 * Get budget recommendations
 */
router.post('/analytics/budget-recommendations', async (req: Request, res: Response) => {
  try {
    const { spendingPatterns, monthlyIncome } = req.body;

    if (!spendingPatterns || !monthlyIncome) {
      return res.status(400).json({
        success: false,
        message: 'spending patterns and monthly income are required',
      });
    }

    const recommendations = await FinancialIntelligenceService.getBudgetRecommendations(
      spendingPatterns,
      monthlyIncome
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/analytics/investment-suggestions
 * Get investment suggestions
 */
router.post('/analytics/investment-suggestions', async (req: Request, res: Response) => {
  try {
    const profile = req.body;

    const suggestions = await FinancialIntelligenceService.getInvestmentSuggestions(profile);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/analytics/monthly-report
 * Generate monthly report
 */
router.post('/analytics/monthly-report', async (req: Request, res: Response) => {
  try {
    const { transactions, month, year } = req.body;

    if (!transactions || month === undefined || year === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Transactions, month, and year are required',
      });
    }

    const report = await FinancialIntelligenceService.generateMonthlyReport(
      transactions,
      month,
      year
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Compliance & Reporting
// ============================================

/**
 * GET /api/sama-advanced/account/:iban/compliance-report
 * Generate compliance report
 */
router.get(
  '/account/:iban/compliance-report',
  authorizeRole(['ADMIN', 'COMPLIANCE']),
  async (req: Request, res: Response) => {
    try {
      const { iban } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await samaService.generateComplianceReport(
        iban,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================
// Fraud Detection
// ============================================

/**
 * POST /api/sama-advanced/fraud/detect
 * Analyze transaction for fraud
 */
router.post('/fraud/detect', async (req: Request, res: Response) => {
  try {
    const { transaction, behavioralProfile } = req.body;

    if (!transaction) {
      return res.status(400).json({
        success: false,
        message: 'Transaction data is required',
      });
    }

    const result = await FraudDetectionService.detectFraud(transaction, behavioralProfile);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/fraud/profile/build
 * Build behavioral profile from transaction history
 */
router.post('/fraud/profile/build', async (req: Request, res: Response) => {
  try {
    const { accountId, transactions } = req.body;

    if (!accountId || !transactions) {
      return res.status(400).json({
        success: false,
        message: 'Account ID and transactions are required',
      });
    }

    const profile = await FraudDetectionService.buildBehavioralProfile(
      accountId,
      transactions
    );

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sama-advanced/fraud/alert/create
 * Create fraud alert
 */
router.post(
  '/fraud/alert/create',
  authorizeRole(['ADMIN', 'FRAUD_ANALYST']),
  async (req: Request, res: Response) => {
    try {
      const { transactionId, accountId, reason, amount } = req.body;

      if (!transactionId || !accountId || !reason || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const alert = await FraudDetectionService.createFraudAlert(
        transactionId,
        accountId,
        reason,
        amount
      );

      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/sama-advanced/fraud/alert/resolve
 * Resolve fraud alert
 */
router.post(
  '/fraud/alert/resolve',
  authorizeRole(['ADMIN', 'FRAUD_ANALYST']),
  async (req: Request, res: Response) => {
    try {
      const { alertId, status } = req.body;

      if (!alertId || !status) {
        return res.status(400).json({
          success: false,
          message: 'Alert ID and status are required',
        });
      }

      if (!['resolved', 'false-positive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }

      await FraudDetectionService.resolveFraudAlert(alertId, status);

      res.json({
        success: true,
        message: 'Alert resolved',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/sama-advanced/fraud/blacklist/add
 * Add to blacklist
 */
router.post(
  '/fraud/blacklist/add',
  authorizeRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { identifier, reason } = req.body;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Identifier is required',
        });
      }

      await FraudDetectionService.addToBlacklist(identifier, reason || 'No reason provided');

      res.json({
        success: true,
        message: 'Added to blacklist',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/sama-advanced/fraud/whitelist/add
 * Add to whitelist
 */
router.post(
  '/fraud/whitelist/add',
  authorizeRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Identifier is required',
        });
      }

      await FraudDetectionService.addToWhitelist(identifier);

      res.json({
        success: true,
        message: 'Added to whitelist',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================
// Service Status
// ============================================

/**
 * GET /api/sama-advanced/status
 * Get SAMA service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const samaStatus = samaService.getStatus();
    const fraudStatus = FraudDetectionService.getStatus();

    res.json({
      success: true,
      data: {
        sama: samaStatus,
        fraud: fraudStatus,
        timestamp: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// Error Handling
// ============================================

router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('SAMA API Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default router;
