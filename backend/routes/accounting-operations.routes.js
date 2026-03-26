/**
 * Accounting Operations Routes — مسارات العمليات المحاسبية
 * Wires existing controllers: accounting-expense, accounting-payment
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const expenseCtrl = require('../controllers/accounting-expense.controller');
const paymentCtrl = require('../controllers/accounting-payment.controller');

/* ── Expenses — المصروفات المحاسبية ──────────────────────────── */
router.get('/expenses', requireAuth, expenseCtrl.getAllExpenses);
router.get('/expenses/stats', requireAuth, expenseCtrl.getExpenseStats);
router.get('/expenses/:id', requireAuth, expenseCtrl.getExpenseById);
router.post('/expenses', requireAuth, expenseCtrl.createExpense);
router.put('/expenses/:id', requireAuth, expenseCtrl.updateExpense);
router.delete('/expenses/:id', requireAuth, expenseCtrl.deleteExpense);
router.post('/expenses/:id/approve', requireAuth, expenseCtrl.approveExpense);
router.post('/expenses/:id/reject', requireAuth, expenseCtrl.rejectExpense);

/* ── Payments — المدفوعات المحاسبية ──────────────────────────── */
router.get('/payments', requireAuth, paymentCtrl.getAllPayments);
router.get('/payments/stats', requireAuth, paymentCtrl.getPaymentStats);
router.get('/payments/:id', requireAuth, paymentCtrl.getPaymentById);
router.post('/payments', requireAuth, paymentCtrl.createPayment);
router.put('/payments/:id', requireAuth, paymentCtrl.updatePayment);
router.delete('/payments/:id', requireAuth, paymentCtrl.deletePayment);
router.get('/payments/:id/receipt', requireAuth, paymentCtrl.downloadReceipt);

/* ── Index ───────────────────────────────────────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: ['expenses', 'payments'],
  });
});

module.exports = router;
