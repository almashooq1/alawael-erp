'use strict';

/**
 * Research Validators — مدقق بيانات البحث السريري
 */

const VALID_STUDY_TYPES = [
  'observational',
  'interventional',
  'survey',
  'case-study',
  'retrospective',
  'prospective',
];
const VALID_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'];

function validateCreateStudy(body) {
  const errors = [];
  const title = body && (body.title || body.name);
  if (!title) errors.push('عنوان الدراسة مطلوب');
  if (!body || !body.type) errors.push('نوع الدراسة مطلوب');
  if (body && body.type && !VALID_STUDY_TYPES.includes(body.type)) {
    errors.push(`نوع الدراسة غير صالح. القيم المقبولة: ${VALID_STUDY_TYPES.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateEnrollParticipant(body) {
  const errors = [];
  if (!body || !body.beneficiaryId) errors.push('معرّف المستفيد مطلوب');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateTransitionStatus(body) {
  const errors = [];
  if (!body || !body.status) errors.push('الحالة المستهدفة مطلوبة');
  if (body && body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`الحالة غير صالحة. القيم المقبولة: ${VALID_STATUSES.join(', ')}`);
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
  validateCreateStudy,
  validateEnrollParticipant,
  validateTransitionStatus,
  VALID_STUDY_TYPES,
  VALID_STATUSES,
  validate,
};
