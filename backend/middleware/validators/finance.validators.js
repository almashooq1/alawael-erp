/**
 * Finance Validation Rules
 * قواعد التحقق للوحدة المالية
 */

const { body } = require('express-validator');
const {
  paginationRules,
  dateRangeRules,
  amountField,
  optionalAmount,
  requiredString,
  optionalString,
  optionalDate,
  requiredEnum,
  optionalEnum,
  optionalArray,
  requiredFloat,
  queryEnum,
} = require('./common.validators');

// ═══ TRANSACTIONS ════════════════════════════════════════════════════════════

const createTransaction = [
  amountField('amount', 'المبلغ'),
  requiredEnum('type', 'نوع المعاملة', ['income', 'expense', 'transfer']),
  requiredString('description', 'الوصف', { max: 1000 }),
  optionalString('category', 'الفئة', { max: 100 }),
  optionalDate('date', 'التاريخ'),
  optionalArray('tags', 'الوسوم'),
  optionalString('notes', 'الملاحظات', { max: 2000 }),
  optionalArray('receipts', 'الإيصالات'),
];

const updateTransaction = [
  optionalString('description', 'الوصف', { max: 1000 }),
  optionalString('category', 'الفئة', { max: 100 }),
  optionalDate('date', 'التاريخ'),
  optionalArray('tags', 'الوسوم'),
  optionalString('notes', 'الملاحظات', { max: 2000 }),
  optionalEnum('status', 'الحالة', ['pending', 'completed', 'cancelled', 'reversed', 'verified']),
];

const patchTransactionStatus = [
  body('status')
    .notEmpty()
    .withMessage('الحالة مطلوبة')
    .isString()
    .withMessage('الحالة يجب أن تكون نصاً'),
];

const addTransactionReceipt = [body('receipt').notEmpty().withMessage('الإيصال مطلوب')];

const reverseTransaction = [optionalString('reason', 'سبب العكس', { max: 500 })];

const listTransactions = [
  ...paginationRules,
  ...dateRangeRules,
  queryEnum('type', 'النوع', ['income', 'expense', 'transfer']),
  queryEnum('status', 'الحالة', ['pending', 'completed', 'cancelled', 'reversed']),
];

// ═══ BUDGETS ═════════════════════════════════════════════════════════════════

const createBudget = [
  requiredString('name', 'اسم الميزانية', { max: 200 }),
  requiredFloat('limit', 'الحد الأقصى', { min: 0 }),
  optionalString('category', 'الفئة', { max: 100 }),
  optionalEnum('period', 'الفترة', ['monthly', 'quarterly', 'yearly', 'custom']),
  optionalDate('startDate', 'تاريخ البداية'),
  optionalDate('endDate', 'تاريخ النهاية'),
];

const updateBudget = [
  optionalString('name', 'اسم الميزانية', { max: 200 }),
  optionalAmount('limit', 'الحد الأقصى'),
  optionalString('category', 'الفئة', { max: 100 }),
  optionalEnum('period', 'الفترة', ['monthly', 'quarterly', 'yearly', 'custom']),
  optionalDate('startDate', 'تاريخ البداية'),
  optionalDate('endDate', 'تاريخ النهاية'),
];

// ═══ RECONCILIATION ══════════════════════════════════════════════════════════

const reconcile = [
  optionalAmount('bankBalance', 'رصيد البنك'),
  optionalDate('statementDate', 'تاريخ الكشف'),
];

const resolveDiscrepancy = [
  optionalString('resolution', 'الحل', { max: 1000 }),
  optionalString('note', 'ملاحظة', { max: 1000 }),
];

const validateBalance = [
  body('expectedBalance').optional().isFloat().withMessage('الرصيد المتوقع يجب أن يكون رقماً'),
];

// ═══ PAYMENTS ════════════════════════════════════════════════════════════════

const createPayment = [
  amountField('amount', 'المبلغ'),
  requiredString('payee', 'المستفيد', { max: 200 }),
  optionalEnum('method', 'طريقة الدفع', [
    'cash',
    'bank_transfer',
    'check',
    'credit_card',
    'online',
  ]),
  optionalDate('dueDate', 'تاريخ الاستحقاق'),
  optionalString('description', 'الوصف', { max: 1000 }),
];

const completePayment = [
  optionalDate('completedDate', 'تاريخ الإكمال'),
  optionalString('confirmationNumber', 'رقم التأكيد', { max: 100 }),
];

const cancelPayment = [optionalString('reason', 'السبب', { max: 500 })];

// ═══ INVOICES ════════════════════════════════════════════════════════════════

const createInvoice = [
  requiredString('clientName', 'اسم العميل', { max: 200 }),
  amountField('amount', 'المبلغ'),
  optionalDate('dueDate', 'تاريخ الاستحقاق'),
  optionalString('description', 'الوصف', { max: 1000 }),
];

module.exports = {
  createTransaction,
  updateTransaction,
  patchTransactionStatus,
  addTransactionReceipt,
  reverseTransaction,
  listTransactions,
  createBudget,
  updateBudget,
  reconcile,
  resolveDiscrepancy,
  validateBalance,
  createPayment,
  completePayment,
  cancelPayment,
  createInvoice,
};
