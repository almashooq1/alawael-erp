/**
 * Goals Validator — التحقق من صحة بيانات الأهداف العلاجية
 *
 * @module domains/goals/validators/goals.validator
 */

'use strict';

const VALID_TYPES = [
  'long-term',
  'short-term',
  'maintenance',
  'functional',
  'academic',
  'social',
  'behavioral',
  'communication',
  'motor',
  'cognitive',
];

const VALID_STATUSES = ['active', 'achieved', 'on-hold', 'cancelled', 'transferred', 'draft'];

// ─── Validators ──────────────────────────────────────────────────────────────

function validateCreateGoal(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب');
  }

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('عنوان الهدف (title) مطلوب');
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`نوع الهدف غير صالح. المقبول: ${VALID_TYPES.join(', ')}`);
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`حالة الهدف غير صالحة. المقبول: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.targetDate && isNaN(Date.parse(body.targetDate))) {
    errors.push('targetDate تاريخ غير صالح');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdateGoal(body) {
  const errors = [];

  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب تحديد حقل واحد على الأقل للتحديث');
    return { valid: false, errors };
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`نوع الهدف غير صالح. المقبول: ${VALID_TYPES.join(', ')}`);
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`حالة الهدف غير صالحة. المقبول: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.progress !== undefined) {
    const p = Number(body.progress);
    if (isNaN(p) || p < 0 || p > 100) {
      errors.push('progress يجب أن يكون بين 0 و 100');
    }
  }

  if (body.targetDate && isNaN(Date.parse(body.targetDate))) {
    errors.push('targetDate تاريخ غير صالح');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateLogProgress(body) {
  const errors = [];

  const hasProgress = body.progress !== undefined && body.progress !== null;
  const hasNote = body.note && typeof body.note === 'string' && body.note.trim();

  if (!hasProgress && !hasNote) {
    errors.push('يجب توفير progress أو note لتسجيل التقدم');
  }

  if (hasProgress) {
    const p = Number(body.progress);
    if (isNaN(p) || p < 0 || p > 100) {
      errors.push('progress يجب أن يكون بين 0 و 100');
    }
  }

  if (body.date && isNaN(Date.parse(body.date))) {
    errors.push('date تاريخ غير صالح');
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
  validateCreateGoal,
  validateUpdateGoal,
  validateLogProgress,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
};
