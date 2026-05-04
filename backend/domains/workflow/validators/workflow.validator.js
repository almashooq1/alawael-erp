'use strict';

/**
 * Workflow & Journey Validators — مدقق بيانات مسار العمل ورحلة المستفيد
 */

const VALID_PHASES = [
  'referral',
  'intake',
  'assessment',
  'planning',
  'intervention',
  'review',
  'discharge',
  'follow-up',
];

function validateStartJourney(body) {
  const errors = [];
  if (!body || !body.beneficiaryId) errors.push('معرّف المستفيد مطلوب');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateAdvancePhase(body) {
  const errors = [];
  if (!body || !body.toPhase) errors.push('المرحلة المستهدفة مطلوبة');
  if (body && body.toPhase && !VALID_PHASES.includes(body.toPhase)) {
    errors.push(`المرحلة غير صالحة. القيم المقبولة: ${VALID_PHASES.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateExceptionAdvance(body) {
  const errors = [];
  if (!body || !body.toPhase) errors.push('المرحلة المستهدفة مطلوبة');
  if (!body || !body.reason) errors.push('سبب الاستثناء مطلوب');
  if (body && body.toPhase && !VALID_PHASES.includes(body.toPhase)) {
    errors.push(`المرحلة غير صالحة. القيم المقبولة: ${VALID_PHASES.join(', ')}`);
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
  validateStartJourney,
  validateAdvancePhase,
  validateExceptionAdvance,
  VALID_PHASES,
  validate,
};
