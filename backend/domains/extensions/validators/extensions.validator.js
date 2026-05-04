'use strict';

/**
 * Extensions Validators — مدقق بيانات الوحدات الموسعة
 */

function validateCreateRecord(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push('بيانات السجل مطلوبة');
    return { valid: false, errors };
  }
  // beneficiaryId or episodeId should be present for traceability
  if (!body.beneficiaryId && !body.episodeId && !body.relatedTo) {
    errors.push('مرجع المستفيد أو الحلقة العلاجية مطلوب');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdateRecord(body) {
  const errors = [];
  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب تحديد حقل واحد على الأقل للتعديل');
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
  validateCreateRecord,
  validateUpdateRecord,
  validate,
};
