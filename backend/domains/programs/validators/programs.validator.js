/**
 * Programs Validator — التحقق من صحة بيانات البرامج التأهيلية
 *
 * @module domains/programs/validators/programs.validator
 */

'use strict';

const VALID_TYPES = [
  'rehabilitation',
  'educational',
  'vocational',
  'social',
  'behavioral',
  'speech',
  'occupational',
  'physical',
  'cognitive',
  'recreational',
  'community',
  'other',
];

const VALID_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];

const VALID_CATEGORIES = [
  'early-intervention',
  'school-age',
  'adult',
  'senior',
  'transition',
  'all-ages',
];

// ─── Validators ──────────────────────────────────────────────────────────────

function validateCreateProgram(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('اسم البرنامج (name) مطلوب');
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`نوع البرنامج غير صالح. المقبول: ${VALID_TYPES.join(', ')}`);
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`حالة البرنامج غير صالحة. المقبول: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`فئة البرنامج غير صالحة. المقبول: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (body.maxCapacity !== undefined) {
    const n = Number(body.maxCapacity);
    if (isNaN(n) || n < 1 || !Number.isInteger(n)) {
      errors.push('maxCapacity يجب أن يكون عدداً صحيحاً موجباً');
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdateProgram(body) {
  const errors = [];

  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب تحديد حقل واحد على الأقل للتحديث');
    return { valid: false, errors };
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`نوع البرنامج غير صالح. المقبول: ${VALID_TYPES.join(', ')}`);
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`حالة البرنامج غير صالحة. المقبول: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`فئة البرنامج غير صالحة. المقبول: ${VALID_CATEGORIES.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateEnrollBeneficiary(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب للتسجيل في البرنامج');
  }

  if (!body.programId || typeof body.programId !== 'string' || !body.programId.trim()) {
    errors.push('programId مطلوب للتسجيل');
  }

  if (body.startDate && isNaN(Date.parse(body.startDate))) {
    errors.push('startDate تاريخ غير صالح');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

// ─── Middleware factory ───────────────────────────────────────────────────────

function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    return next();
  };
}

module.exports = {
  validateCreateProgram,
  validateUpdateProgram,
  validateEnrollBeneficiary,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
  VALID_CATEGORIES,
};
