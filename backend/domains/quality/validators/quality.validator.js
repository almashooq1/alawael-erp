'use strict';

/**
 * Quality Domain Validators — التحقق من مدخلات الجودة والامتثال
 */

/**
 * التحقق من بيانات التدقيق على مستفيد
 */
function validateAuditBeneficiary(body) {
  const errors = [];
  if (body.episodeId !== undefined && !body.episodeId) {
    errors.push('episodeId لا يمكن أن يكون فارغاً إذا تم تمريره');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من حل إجراء تصحيحي
 */
function validateResolveAction(body) {
  const errors = [];
  if (!body.note && !body.resolution && !body.outcome) {
    errors.push('يجب توفير note أو resolution أو outcome لحل الإجراء التصحيحي');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * Middleware factory
 */
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
  validateAuditBeneficiary,
  validateResolveAction,
  validate,
};
