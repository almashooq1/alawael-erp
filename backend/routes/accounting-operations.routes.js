/**
 * Accounting Operations Routes — مسارات العمليات المحاسبية
 * Wires existing controllers: accounting-expense, accounting-payment
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

const expenseCtrl = require('../controllers/accounting-expense.controller');
const paymentCtrl = require('../controllers/accounting-payment.controller');

/* ── Expenses — المصروفات المحاسبية ──────────────────────────── */
router.get('/expenses', requireAuth, requireBranchAccess, expenseCtrl.getAllExpenses);
router.get('/expenses/stats', requireAuth, requireBranchAccess, expenseCtrl.getExpenseStats);
router.get('/expenses/:id', requireAuth, requireBranchAccess, expenseCtrl.getExpenseById);
router.post('/expenses', requireAuth, requireBranchAccess, expenseCtrl.createExpense);
router.put('/expenses/:id', requireAuth, requireBranchAccess, expenseCtrl.updateExpense);
router.delete('/expenses/:id', requireAuth, requireBranchAccess, expenseCtrl.deleteExpense);
router.post('/expenses/:id/approve', requireAuth, requireBranchAccess, expenseCtrl.approveExpense);
router.post('/expenses/:id/reject', requireAuth, requireBranchAccess, expenseCtrl.rejectExpense);

/* ── Payments — المدفوعات المحاسبية ──────────────────────────── */
router.get('/payments', requireAuth, requireBranchAccess, paymentCtrl.getAllPayments);
router.get('/payments/stats', requireAuth, requireBranchAccess, paymentCtrl.getPaymentStats);
router.get('/payments/:id', requireAuth, requireBranchAccess, paymentCtrl.getPaymentById);
router.post('/payments', requireAuth, requireBranchAccess, paymentCtrl.createPayment);
router.put('/payments/:id', requireAuth, requireBranchAccess, paymentCtrl.updatePayment);
router.delete('/payments/:id', requireAuth, requireBranchAccess, paymentCtrl.deletePayment);
router.get('/payments/:id/receipt', requireAuth, requireBranchAccess, paymentCtrl.downloadReceipt);

/* ── Index ───────────────────────────────────────────────────── */
router.get('/', requireAuth, requireBranchAccess, (_req, res) => {
  res.json({
    success: true,
    modules: ['expenses', 'payments'],
  });
});

module.exports = router;
