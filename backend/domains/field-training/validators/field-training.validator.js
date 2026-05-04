'use strict';

/**
 * Field Training Validators — مدقق بيانات التدريب الميداني
 */

const VALID_PROGRAM_TYPES = ['clinical', 'administrative', 'technical', 'supervisory', 'research'];

function validateCreateProgram(body) {
  const errors = [];
  const title = body && (body.title || body.name);
  if (!title) errors.push('عنوان البرنامج مطلوب');
  if (!body || !body.type) errors.push('نوع البرنامج مطلوب');
  if (body && body.type && !VALID_PROGRAM_TYPES.includes(body.type)) {
    errors.push(`نوع البرنامج غير صالح. القيم المقبولة: ${VALID_PROGRAM_TYPES.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateEnrollTrainee(body) {
  const errors = [];
  const traineeId = body && (body.traineeId || body.beneficiaryId || body.userId);
  if (!traineeId) errors.push('معرّف المتدرب مطلوب');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateSubmitEvaluation(body) {
  const errors = [];
  const hasScore =
    body && (body.scores !== undefined || body.rating !== undefined || body.grade !== undefined);
  if (!hasScore) errors.push('التقييم أو الدرجة مطلوب');
  if (body && body.rating !== undefined) {
    const r = Number(body.rating);
    if (isNaN(r) || r < 1 || r > 5) errors.push('التقييم يجب أن يكون بين 1 و 5');
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
  validateCreateProgram,
  validateEnrollTrainee,
  validateSubmitEvaluation,
  VALID_PROGRAM_TYPES,
  validate,
};
