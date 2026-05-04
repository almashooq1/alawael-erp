'use strict';

/**
 * Timeline Validators — مدقق بيانات الخط الزمني
 */

const VALID_EVENT_TYPES = [
  'assessment',
  'session',
  'goal',
  'plan',
  'note',
  'alert',
  'discharge',
  'referral',
  'transition',
  'family',
  'medication',
  'other',
];

function validateAddEvent(body) {
  const errors = [];
  if (!body || !body.beneficiaryId) errors.push('معرّف المستفيد مطلوب');
  if (!body || !body.eventType) errors.push('نوع الحدث مطلوب');
  if (body && body.eventType && !VALID_EVENT_TYPES.includes(body.eventType)) {
    errors.push(`نوع الحدث غير صالح. القيم المقبولة: ${VALID_EVENT_TYPES.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

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
  validateAddEvent,
  VALID_EVENT_TYPES,
  validate,
};
