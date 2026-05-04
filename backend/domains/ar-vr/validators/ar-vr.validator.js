'use strict';

/**
 * AR/VR Rehabilitation Validators — مدقق بيانات تأهيل الواقع الافتراضي / المعزز
 */

const VALID_TECHNOLOGY_TYPES = ['ar', 'vr', 'mixed', 'xr'];

function validateCreateSession(body) {
  const errors = [];
  if (!body || !body.beneficiaryId) errors.push('معرّف المستفيد مطلوب');
  if (!body || !body.therapistId) errors.push('معرّف الأخصائي مطلوب');
  if (body && body.technologyType && !VALID_TECHNOLOGY_TYPES.includes(body.technologyType)) {
    errors.push(`نوع التقنية غير صالح. القيم المقبولة: ${VALID_TECHNOLOGY_TYPES.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateCompleteSession(body) {
  const errors = [];
  const hasOutcome = body && (body.outcome || body.notes || body.summary || body.sessionNotes);
  if (!hasOutcome) errors.push('نتيجة الجلسة أو الملاحظات مطلوبة');
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
  validateCreateSession,
  validateCompleteSession,
  VALID_TECHNOLOGY_TYPES,
  validate,
};
