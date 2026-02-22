/**
 * ===================================================================
 * FINANCIAL SYSTEM API ROUTES
 * مسارات API نظام المالية والمحاسبة
 * ===================================================================
 * نسخة: 2.0 - احترافية كاملة
 * التاريخ: فبراير 2026
 */

const express = require('express');
const router = express.Router();

// ===================================================================
// 1. إدارة الحسابات - Account Management
// ===================================================================

/**
 * GET /api/finance/accounts
 * الحصول على قائمة الحسابات
 */
router.get('/accounts', (req, res) => {
  try {
    const { type, isActive } = req.query;
    const accounts = Array.from(req.app.locals.fs.accounts.values());

    let filtered = accounts;
    if (type) {
      filtered = filtered.filter(acc => acc.type === type);
    }
    if (isActive !== undefined) {
      filtered = filtered.filter(acc => acc.isActive === (isActive === 'true'));
    }

    res.json({
      success: true,
      count: filtered.length,
      accounts: filtered.sort((a, b) => a.code - b.code),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/accounts
 * إنشاء حساب جديد
 */
router.post('/accounts', (req, res) => {
  try {
    const accountData = req.body;
    const account = req.app.locals.fs.createAccount(accountData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      account,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/accounts/:id
 * الحصول على تفاصيل حساب
 */
router.get('/accounts/:id', (req, res) => {
  try {
    const account = req.app.locals.fs.accounts.get(parseInt(req.params.id));
    if (!account) {
      return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
    }

    const balance = req.app.locals.fs.getAccountBalance(account.id);
    res.json({
      success: true,
      account: {
        ...account,
        balance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/accounts/:id/balance
 * الحصول على رصيد الحساب
 */
router.get('/accounts/:id/balance', (req, res) => {
  try {
    const account = req.app.locals.fs.accounts.get(parseInt(req.params.id));
    if (!account) {
      return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
    }

    const balance = req.app.locals.fs.getAccountBalance(account.id);
    res.json({
      success: true,
      accountId: account.id,
      code: account.code,
      name: account.name,
      balance,
      currency: account.currency,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/finance/accounts/:id
 * إغلاق حساب
 */
router.delete('/accounts/:id', (req, res) => {
  try {
    const { reason } = req.body;
    const account = req.app.locals.fs.closeAccount(parseInt(req.params.id), reason);

    res.json({
      success: true,
      message: 'تم إغلاق الحساب بنجاح',
      account,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 2. القيود اليومية - Journal Entries
// ===================================================================

/**
 * POST /api/finance/journal-entries
 * إنشاء قيد يوميّ
 */
router.post('/journal-entries', (req, res) => {
  try {
    const entryData = req.body;
    const journal = req.app.locals.fs.createJournalEntry(entryData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القيد بنجاح',
      journal,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/journal-entries
 * الحصول على القيود اليومية
 */
router.get('/journal-entries', (req, res) => {
  try {
    const { status } = req.query;
    const journals = Array.from(req.app.locals.fs.journals.values());

    let filtered = journals;
    if (status) {
      filtered = filtered.filter(j => j.status === status);
    }

    res.json({
      success: true,
      count: filtered.length,
      journals: filtered.sort((a, b) => b.date - a.date),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/journal-entries/:id/post
 * ترحيل القيد
 */
router.post('/journal-entries/:id/post', (req, res) => {
  try {
    const { postedBy } = req.body;
    const journal = req.app.locals.fs.postJournalEntry(parseInt(req.params.id), postedBy);

    res.json({
      success: true,
      message: 'تم ترحيل القيد بنجاح',
      journal,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/journal-entries/:id/reverse
 * عكس القيد
 */
router.post('/journal-entries/:id/reverse', (req, res) => {
  try {
    const { reason } = req.body;
    const result = req.app.locals.fs.reverseJournalEntry(parseInt(req.params.id), reason);

    res.json({
      success: true,
      message: 'تم عكس القيد بنجاح',
      original: result.original,
      reverse: result.reverse,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 3. الفواتير - Invoices
// ===================================================================

/**
 * POST /api/finance/invoices
 * إنشاء فاتورة
 */
router.post('/invoices', (req, res) => {
  try {
    const invoiceData = req.body;
    const invoice = req.app.locals.fs.createInvoice(invoiceData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفاتورة بنجاح',
      invoice,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/invoices
 * الحصول على قائمة الفواتير
 */
router.get('/invoices', (req, res) => {
  try {
    const { status, customerId } = req.query;
    const invoices = Array.from(req.app.locals.fs.invoices.values());

    let filtered = invoices;
    if (status) {
      filtered = filtered.filter(inv => inv.status === status);
    }
    if (customerId) {
      filtered = filtered.filter(inv => inv.customerId === customerId);
    }

    res.json({
      success: true,
      count: filtered.length,
      invoices: filtered.sort((a, b) => b.invoiceDate - a.invoiceDate),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/invoices/:id/payment
 * تسجيل دفع الفاتورة
 */
router.post('/invoices/:id/payment', (req, res) => {
  try {
    const paymentData = req.body;
    const payment = req.app.locals.fs.recordPayment(parseInt(req.params.id), paymentData);
    const invoice = req.app.locals.fs.invoices.get(parseInt(req.params.id));

    res.json({
      success: true,
      message: 'تم تسجيل الدفع بنجاح',
      payment,
      invoice,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 4. المصروفات - Expenses
// ===================================================================

/**
 * POST /api/finance/expenses
 * تسجيل مصروف
 */
router.post('/expenses', (req, res) => {
  try {
    const expenseData = req.body;
    const expense = req.app.locals.fs.recordExpense(expenseData);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المصروف بنجاح',
      expense,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/expenses
 * الحصول على المصروفات
 */
router.get('/expenses', (req, res) => {
  try {
    const { status, category } = req.query;
    const expenses = Array.from(req.app.locals.fs.expenses.values());

    let filtered = expenses;
    if (status) {
      filtered = filtered.filter(exp => exp.status === status);
    }
    if (category) {
      filtered = filtered.filter(exp => exp.category === category);
    }

    res.json({
      success: true,
      count: filtered.length,
      expenses: filtered.sort((a, b) => b.date - a.date),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/expenses/:id/approve
 * الموافقة على مصروف
 */
router.post('/expenses/:id/approve', (req, res) => {
  try {
    const { approver, notes } = req.body;
    const expense = req.app.locals.fs.approveExpense(parseInt(req.params.id), approver, notes);

    res.json({
      success: true,
      message: 'تم الموافقة على المصروف بنجاح',
      expense,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 5. الميزانيات - Budgets
// ===================================================================

/**
 * POST /api/finance/budgets
 * إنشاء ميزانية
 */
router.post('/budgets', (req, res) => {
  try {
    const budgetData = req.body;
    const budget = req.app.locals.fs.createBudget(budgetData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الميزانية بنجاح',
      budget,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/budgets
 * الحصول على الميزانيات
 */
router.get('/budgets', (req, res) => {
  try {
    const { fiscalYear, status } = req.query;
    const budgets = Array.from(req.app.locals.fs.budgets.values());

    let filtered = budgets;
    if (fiscalYear) {
      filtered = filtered.filter(b => b.fiscalYear === parseInt(fiscalYear));
    }
    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }

    res.json({
      success: true,
      count: filtered.length,
      budgets: filtered,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/budgets/:id/variance-analysis
 * تحليل المتغيرات
 */
router.get('/budgets/:id/variance-analysis', (req, res) => {
  try {
    const analysis = req.app.locals.analytics.analyzeBudgetVariances(parseInt(req.params.id));

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 6. التقارير المالية - Financial Reports
// ===================================================================

/**
 * GET /api/finance/reports/balance-sheet
 * الميزانية العمومية
 */
router.get('/reports/balance-sheet', (req, res) => {
  try {
    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const balanceSheet = req.app.locals.fs.generateBalanceSheet(date);

    res.json({
      success: true,
      balanceSheet,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/reports/income-statement
 * قائمة الدخل
 */
router.get('/reports/income-statement', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate || new Date().getFullYear() + '-01-01');
    const end = new Date(endDate || new Date());

    const incomeStatement = req.app.locals.fs.generateIncomeStatement(start, end);

    res.json({
      success: true,
      incomeStatement,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/reports/cash-flow
 * التدفق النقدي
 */
router.get('/reports/cash-flow', (req, res) => {
  try {
    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const cashPosition = req.app.locals.fs.calculateCashPosition(date);

    res.json({
      success: true,
      cashPosition,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/reports/financial-ratios
 * النسب المالية
 */
router.get('/reports/financial-ratios', (req, res) => {
  try {
    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const ratios = req.app.locals.fs.calculateFinancialRatios(date);

    res.json({
      success: true,
      ratios,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/reports/executive-summary
 * الملخص التنفيذي
 */
router.get('/reports/executive-summary', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate || new Date().getFullYear() + '-01-01');
    const end = new Date(endDate || new Date());

    const summary = req.app.locals.analytics.generateExecutiveSummary(start, end);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 7. التحليل المالي - Financial Analysis
// ===================================================================

/**
 * GET /api/finance/analysis/cost-by-department
 * تحليل التكاليف حسب القسم
 */
router.get('/analysis/cost-by-department', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const analysis = req.app.locals.analytics.analyzeCostsByDepartment(start, end);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/analysis/profitability
 * تحليل الربحية
 */
router.get('/analysis/profitability', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const analysis = {
      gross: req.app.locals.analytics.analyzeGrossProfit(start, end),
      operating: req.app.locals.analytics.analyzeOperatingProfit(start, end),
      net: req.app.locals.analytics.analyzeNetProfit(start, end),
    };

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/analysis/liquidity
 * تحليل السيولة
 */
router.get('/analysis/liquidity', (req, res) => {
  try {
    const { months } = req.query;
    const analysis = {
      cycle: req.app.locals.analytics.analyzeCashCycle(parseInt(months) || 12),
      forecast: req.app.locals.analytics.forecastLiquidity(parseInt(months) || 6),
    };

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/analysis/anomalies
 * كشف الشذوذ
 */
router.get('/analysis/anomalies', (req, res) => {
  try {
    const anomalies = req.app.locals.analytics.detectAnomalies();

    res.json({
      success: true,
      count: anomalies.length,
      anomalies,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/analysis/trends
 * تحليل الاتجاهات
 */
router.get('/analysis/trends', (req, res) => {
  try {
    const { timeframe } = req.query;
    const trends = req.app.locals.analytics.analyzeTrends(timeframe || 'monthly');

    res.json({
      success: true,
      trends,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================================
// 8. التنبيهات والتحقق - Alerts & Verification
// ===================================================================

/**
 * GET /api/finance/alerts
 * الحصول على التنبيهات المالية
 */
router.get('/alerts', (req, res) => {
  try {
    const alerts = req.app.locals.analytics.generateAlerts();
    const unacknowledged = alerts.filter(a => !a.acknowledged);

    res.json({
      success: true,
      total: alerts.length,
      unacknowledged: unacknowledged.length,
      alerts: unacknowledged.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/finance/alerts/:id/acknowledge
 * إقرار التنبيه
 */
router.post('/alerts/:id/acknowledge', (req, res) => {
  try {
    const alert = req.app.locals.analytics.acknowledgeAlert(req.params.id);

    res.json({
      success: true,
      message: 'تم إقرار التنبيه',
      alert,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/verify/accounting-equation
 * التحقق من معادلة المحاسبة
 */
router.get('/verify/accounting-equation', (req, res) => {
  try {
    const verification = req.app.locals.fs.verifyAccountingEquation();

    res.json({
      success: true,
      verification,
      status: verification.isBalanced ? 'متوازن' : 'غير متوازن',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/finance/statistics
 * إحصائيات النظام
 */
router.get('/statistics', (req, res) => {
  try {
    const stats = req.app.locals.fs.getSystemStatistics();

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
