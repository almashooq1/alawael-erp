/**
 * Common Validation Chains
 * سلاسل تحقق مشتركة قابلة لإعادة الاستخدام
 *
 * Usage:
 *   const { validate } = require('../validate');
 *   const { mongoId, paginationRules, dateRangeRules } = require('../validators/common.validators');
 *
 *   router.get('/items/:id', validate([mongoId('id')]), handler);
 *   router.get('/items', validate([...paginationRules, ...dateRangeRules]), handler);
 */

const { body, param, query } = require('express-validator');

// ─── Param Validators ───────────────────────────────────────────────────────

/** Validate a MongoDB ObjectId param (default 'id') */
const mongoId = (name = 'id') => param(name).isMongoId().withMessage(`معرف ${name} غير صالح`);

// ─── Pagination & Sorting ───────────────────────────────────────────────────

const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('رقم الصفحة يجب أن يكون رقماً موجباً'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .toInt()
    .withMessage('الحد يجب أن يكون بين 1 و 200'),
  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z_,]+$/)
    .withMessage('حقل الترتيب غير صالح'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('نص البحث طويل جداً'),
];

// ─── Date Range ─────────────────────────────────────────────────────────────

const dateRangeRules = [
  query('startDate').optional().isISO8601().withMessage('تاريخ البداية غير صالح'),
  query('endDate').optional().isISO8601().withMessage('تاريخ النهاية غير صالح'),
  query('from').optional().isISO8601().withMessage('تاريخ البداية غير صالح'),
  query('to').optional().isISO8601().withMessage('تاريخ النهاية غير صالح'),
];

// ─── Money / Amount ─────────────────────────────────────────────────────────

const amountField = (field = 'amount', label = 'المبلغ') =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isFloat({ min: 0 })
    .withMessage(`${label} يجب أن يكون رقماً موجباً`)
    .toFloat();

const optionalAmount = (field = 'amount', label = 'المبلغ') =>
  body(field)
    .optional()
    .isFloat({ min: 0 })
    .withMessage(`${label} يجب أن يكون رقماً موجباً`)
    .toFloat();

// ─── String fields ──────────────────────────────────────────────────────────

const requiredString = (field, label, { min = 1, max = 500 } = {}) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isString()
    .withMessage(`${label} يجب أن يكون نصاً`)
    .trim()
    .isLength({ min, max })
    .withMessage(`${label} يجب أن يكون بين ${min} و ${max} حرف`);

const optionalString = (field, label, { min = 1, max = 500 } = {}) =>
  body(field)
    .optional()
    .isString()
    .withMessage(`${label} يجب أن يكون نصاً`)
    .trim()
    .isLength({ min, max })
    .withMessage(`${label} يجب أن يكون بين ${min} و ${max} حرف`);

// ─── Email / Phone ──────────────────────────────────────────────────────────

const emailField = (field = 'email', required = true) => {
  const chain = body(field);
  if (!required) chain.optional();
  return chain.isEmail().withMessage('البريد الإلكتروني غير صالح').normalizeEmail();
};

const phoneField = (field = 'phone', required = false) => {
  const chain = body(field);
  if (!required) chain.optional();
  return chain.matches(/^(\+966|0)?5\d{8}$/).withMessage('رقم الجوال غير صالح');
};

// ─── Date ───────────────────────────────────────────────────────────────────

const requiredDate = (field, label) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isISO8601()
    .withMessage(`${label} يجب أن يكون تاريخاً صالحاً`);

const optionalDate = (field, label) =>
  body(field).optional().isISO8601().withMessage(`${label} يجب أن يكون تاريخاً صالحاً`);

// ─── Enum / In ──────────────────────────────────────────────────────────────

const requiredEnum = (field, label, values) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isIn(values)
    .withMessage(`${label} يجب أن يكون: ${values.join(', ')}`);

const optionalEnum = (field, label, values) =>
  body(field)
    .optional()
    .isIn(values)
    .withMessage(`${label} يجب أن يكون: ${values.join(', ')}`);

// ─── Integer / Number ───────────────────────────────────────────────────────

const requiredInt = (field, label, { min = 0, max = 999999 } = {}) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isInt({ min, max })
    .withMessage(`${label} يجب أن يكون بين ${min} و ${max}`)
    .toInt();

const optionalInt = (field, label, { min = 0, max = 999999 } = {}) =>
  body(field)
    .optional()
    .isInt({ min, max })
    .withMessage(`${label} يجب أن يكون بين ${min} و ${max}`)
    .toInt();

const requiredFloat = (field, label, { min = 0 } = {}) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isFloat({ min })
    .withMessage(`${label} يجب أن يكون رقماً صالحاً`)
    .toFloat();

const optionalFloat = (field, label, { min = 0 } = {}) =>
  body(field)
    .optional()
    .isFloat({ min })
    .withMessage(`${label} يجب أن يكون رقماً صالحاً`)
    .toFloat();

// ─── Boolean ────────────────────────────────────────────────────────────────

const optionalBool = (field, label) =>
  body(field).optional().isBoolean().withMessage(`${label} يجب أن يكون true أو false`).toBoolean();

// ─── Array ──────────────────────────────────────────────────────────────────

const requiredArray = (field, label, { min = 1 } = {}) =>
  body(field).isArray({ min }).withMessage(`${label} يجب أن يحتوي على ${min} عنصر على الأقل`);

const optionalArray = (field, label) =>
  body(field).optional().isArray().withMessage(`${label} يجب أن يكون مصفوفة`);

// ─── MongoId in body ────────────────────────────────────────────────────────

const bodyMongoId = (field, label, required = true) => {
  const chain = body(field);
  if (!required) chain.optional();
  return chain.isMongoId().withMessage(`${label} غير صالح`);
};

// ─── Query enum ─────────────────────────────────────────────────────────────

const queryEnum = (field, label, values) =>
  query(field)
    .optional()
    .isIn(values)
    .withMessage(`${label} يجب أن يكون: ${values.join(', ')}`);

const queryString = (field, label, { max = 200 } = {}) =>
  query(field).optional().isString().trim().isLength({ max }).withMessage(`${label} طويل جداً`);

module.exports = {
  // Params
  mongoId,
  // Pagination & dates
  paginationRules,
  dateRangeRules,
  // Body fields
  amountField,
  optionalAmount,
  requiredString,
  optionalString,
  emailField,
  phoneField,
  requiredDate,
  optionalDate,
  requiredEnum,
  optionalEnum,
  requiredInt,
  optionalInt,
  requiredFloat,
  optionalFloat,
  optionalBool,
  requiredArray,
  optionalArray,
  bodyMongoId,
  // Query fields
  queryEnum,
  queryString,
};
