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

// ═══ JOURNAL ENTRIES ═════════════════════════════════════════════════════════

const createJournalEntry = [
  optionalString('reference', 'المرجع', { max: 100 }),
  requiredString('description', 'الوصف', { max: 1000 }),
  optionalEnum('type', 'نوع القيد', ['manual', 'automatic', 'adjustment', 'closing', 'opening']),
  optionalDate('date', 'التاريخ'),
  body('lines')
    .isArray({ min: 2 })
    .withMessage('القيد يجب أن يحتوي على سطرين على الأقل'),
  body('lines.*.accountId')
    .notEmpty()
    .withMessage('معرف الحساب مطلوب لكل سطر'),
  body('lines.*.debit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('المدين يجب أن يكون رقماً موجباً'),
  body('lines.*.credit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('الدائن يجب أن يكون رقماً موجباً'),
];

const postJournalEntry = [];

const reverseJournalEntry = [
  requiredString('reason', 'سبب العكس', { max: 500 }),
];

const listJournalEntries = [
  ...paginationRules,
  ...dateRangeRules,
  queryEnum('status', 'الحالة', ['draft', 'posted', 'cancelled']),
  queryEnum('type', 'النوع', ['manual', 'automatic', 'adjustment', 'closing', 'opening']),
];

// ═══ ACCOUNTS (CHART OF ACCOUNTS) ═══════════════════════════════════════════

const createAccount = [
  requiredString('code', 'كود الحساب', { max: 50 }),
  requiredString('name', 'اسم الحساب', { max: 200 }),
  optionalString('nameEn', 'الاسم بالإنجليزية', { max: 200 }),
  requiredEnum('type', 'نوع الحساب', ['asset', 'liability', 'equity', 'revenue', 'expense']),
  optionalEnum('category', 'التصنيف', [
    'current_asset', 'fixed_asset', 'intangible_asset', 'cash', 'bank',
    'accounts_receivable', 'inventory', 'current_liability', 'long_term_liability',
    'accounts_payable', 'capital', 'retained_earnings', 'operating_revenue',
    'operating_expense',
  ]),
  optionalString('parentId', 'الحساب الرئيسي', { max: 50 }),
  body('isPostable').optional().isBoolean().withMessage('قابلية الترحيل يجب أن تكون قيمة منطقية'),
  body('defaultTaxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('نسبة الضريبة يجب أن تكون بين 0 و 1'),
];

const updateAccount = [
  optionalString('name', 'اسم الحساب', { max: 200 }),
  optionalString('nameEn', 'الاسم بالإنجليزية', { max: 200 }),
  optionalEnum('category', 'التصنيف', [
    'current_asset', 'fixed_asset', 'intangible_asset', 'cash', 'bank',
    'accounts_receivable', 'inventory', 'current_liability', 'long_term_liability',
    'accounts_payable', 'capital', 'retained_earnings', 'operating_revenue',
    'operating_expense',
  ]),
  body('isActive').optional().isBoolean().withMessage('حالة النشاط يجب أن تكون قيمة منطقية'),
  body('isPostable').optional().isBoolean().withMessage('قابلية الترحيل يجب أن تكون قيمة منطقية'),
];

// ═══ FISCAL PERIODS ══════════════════════════════════════════════════════════

const createFiscalPeriod = [
  requiredString('name', 'اسم الفترة', { max: 200 }),
  requiredString('code', 'كود الفترة', { max: 50 }),
  requiredEnum('periodType', 'نوع الفترة', ['month', 'quarter', 'semi_annual', 'annual']),
  body('fiscalYear')
    .notEmpty()
    .withMessage('السنة المالية مطلوبة')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('السنة المالية يجب أن تكون بين 2000 و 2100'),
  body('startDate')
    .notEmpty()
    .withMessage('تاريخ البداية مطلوب')
    .isISO8601()
    .withMessage('تاريخ البداية يجب أن يكون بصيغة صحيحة'),
  body('endDate')
    .notEmpty()
    .withMessage('تاريخ النهاية مطلوب')
    .isISO8601()
    .withMessage('تاريخ النهاية يجب أن يكون بصيغة صحيحة'),
];

const updateFiscalPeriod = [
  optionalString('name', 'اسم الفترة', { max: 200 }),
  optionalEnum('status', 'الحالة', ['open', 'closing', 'closed', 'locked']),
];

const generateFiscalPeriods = [
  body('fiscalYear')
    .notEmpty()
    .withMessage('السنة المالية مطلوبة')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('السنة المالية يجب أن تكون بين 2000 و 2100'),
  requiredEnum('periodType', 'نوع الفترة', ['month', 'quarter', 'semi_annual', 'annual']),
];

const listFiscalPeriods = [
  ...paginationRules,
  body('fiscalYear').optional().isInt({ min: 2000, max: 2100 }).withMessage('السنة المالية غير صحيحة'),
  queryEnum('periodType', 'نوع الفترة', ['month', 'quarter', 'semi_annual', 'annual']),
  queryEnum('status', 'الحالة', ['open', 'closing', 'closed', 'locked']),
];

// ═══ EXPENSES ════════════════════════════════════════════════════════════════

const createExpense = [
  requiredString('category', 'فئة المصروف', { max: 100 }),
  requiredString('description', 'الوصف', { max: 1000 }),
  amountField('amount', 'المبلغ'),
  optionalDate('date', 'التاريخ'),
  optionalString('vendor', 'المورد', { max: 200 }),
  optionalEnum('paymentMethod', 'طريقة الدفع', [
    'cash', 'bank_transfer', 'check', 'credit_card', 'debit_card',
  ]),
  body('isTaxable').optional().isBoolean().withMessage('خاضع للضريبة يجب أن تكون قيمة منطقية'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('نسبة الضريبة يجب أن تكون بين 0 و 1'),
];

const updateExpense = [
  optionalString('category', 'فئة المصروف', { max: 100 }),
  optionalString('description', 'الوصف', { max: 1000 }),
  optionalAmount('amount', 'المبلغ'),
  optionalDate('date', 'التاريخ'),
  optionalString('vendor', 'المورد', { max: 200 }),
  optionalEnum('status', 'الحالة', ['pending', 'approved', 'rejected', 'paid']),
];

const approveExpense = [
  optionalString('notes', 'ملاحظات', { max: 500 }),
];

const rejectExpense = [
  requiredString('rejectionReason', 'سبب الرفض', { max: 500 }),
];

// ═══ FINANCIAL REPORTS ═══════════════════════════════════════════════════════

const reportDateRange = [
  ...dateRangeRules,
];

const reportAsOfDate = [
  optionalDate('asOfDate', 'التاريخ'),
];

module.exports = {
  // Transactions
  createTransaction,
  updateTransaction,
  patchTransactionStatus,
  addTransactionReceipt,
  reverseTransaction,
  listTransactions,
  // Budgets
  createBudget,
  updateBudget,
  // Reconciliation
  reconcile,
  resolveDiscrepancy,
  validateBalance,
  // Payments
  createPayment,
  completePayment,
  cancelPayment,
  // Invoices
  createInvoice,
  // Journal Entries
  createJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  listJournalEntries,
  // Accounts
  createAccount,
  updateAccount,
  // Fiscal Periods
  createFiscalPeriod,
  updateFiscalPeriod,
  generateFiscalPeriods,
  listFiscalPeriods,
  // Expenses
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  // Reports
  reportDateRange,
  reportAsOfDate,
};
