/**
 * Cash Flow Routes - مسارات إدارة التدفقات النقدية
 * Cash Flow Management API Routes
 */

const express = require('express');
const router = express.Router();

/**
 * تسجيل تدفق نقدي وارد
 * POST /api/finance/cashflow/incoming
 */
router.post('/incoming', (req, res) => {
  try {
    const { source, amount, date, description, category } = req.body;

    // التحقق من البيانات
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'المبلغ يجب أن يكون موجباً',
      });
    }

    const validSources = ['customer', 'investment', 'loan', 'other'];
    if (!validSources.includes(source)) {
      return res.status(400).json({
        status: 'error',
        message: `مصدر التدفق غير صحيح. المصادر المتاحة: ${validSources.join(', ')}`,
      });
    }

    const inflow = {
      id: `INFLOW_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'incoming',
      source,
      amount,
      date: date || new Date().toISOString(),
      description,
      category,
      status: 'recorded',
      accountImpact: {
        accountId: 'CASH_ACCOUNT',
        creditAmount: amount,
      },
    };

    res.status(201).json({
      status: 'success',
      message: 'تم تسجيل التدفق الوارد بنجاح',
      data: inflow,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في تسجيل التدفق الوارد',
      error: error.message,
    });
  }
});

/**
 * تسجيل تدفق نقدي صادر
 * POST /api/finance/cashflow/outgoing
 */
router.post('/outgoing', (req, res) => {
  try {
    const { purpose, amount, date, description, requiresApproval } = req.body;

    // التحقق من البيانات
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'المبلغ يجب أن يكون موجباً',
      });
    }

    const validPurposes = ['payroll', 'supplier', 'tax', 'rent', 'utility', 'other'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        status: 'error',
        message: `الغرض غير صحيح. الأغراض المتاحة: ${validPurposes.join(', ')}`,
      });
    }

    const outflow = {
      id: `OUTFLOW_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'outgoing',
      purpose,
      amount,
      date: date || new Date().toISOString(),
      description,
      status: requiresApproval ? 'pending_approval' : 'recorded',
      requiresApproval: requiresApproval || false,
      accountImpact: {
        accountId: 'CASH_ACCOUNT',
        debitAmount: amount,
      },
    };

    res.status(201).json({
      status: 'success',
      message: 'تم تسجيل التدفق الصادر بنجاح',
      data: outflow,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في تسجيل التدفق الصادر',
      error: error.message,
    });
  }
});

/**
 * المصادقة على تدفق صادر
 * POST /api/finance/cashflow/approve/:outflowId
 */
router.post('/approve/:outflowId', (req, res) => {
  try {
    const { outflowId } = req.params;
    const { approverId, notes } = req.body;

    const approval = {
      outflowId,
      timestamp: new Date().toISOString(),
      approverId,
      notes,
      status: 'approved',
      approvalTime: new Date().toISOString(),
      message: 'تم المصادقة على التدفق الصادر',
    };

    res.status(200).json({
      status: 'success',
      message: 'تم المصادقة على التدفق بنجاح',
      data: approval,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في المصادقة على التدفق',
      error: error.message,
    });
  }
});

/**
 * رفع تدفق صادر
 * POST /api/finance/cashflow/reject/:outflowId
 */
router.post('/reject/:outflowId', (req, res) => {
  try {
    const { outflowId } = req.params;
    const { reason, rejector } = req.body;

    const rejection = {
      outflowId,
      timestamp: new Date().toISOString(),
      rejector,
      reason,
      status: 'rejected',
      message: 'تم رفض التدفق الصادر',
    };

    res.status(200).json({
      status: 'success',
      message: 'تم رفض التدفق بنجاح',
      data: rejection,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في رفض التدفق',
      error: error.message,
    });
  }
});

/**
 * تحليل التدفقات النقدية خلال فترة زمنية
 * GET /api/finance/cashflow/analysis
 */
router.get('/analysis', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analysis = {
      timestamp: new Date().toISOString(),
      period: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString(),
      },
      summary: {
        totalInflows: 500000,
        totalOutflows: 400000,
        netCashFlow: 100000,
        averageDailyInflow: 16666,
        averageDailyOutflow: 13333,
      },
      bySource: {
        customer: 300000,
        investment: 150000,
        loan: 50000,
        other: 0,
      },
      byPurpose: {
        payroll: 200000,
        supplier: 150000,
        tax: 30000,
        rent: 20000,
      },
      activities: {
        operating: {
          inflows: 450000,
          outflows: 380000,
          net: 70000,
        },
        investing: {
          inflows: 50000,
          outflows: 20000,
          net: 30000,
        },
        financing: {
          inflows: 0,
          outflows: 0,
          net: 0,
        },
      },
    };

    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في تحليل التدفقات النقدية',
      error: error.message,
    });
  }
});

/**
 * إنشاء توقع للتدفقات النقدية
 * POST /api/finance/cashflow/forecast
 */
router.post('/forecast', (req, res) => {
  try {
    const { name, method, months, startDate } = req.body;

    const validMethods = ['linear', 'seasonal', 'regression'];
    if (method && !validMethods.includes(method)) {
      return res.status(400).json({
        status: 'error',
        message: `طريقة التنبؤ غير صحيحة. الطرق المتاحة: ${validMethods.join(', ')}`,
      });
    }

    const forecast = {
      id: `FORECAST_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name,
      method: method || 'linear',
      startDate: startDate || new Date().toISOString(),
      months: months || 12,
      predictions: [
        {
          month: '2026-02',
          expectedInflow: 180000,
          expectedOutflow: 150000,
          expectedNetFlow: 30000,
        },
        {
          month: '2026-03',
          expectedInflow: 190000,
          expectedOutflow: 155000,
          expectedNetFlow: 35000,
        },
        {
          month: '2026-04',
          expectedInflow: 200000,
          expectedOutflow: 160000,
          expectedNetFlow: 40000,
        },
      ],
      confidence: 0.85,
      accuracy: 'high',
    };

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء التنبؤ بنجاح',
      data: forecast,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في إنشاء التنبؤ',
      error: error.message,
    });
  }
});

/**
 * إنشاء احتياطي نقدي
 * POST /api/finance/cashflow/liquidity-reserve
 */
router.post('/liquidity-reserve', (req, res) => {
  try {
    const { name, targetAmount, purpose } = req.body;

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'المبلغ المستهدف يجب أن يكون موجباً',
      });
    }

    const reserve = {
      id: `RESERVE_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name,
      targetAmount,
      currentAmount: 0,
      purpose,
      status: 'created',
      lastModified: new Date().toISOString(),
    };

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء احتياطي النقد بنجاح',
      data: reserve,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في إنشاء احتياطي النقد',
      error: error.message,
    });
  }
});

/**
 * الإيداع في احتياطي النقد
 * POST /api/finance/cashflow/deposit/:reserveId
 */
router.post('/deposit/:reserveId', (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'المبلغ يجب أن يكون موجباً',
      });
    }

    const deposit = {
      reserveId: req.params.reserveId,
      timestamp: new Date().toISOString(),
      amount,
      reason,
      status: 'completed',
      message: 'تم الإيداع بنجاح',
    };

    res.status(200).json({
      status: 'success',
      message: 'تم الإيداع في الاحتياطي بنجاح',
      data: deposit,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في الإيداع في الاحتياطي',
      error: error.message,
    });
  }
});

/**
 * السحب من احتياطي النقد
 * POST /api/finance/cashflow/withdraw/:reserveId
 */
router.post('/withdraw/:reserveId', (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'المبلغ يجب أن يكون موجباً',
      });
    }

    const withdrawal = {
      reserveId: req.params.reserveId,
      timestamp: new Date().toISOString(),
      amount,
      reason,
      status: 'completed',
      message: 'تم السحب من الاحتياطي بنجاح',
    };

    res.status(200).json({
      status: 'success',
      message: 'تم السحب من الاحتياطي بنجاح',
      data: withdrawal,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في السحب من الاحتياطي',
      error: error.message,
    });
  }
});

/**
 * جدول السداد (Payment Schedule)
 * POST /api/finance/cashflow/payment-schedule
 */
router.post('/payment-schedule', (req, res) => {
  try {
    const { name, amount, frequency, startDate, endDate } = req.body;

    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        status: 'error',
        message: `التكرار غير صحيح. الترددات المتاحة: ${validFrequencies.join(', ')}`,
      });
    }

    const schedule = {
      id: `SCHEDULE_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name,
      amount,
      frequency,
      startDate,
      endDate,
      status: 'active',
      nextPaymentDate: startDate,
      totalPayments: 0,
    };

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء جدول السداد بنجاح',
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في إنشاء جدول السداد',
      error: error.message,
    });
  }
});

/**
 * الحصول على ملخص النقد المتاح
 * GET /api/finance/cashflow/available-cash
 */
router.get('/available-cash', (req, res) => {
  try {
    const cashStatus = {
      timestamp: new Date().toISOString(),
      cashBalance: {
        current: 250000,
        reserved: 50000,
        available: 200000,
      },
      breakdown: {
        bankAccounts: 150000,
        cashOnHand: 100000,
        investments: 0,
      },
      status: 'healthy',
      trend: 'increasing',
    };

    res.status(200).json(cashStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في جلب معلومات النقد',
      error: error.message,
    });
  }
});

/**
 * ملخص التدفقات النقدية
 * GET /api/finance/cashflow/summary
 */
router.get('/summary', (req, res) => {
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      flowSummary: {
        totalInflows: 500000,
        totalOutflows: 400000,
        netFlow: 100000,
      },
      statistics: {
        averageDailyFlow: 3333,
        bestDay: {
          date: '2026-02-10',
          flow: 50000,
        },
        worstDay: {
          date: '2026-02-15',
          flow: -40000,
        },
      },
      metrics: {
        inflowVelocity: 0.5,
        outflowVelocity: 0.4,
        netVelocity: 0.45,
      },
      forecast: {
        projectedMonthlyFlow: 35000,
        confidence: 0.85,
      },
    };

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في جلب ملخص التدفقات',
      error: error.message,
    });
  }
});

/**
 * قائمة التدفقات النقدية
 * GET /api/finance/cashflow/statement
 */
router.get('/statement', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const statement = {
      timestamp: new Date().toISOString(),
      period: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString(),
      },
      operatingActivities: {
        inflows: 450000,
        outflows: 380000,
        netOperating: 70000,
      },
      investingActivities: {
        inflows: 50000,
        outflows: 20000,
        netInvesting: 30000,
      },
      financingActivities: {
        inflows: 0,
        outflows: 0,
        netFinancing: 0,
      },
      summary: {
        beginningCash: 200000,
        netCashFlow: 100000,
        endingCash: 300000,
      },
    };

    res.status(200).json(statement);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'خطأ في جلب قائمة التدفقات',
      error: error.message,
    });
  }
});

module.exports = router;
