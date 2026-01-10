const express = require('express');
const router = express.Router();
const { Invoice, Expense, Budget, Payment } = require('../models/Finance.memory');
const { authenticateToken } = require('../middleware/auth');

// 🔐 يتطلب مصادقة
router.use(authenticateToken);

// ==================== INVOICES ====================

/**
 * @route   POST /api/finance/invoices
 * @desc    إنشاء فاتورة جديدة
 */
router.post('/invoices', (req, res) => {
  try {
    const { clientName, clientEmail, amount, items, dueDate } = req.body;

    if (!clientName || !amount) {
      return res.status(400).json({
        success: false,
        message: 'clientName و amount مطلوبة',
      });
    }

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
});

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
router.get('/invoices/:id', (req, res) => {
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
});

/**
 * @route   PUT /api/finance/invoices/:id
 * @desc    تحديث فاتورة
 */
router.put('/invoices/:id', (req, res) => {
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
});

/**
 * @route   DELETE /api/finance/invoices/:id
 * @desc    حذف فاتورة
 */
router.delete('/invoices/:id', (req, res) => {
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
});

// ==================== EXPENSES ====================

/**
 * @route   POST /api/finance/expenses
 * @desc    تسجيل نفقة جديدة
 */
router.post('/expenses', (req, res) => {
  try {
    const { category, description, amount, vendor } = req.body;

    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'category و amount مطلوبة',
      });
    }

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
});

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
router.patch('/expenses/:id/approve', (req, res) => {
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
});

// ==================== BUDGETS ====================

/**
 * @route   POST /api/finance/budgets
 * @desc    إنشاء ميزانية جديدة
 */
router.post('/budgets', (req, res) => {
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
      summary.totalRevenue > 0 ? (((summary.totalRevenue - summary.totalExpenses) / summary.totalRevenue) * 100).toFixed(2) : 0;

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
