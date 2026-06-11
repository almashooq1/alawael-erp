/**
 * Goals Validator — التحقق من صحة بيانات الأهداف العلاجية
 *
 * @module domains/goals/validators/goals.validator
 */

'use strict';

// W1219 — these lists had drifted COMPLETELY from the TherapeuticGoal model
// enums (hyphenated 'short-term' vs the model's 'short_term'; statuses like
// 'on-hold'/'cancelled' that the model never accepted). Net effect: valid
// model values were rejected with 400 at the validator, while validator-legal
// values blew up as a mongoose ValidationError at save. Surfaced by the
// route-layer behavioral suite. Single source of truth = the model enums
// (domains/goals/models/TherapeuticGoal.js).
const VALID_TYPES = ['long_term', 'short_term', 'session', 'maintenance', 'discharge'];

const VALID_STATUSES = [
  'draft',
  'active',
  'achieved',
  'partially_achieved',
  'not_achieved',
  'discontinued',
  'deferred',
  'modified',
];

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
