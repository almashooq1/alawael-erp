/**
 * ===================================================================
 * ACCOUNTING VALIDATORS - التحقق من صحة البيانات المحاسبية
 * ===================================================================
 * النسخة: 1.0.0
 * التاريخ: 19 يناير 2026
 * ===================================================================
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * معالج أخطاء التحقق
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// ===================================================================
// 1. دليل الحسابات
// ===================================================================

const validateCreateAccount = [
  body('code')
    .notEmpty()
    .withMessage('كود الحساب مطلوب')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('كود الحساب يجب أن يكون بين 2-20 حرف')
    .matches(/^[A-Z0-9-]+$/i)
    .withMessage('كود الحساب يجب أن يحتوي على حروف وأرقام فقط'),

  body('name')
    .notEmpty()
    .withMessage('اسم الحساب مطلوب')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('اسم الحساب يجب أن يكون بين 2-200 حرف'),

  body('nameEn').optional().trim().isLength({ max: 200 }).withMessage('الاسم الإنجليزي طويل جداً'),

  body('type')
    .notEmpty()
    .withMessage('نوع الحساب مطلوب')
    .isIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
    .withMessage('نوع الحساب غير صحيح'),

  body('category')
    .optional()
    .isIn([
      'current_asset',
      'fixed_asset',
      'intangible_asset',
      'current_liability',
      'long_term_liability',
      'capital',
      'retained_earnings',
      'operating_revenue',
      'non_operating_revenue',
      'operating_expense',
      'administrative_expense',
      'financial_expense',
    ])
    .withMessage('فئة الحساب غير صحيحة'),

  body('parentId').optional().isMongoId().withMessage('معرف الحساب الأب غير صحيح'),

  body('currency').optional().isISO4217().withMessage('رمز العملة غير صحيح'),

  body('defaultTaxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('معدل الضريبة يجب أن يكون بين 0 و 1'),

  handleValidationErrors,
];

const validateUpdateAccount = [
  param('id').isMongoId().withMessage('معرف الحساب غير صحيح'),

  body('code')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('كود الحساب يجب أن يكون بين 2-20 حرف'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('اسم الحساب يجب أن يكون بين 2-200 حرف'),

  body('isActive').optional().isBoolean().withMessage('حالة الحساب يجب أن تكون true أو false'),

  handleValidationErrors,
];

// ===================================================================
// 2. قيود اليومية
// ===================================================================

const validateCreateJournalEntry = [
  body('date')
    .notEmpty()
    .withMessage('التاريخ مطلوب')
    .isISO8601()
    .withMessage('صيغة التاريخ غير صحيحة'),

  body('description')
    .notEmpty()
    .withMessage('الوصف مطلوب')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('الوصف يجب أن يكون بين 5-500 حرف'),

  body('type')
    .optional()
    .isIn(['manual', 'automatic', 'adjustment', 'closing', 'opening'])
    .withMessage('نوع القيد غير صحيح'),

  body('lines').isArray({ min: 2 }).withMessage('القيد يجب أن يحتوي على سطرين على الأقل'),

  body('lines.*.accountId')
    .notEmpty()
    .withMessage('معرف الحساب مطلوب')
    .isMongoId()
    .withMessage('معرف الحساب غير صحيح'),

  body('lines.*.debit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('المبلغ المدين يجب أن يكون رقم موجب'),

  body('lines.*.credit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('المبلغ الدائن يجب أن يكون رقم موجب'),

  body('lines.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('الوصف طويل جداً'),

  // التحقق من التوازن
  body('lines').custom(lines => {
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`مجموع المدين (${totalDebit}) يجب أن يساوي مجموع الدائن (${totalCredit})`);
    }

    return true;
  }),

  handleValidationErrors,
];

const validatePostJournalEntry = [
  param('id').isMongoId().withMessage('معرف القيد غير صحيح'),
  handleValidationErrors,
];

const validateReverseJournalEntry = [
  param('id').isMongoId().withMessage('معرف القيد غير صحيح'),

  body('reason')
    .notEmpty()
    .withMessage('سبب العكس مطلوب')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('السبب يجب أن يكون بين 5-500 حرف'),

  handleValidationErrors,
];

// ===================================================================
// 3. الفواتير
// ===================================================================

const validateCreateInvoice = [
  body('type')
    .notEmpty()
    .withMessage('نوع الفاتورة مطلوب')
    .isIn(['sales', 'purchase', 'return_sales', 'return_purchase'])
    .withMessage('نوع الفاتورة غير صحيح'),

  body('date')
    .notEmpty()
    .withMessage('التاريخ مطلوب')
    .isISO8601()
    .withMessage('صيغة التاريخ غير صحيحة'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('صيغة تاريخ الاستحقاق غير صحيحة')
    .custom((value, { req }) => {
      if (value && new Date(value) < new Date(req.body.date)) {
        throw new Error('تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة');
      }
      return true;
    }),

  body('customerName')
    .notEmpty()
    .withMessage('اسم العميل مطلوب')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('اسم العميل يجب أن يكون بين 2-200 حرف'),

  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),

  body('customerPhone')
    .optional()
    .matches(/^[+]?[0-9\s-()]+$/)
    .withMessage('رقم الهاتف غير صحيح'),

  body('items').isArray({ min: 1 }).withMessage('الفاتورة يجب أن تحتوي على صنف واحد على الأقل'),

  body('items.*.description')
    .notEmpty()
    .withMessage('وصف الصنف مطلوب')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('وصف الصنف يجب أن يكون بين 2-500 حرف'),

  body('items.*.quantity')
    .notEmpty()
    .withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.01 })
    .withMessage('الكمية يجب أن تكون أكبر من صفر'),

  body('items.*.unitPrice')
    .notEmpty()
    .withMessage('سعر الوحدة مطلوب')
    .isFloat({ min: 0 })
    .withMessage('سعر الوحدة يجب أن يكون رقم موجب'),

  body('items.*.taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('معدل الضريبة يجب أن يكون بين 0 و 1'),

  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('مبلغ الخصم يجب أن يكون رقم موجب'),

  handleValidationErrors,
];

const validateRecordPayment = [
  param('id').isMongoId().withMessage('معرف الفاتورة غير صحيح'),

  body('amount')
    .notEmpty()
    .withMessage('المبلغ مطلوب')
    .isFloat({ min: 0.01 })
    .withMessage('المبلغ يجب أن يكون أكبر من صفر'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('طريقة الدفع مطلوبة')
    .isIn(['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'other'])
    .withMessage('طريقة الدفع غير صحيحة'),

  body('paymentDate')
    .notEmpty()
    .withMessage('تاريخ الدفع مطلوب')
    .isISO8601()
    .withMessage('صيغة تاريخ الدفع غير صحيحة'),

  body('accountId')
    .notEmpty()
    .withMessage('معرف الحساب مطلوب')
    .isMongoId()
    .withMessage('معرف الحساب غير صحيح'),

  body('reference').optional().trim().isLength({ max: 100 }).withMessage('الرقم المرجعي طويل جداً'),

  handleValidationErrors,
];

// ===================================================================
// 4. المصروفات
// ===================================================================

const validateCreateExpense = [
  body('date')
    .notEmpty()
    .withMessage('التاريخ مطلوب')
    .isISO8601()
    .withMessage('صيغة التاريخ غير صحيحة'),

  body('category')
    .notEmpty()
    .withMessage('الفئة مطلوبة')
    .isIn([
      'salary',
      'rent',
      'utilities',
      'supplies',
      'maintenance',
      'marketing',
      'travel',
      'insurance',
      'professional_fees',
      'taxes',
      'other',
    ])
    .withMessage('الفئة غير صحيحة'),

  body('description')
    .notEmpty()
    .withMessage('الوصف مطلوب')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('الوصف يجب أن يكون بين 5-500 حرف'),

  body('amount')
    .notEmpty()
    .withMessage('المبلغ مطلوب')
    .isFloat({ min: 0.01 })
    .withMessage('المبلغ يجب أن يكون أكبر من صفر'),

  body('accountId')
    .notEmpty()
    .withMessage('معرف الحساب مطلوب')
    .isMongoId()
    .withMessage('معرف الحساب غير صحيح'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('طريقة الدفع مطلوبة')
    .isIn(['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card'])
    .withMessage('طريقة الدفع غير صحيحة'),

  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('معدل الضريبة يجب أن يكون بين 0 و 1'),

  handleValidationErrors,
];

const validateApproveExpense = [
  param('id').isMongoId().withMessage('معرف المصروف غير صحيح'),

  body('approved')
    .notEmpty()
    .withMessage('حالة الموافقة مطلوبة')
    .isBoolean()
    .withMessage('حالة الموافقة يجب أن تكون true أو false'),

  body('rejectionReason')
    .if(body('approved').equals(false))
    .notEmpty()
    .withMessage('سبب الرفض مطلوب')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('سبب الرفض يجب أن يكون بين 5-500 حرف'),

  handleValidationErrors,
];

// ===================================================================
// 5. الميزانية
// ===================================================================

const validateCreateBudget = [
  body('name')
    .notEmpty()
    .withMessage('اسم الميزانية مطلوب')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('الاسم يجب أن يكون بين 2-200 حرف'),

  body('fiscalYear')
    .notEmpty()
    .withMessage('السنة المالية مطلوبة')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('السنة المالية غير صحيحة'),

  body('period')
    .notEmpty()
    .withMessage('الفترة مطلوبة')
    .isIn(['annual', 'quarterly', 'monthly'])
    .withMessage('الفترة غير صحيحة'),

  body('startDate')
    .notEmpty()
    .withMessage('تاريخ البداية مطلوب')
    .isISO8601()
    .withMessage('صيغة تاريخ البداية غير صحيحة'),

  body('endDate')
    .notEmpty()
    .withMessage('تاريخ النهاية مطلوب')
    .isISO8601()
    .withMessage('صيغة تاريخ النهاية غير صحيحة')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
      return true;
    }),

  body('lines').isArray({ min: 1 }).withMessage('الميزانية يجب أن تحتوي على سطر واحد على الأقل'),

  body('lines.*.accountId')
    .notEmpty()
    .withMessage('معرف الحساب مطلوب')
    .isMongoId()
    .withMessage('معرف الحساب غير صحيح'),

  body('lines.*.amount')
    .notEmpty()
    .withMessage('المبلغ مطلوب')
    .isFloat({ min: 0 })
    .withMessage('المبلغ يجب أن يكون رقم موجب'),

  handleValidationErrors,
];

// ===================================================================
// 6. التقارير
// ===================================================================

const validateReportDateRange = [
  query('startDate').optional().isISO8601().withMessage('صيغة تاريخ البداية غير صحيحة'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('صيغة تاريخ النهاية غير صحيحة')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        if (new Date(value) < new Date(req.query.startDate)) {
          throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

const validateAsOfDate = [
  query('asOfDate').optional().isISO8601().withMessage('صيغة التاريخ غير صحيحة'),

  handleValidationErrors,
];

// ===================================================================
// 7. الاستعلامات العامة
// ===================================================================

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('رقم الصفحة يجب أن يكون رقم موجب'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('عدد السجلات يجب أن يكون بين 1-100'),

  handleValidationErrors,
];

const validateAccountId = [
  query('accountId').optional().isMongoId().withMessage('معرف الحساب غير صحيح'),

  handleValidationErrors,
];

// ===================================================================
// التصدير
// ===================================================================

module.exports = {
  // دليل الحسابات
  validateCreateAccount,
  validateUpdateAccount,

  // قيود اليومية
  validateCreateJournalEntry,
  validatePostJournalEntry,
  validateReverseJournalEntry,

  // الفواتير
  validateCreateInvoice,
  validateRecordPayment,

  // المصروفات
  validateCreateExpense,
  validateApproveExpense,

  // الميزانية
  validateCreateBudget,

  // التقارير
  validateReportDateRange,
  validateAsOfDate,

  // عام
  validatePagination,
  validateAccountId,

  // معالج الأخطاء
  handleValidationErrors,
};
