/**
 * Group Therapy Validator — التحقق من صحة بيانات العلاج الجماعي
 *
 * @module domains/group-therapy/validators/group-therapy.validator
 */

'use strict';

const VALID_TYPES = [
  'social-skills',
  'speech',
  'occupational',
  'behavioral',
  'cognitive',
  'play',
  'art',
  'music',
  'educational',
  'parent-training',
  'other',
];

const VALID_STATUSES = ['forming', 'active', 'paused', 'completed', 'cancelled'];

// ─── Validators ──────────────────────────────────────────────────────────────

function validateCreateGroup(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('اسم المجموعة (name) مطلوب');
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`نوع المجموعة غير صالح. المقبول: ${VALID_TYPES.join(', ')}`);
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`حالة المجموعة غير صالحة. المقبول: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.maxMembers !== undefined) {
    const n = Number(body.maxMembers);
    if (isNaN(n) || n < 1 || !Number.isInteger(n)) {
      errors.push('maxMembers يجب أن يكون عدداً صحيحاً موجباً');
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdateGroup(body) {
  const errors = [];

  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب تحديد حقل واحد على الأقل للتحديث');
    return { valid: false, errors };
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`نوع المجموعة غير صالح. المقبول: ${VALID_TYPES.join(', ')}`);
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`حالة المجموعة غير صالحة. المقبول: ${VALID_STATUSES.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateAddMember(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب لإضافة عضو للمجموعة');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateCreateGroupSession(body) {
  const errors = [];

  const hasDate =
    (body.date && !isNaN(Date.parse(body.date))) ||
    (body.scheduledDate && !isNaN(Date.parse(body.scheduledDate))) ||
    (body.sessionDate && !isNaN(Date.parse(body.sessionDate)));

  if (!body.date && !body.scheduledDate && !body.sessionDate) {
    errors.push('تاريخ الجلسة مطلوب (date أو scheduledDate أو sessionDate)');
  } else if (!hasDate) {
    errors.push('تاريخ الجلسة غير صالح');
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
  validateCreateGroup,
  validateUpdateGroup,
  validateAddMember,
  validateCreateGroupSession,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
};
