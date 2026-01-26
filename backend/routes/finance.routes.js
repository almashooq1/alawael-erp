const express = require('express');
const router = express.Router();
const { Invoice, Expense, Budget, Payment } = require('../models/Finance.memory');
const { authenticateToken } = require('../middleware/auth');

const { apiLimiter } = require('../middleware/rateLimiter');
const {
  sanitizeInput,
  commonValidations,
  handleValidationErrors,
} = require('../middleware/requestValidation');
const { body, param } = require('express-validator');

// Apply global protections
router.use(authenticateToken);
router.use(apiLimiter);
router.use(sanitizeInput);

// ==================== INVOICES ====================

/**
 * @route   POST /api/finance/invoices
 * @desc    إنشاء فاتورة جديدة
 */
router.post(
  '/invoices',
  [
    body('clientName')
      .isString()
      .isLength({ min: 2, max: 200 })
      .withMessage('Client name required'),
    body('amount')
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 1000000;
      })
      .withMessage('Invalid amount'),
    body('clientEmail').optional().isEmail().withMessage('Invalid email'),
    body('items').optional().isArray({ max: 100 }),
    body('dueDate').optional().isISO8601(),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { clientName, clientEmail, amount, items, dueDate } = req.body;

      const invoice = Invoice.create({
        clientName,
        clientEmail,
        amount,
        items,
        dueDate,
      });

      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/finance/invoices
 * @desc    الحصول على جميع الفواتير
 */
router.get('/invoices', (req, res) => {
  try {
    const invoices = Invoice.findAll();
    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/finance/invoices/:id
 * @desc    الحصول على فاتورة بمعرفها
 */
router.get(
  '/invoices/:id',
  [param('id').isString().isLength({ min: 2 }).withMessage('Invalid ID'), handleValidationErrors],
  (req, res) => {
    try {
      const invoice = Invoice.findById(req.params.id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة',
        });
      }
      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/finance/invoices/:id
 * @desc    تحديث فاتورة
 */
router.put(
  '/invoices/:id',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid ID'),
    body('clientName').optional().isString().isLength({ min: 2, max: 200 }),
    body('amount')
      .optional()
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 1000000;
      }),
    body('clientEmail').optional().isEmail(),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const invoice = Invoice.updateById(req.params.id, req.body);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة',
        });
      }
      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/finance/invoices/:id
 * @desc    حذف فاتورة
 */
router.delete(
  '/invoices/:id',
  [param('id').isString().isLength({ min: 2 }).withMessage('Invalid ID'), handleValidationErrors],
  (req, res) => {
    try {
      const deleted = Invoice.deleteById(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة',
        });
      }
      res.json({
        success: true,
        message: 'تم حذف الفاتورة بنجاح',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ==================== EXPENSES ====================

/**
 * @route   POST /api/finance/expenses
 * @desc    تسجيل نفقة جديدة
 */
router.post(
  '/expenses',
  [
    body('category').isString().isLength({ min: 2, max: 100 }).withMessage('Category required'),
    body('amount')
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 1000000;
      })
      .withMessage('Invalid amount'),
    body('description').optional().isString().isLength({ max: 500 }),
    body('vendor').optional().isString().isLength({ max: 200 }),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { category, description, amount, vendor } = req.body;

      const expense = Expense.create({
        category,
        description,
        amount,
        vendor,
      });

      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/finance/expenses
 * @desc    الحصول على جميع النفقات
 */
router.get('/expenses', (req, res) => {
  try {
    const expenses = Expense.findAll();
    const stats = Expense.getByCategoryStats();

    res.json({
      success: true,
      data: {
        expenses,
        totalExpenses: Expense.getTotalExpenses(),
        byCategory: stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PATCH /api/finance/expenses/:id/approve
 * @desc    الموافقة على نفقة
 */
router.patch(
  '/expenses/:id/approve',
  [param('id').isString().isLength({ min: 2 }).withMessage('Invalid ID'), handleValidationErrors],
  (req, res) => {
    try {
      const expense = Expense.updateById(req.params.id, { status: 'approved' });
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'النفقة غير موجودة',
        });
      }
      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ==================== BUDGETS ====================

/**
 * @route   POST /api/finance/budgets
 * @desc    إنشاء ميزانية جديدة
 */
router.post(
  '/budgets',
  [
    body('year').isInt({ min: 2020, max: 2100 }).toInt().withMessage('Valid year required'),
    body('month').optional().isInt({ min: 1, max: 12 }).toInt().withMessage('Month must be 1-12'),
    body('categories').optional().isObject(),
    body('notes').optional().isString().isLength({ max: 1000 }),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { year, month, categories, notes } = req.body;

      const budget = Budget.create({
        year,
        month,
        categories,
        notes,
      });

      res.status(201).json({
        success: true,
        data: budget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/finance/budgets/current
 * @desc    الحصول على الميزانية الحالية
 */
router.get('/budgets', (req, res) => {
  try {
    const budgets = Budget.findAll();
    res.json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/finance/budgets/current
 * @desc    الحصول على الميزانية الحالية
 */
router.get('/budgets/current', (req, res) => {
  try {
    const budget = Budget.getCurrentBudget();
    const totalBudget = Budget.getTotalBudget();

    res.json({
      success: true,
      data: {
        budget,
        totalBudget,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== PAYMENTS ====================

/**
 * @route   POST /api/finance/payments
 * @desc    تسجيل دفعة
 */
router.post('/payments', (req, res) => {
  try {
    const { invoiceId, amount, method, reference, notes } = req.body;

    if (!invoiceId || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'invoiceId و amount و method مطلوبة',
      });
    }

    const payment = Payment.recordPayment({
      invoiceId,
      amount,
      method,
      reference,
      notes,
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/finance/payments
 * @desc    الحصول على جميع الدفعات
 */
router.get('/payments', (req, res) => {
  try {
    const payments = Payment.getAllPayments();
    const totalPayments = Payment.getTotalPayments();
    const totalRevenue = Invoice.getTotalRevenue();

    res.json({
      success: true,
      data: {
        payments,
        totalPayments,
        totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/finance/summary
 * @desc    ملخص مالي شامل
 */
router.get('/summary', (req, res) => {
  try {
    const summary = {
      totalInvoices: Invoice.findAll().length,
      totalRevenue: Invoice.getTotalRevenue(),
      pendingInvoices: Invoice.findAll().filter(i => i.status === 'pending').length,
      totalExpenses: Expense.getTotalExpenses(),
      totalBudget: Budget.getTotalBudget(),
      balance: Invoice.getTotalRevenue() - Expense.getTotalExpenses(),
      profitMargin: 0,
    };

    summary.profitMargin =
      summary.totalRevenue > 0
        ? (((summary.totalRevenue - summary.totalExpenses) / summary.totalRevenue) * 100).toFixed(2)
        : 0;

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

