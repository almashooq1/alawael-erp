/**
 * Shared Validation Schemas — مخططات التحقق المشتركة
 *
 * Reusable express-validator chains for common fields across the ERP.
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   const { schemas } = require('../middleware/validationSchemas');
 *   router.post('/items', validate(schemas.create.item), handler);
 */

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// ─── Atomic Field Validators ─────────────────────────────────────────────────

const isMongoId = (field, label = field) =>
  param(field)
    .trim()
    .custom(v => mongoose.Types.ObjectId.isValid(v))
    .withMessage(`${label} يجب أن يكون معرّف صالح`);

const requiredString = (field, label = field, { min = 1, max = 500 } = {}) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isLength({ min, max })
    .withMessage(`${label} يجب أن يكون بين ${min} و ${max} حرفاً`);

const optionalString = (field, label = field, { max = 500 } = {}) =>
  body(field)
    .optional()
    .trim()
    .isLength({ max })
    .withMessage(`${label} يجب ألا يزيد عن ${max} حرفاً`);

const requiredEmail = (field = 'email') =>
  body(field).trim().isEmail().withMessage('البريد الإلكتروني غير صالح');

const requiredPhone = (field = 'phone') =>
  body(field)
    .trim()
    .matches(/^[\d+\-() ]{7,20}$/)
    .withMessage('رقم الهاتف غير صالح');

const optionalPhone = (field = 'phone') =>
  body(field)
    .optional()
    .trim()
    .matches(/^[\d+\-() ]{7,20}$/)
    .withMessage('رقم الهاتف غير صالح');

const requiredDate = (field, label = field) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isISO8601()
    .withMessage(`${label} تاريخ غير صالح`);

const optionalDate = (field, label = field) =>
  body(field).optional().isISO8601().withMessage(`${label} تاريخ غير صالح`);

const requiredNumber = (field, label = field, { min = 0 } = {}) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isNumeric()
    .withMessage(`${label} يجب أن يكون رقماً`)
    .custom(v => Number(v) >= min)
    .withMessage(`${label} يجب أن يكون ${min} على الأقل`);

const optionalNumber = (field, label = field, { min = 0 } = {}) =>
  body(field)
    .optional()
    .isNumeric()
    .withMessage(`${label} يجب أن يكون رقماً`)
    .custom(v => Number(v) >= min)
    .withMessage(`${label} يجب أن يكون ${min} على الأقل`);

const requiredEnum = (field, values, label = field) =>
  body(field)
    .notEmpty()
    .withMessage(`${label} مطلوب`)
    .isIn(values)
    .withMessage(`${label} يجب أن يكون أحد: ${values.join(', ')}`);

const optionalEnum = (field, values, label = field) =>
  body(field)
    .optional()
    .isIn(values)
    .withMessage(`${label} يجب أن يكون أحد: ${values.join(', ')}`);

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('رقم الصفحة غير صالح'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('حد النتائج غير صالح (1-200)'),
];

const mongoIdParam = (field = 'id') => isMongoId(field);

// ─── Composite Schemas ──────────────────────────────────────────────────────

const schemas = {
  // ── Employee Affairs ──
  employeeAffairs: {
    createEmployee: [
      requiredString('name', 'الاسم'),
      requiredString('employeeNumber', 'الرقم الوظيفي'),
      optionalString('department', 'القسم'),
      optionalEmail(),
      optionalPhone(),
    ],
    createLeaveRequest: [
      requiredString('leaveType', 'نوع الإجازة'),
      requiredDate('startDate', 'تاريخ البداية'),
      requiredDate('endDate', 'تاريخ النهاية'),
      optionalString('reason', 'السبب', { max: 1000 }),
    ],
  },

  // ── Payroll ──
  payroll: {
    runPayroll: [
      requiredString('month', 'الشهر'),
      requiredString('year', 'السنة'),
      optionalEnum('status', ['DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'], 'الحالة'),
    ],
  },

  // ── Training ──
  training: {
    createProgram: [
      requiredString('title', 'العنوان'),
      optionalString('description', 'الوصف', { max: 2000 }),
      optionalDate('startDate', 'تاريخ البداية'),
      optionalDate('endDate', 'تاريخ النهاية'),
      optionalNumber('capacity', 'السعة', { min: 1 }),
    ],
  },

  // ── Help Desk ──
  helpdesk: {
    createTicket: [
      requiredString('subject', 'الموضوع'),
      requiredString('description', 'الوصف', { max: 5000 }),
      optionalEnum('priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 'الأولوية'),
      optionalEnum('category', ['IT', 'HR', 'FINANCE', 'OPERATIONS', 'OTHER'], 'القسم'),
    ],
  },

  // ── HSE (Health Safety Environment) ──
  hse: {
    reportIncident: [
      requiredString('title', 'العنوان'),
      requiredString('description', 'الوصف', { max: 5000 }),
      requiredDate('incidentDate', 'تاريخ الحادث'),
      optionalEnum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'الخطورة'),
      optionalString('location', 'الموقع'),
    ],
  },

  // ── Kitchen / Meals ──
  kitchen: {
    createMealPlan: [
      requiredDate('date', 'التاريخ'),
      optionalString('breakfast', 'الفطور', { max: 500 }),
      optionalString('lunch', 'الغداء', { max: 500 }),
      optionalString('dinner', 'العشاء', { max: 500 }),
      optionalString('snacks', 'الوجبات الخفيفة', { max: 500 }),
    ],
  },

  // ── E-Commerce ──
  ecommerce: {
    createProduct: [
      requiredString('name', 'اسم المنتج'),
      requiredNumber('price', 'السعر', { min: 0 }),
      optionalString('description', 'الوصف', { max: 2000 }),
      optionalNumber('stock', 'المخزون', { min: 0 }),
    ],
    createOrder: [
      body('items').isArray({ min: 1 }).withMessage('يجب أن تحتوي على منتج واحد على الأقل'),
      body('items.*.product').notEmpty().withMessage('معرّف المنتج مطلوب'),
      body('items.*.quantity').isInt({ min: 1 }).withMessage('الكمية يجب أن تكون 1 على الأقل'),
    ],
  },

  // ── Common ──
  common: {
    mongoIdParam,
    paginationQuery,
  },
};

// ─── Helper: Optional Email ──────────────────────────────────────────────────
function optionalEmail(field = 'email') {
  return body(field).optional().trim().isEmail().withMessage('البريد الإلكتروني غير صالح');
}

module.exports = {
  schemas,
  // Atomic validators for ad-hoc composition
  isMongoId,
  requiredString,
  optionalString,
  requiredEmail,
  requiredPhone,
  optionalPhone,
  requiredDate,
  optionalDate,
  requiredNumber,
  optionalNumber,
  requiredEnum,
  optionalEnum,
  paginationQuery,
  mongoIdParam,
};
