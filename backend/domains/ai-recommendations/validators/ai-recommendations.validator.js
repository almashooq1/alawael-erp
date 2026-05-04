'use strict';

/**
 * AI Recommendations Validators — مدقق بيانات التوصيات الذكية وتقييم المخاطر
 */

const VALID_RECOMMENDATION_TYPES = [
  'goal',
  'intervention',
  'assessment',
  'referral',
  'alert',
  'general',
];

function validateCalculateBatch(body) {
  // body is optional — branchId is optional
  if (body && body.branchId && typeof body.branchId !== 'string') {
    return { valid: false, errors: ['معرّف الفرع يجب أن يكون نصاً'] };
  }
  return { valid: true, errors: [] };
}

function validateGenerateRecommendation(body) {
  const errors = [];
  if (!body || !body.beneficiaryId) errors.push('معرّف المستفيد مطلوب');
  if (body && body.type && !VALID_RECOMMENDATION_TYPES.includes(body.type)) {
    errors.push(`نوع التوصية غير صالح. القيم المقبولة: ${VALID_RECOMMENDATION_TYPES.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateFeedback(body) {
  const errors = [];
  if (!body || body.accepted === undefined) errors.push('قرار قبول التوصية مطلوب');
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
  validateCalculateBatch,
  validateGenerateRecommendation,
  validateFeedback,
  VALID_RECOMMENDATION_TYPES,
  validate,
};
