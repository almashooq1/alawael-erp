'use strict';

/**
 * Reports Domain Validators — التحقق من مدخلات محرك التقارير
 */

const VALID_FORMATS = ['pdf', 'excel', 'csv', 'json', 'html'];

/**
 * التحقق من بيانات توليد تقرير
 */
function validateGenerateReport(body) {
  const errors = [];
  if (body.format !== undefined && !VALID_FORMATS.includes(body.format)) {
    errors.push(`صيغة التقرير غير صالحة. المقبول: ${VALID_FORMATS.join(', ')}`);
  }
  if (body.dateFrom && body.dateTo && new Date(body.dateFrom) > new Date(body.dateTo)) {
    errors.push('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء');
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
  validateGenerateReport,
  validate,
  VALID_FORMATS,
};
