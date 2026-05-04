'use strict';
/**
 * Assessments Validator — التحقق من صحة بيانات التقييمات السريرية
 *
 * @module domains/assessments/validators/assessments.validator
 */

const VALID_CATEGORIES = [
  'cognitive',
  'motor',
  'speech_language',
  'behavioral',
  'sensory',
  'social_emotional',
  'academic',
  'adaptive',
  'medical',
  'nutritional',
  'psychological',
  'occupational',
  'vocational',
  'functional',
  'family',
  'environmental',
  'icf',
  'custom',
];

const VALID_STATUSES = ['draft', 'in_progress', 'completed', 'reviewed', 'approved', 'archived'];

const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v));
const isDateString = v => !Number.isNaN(Date.parse(v));

const invalid = errors => ({ valid: false, errors });
const valid = () => ({ valid: true, errors: [] });

// ─── Create Assessment ────────────────────────────────────────────────────────

/**
 * Validates POST /assessments body.
 * @param {object} body
 */
function validateCreateAssessment(body) {
  const errors = [];

  if (!body.beneficiary && !body.beneficiaryId) {
    errors.push('beneficiary (أو beneficiaryId) مطلوب');
  } else {
    const id = body.beneficiary || body.beneficiaryId;
    if (!isObjectId(id)) errors.push('beneficiary غير صالح');
  }

  if (!body.episodeId && !body.episode) {
    errors.push('episodeId (أو episode) مطلوب — التقييم يجب أن يرتبط بحلقة علاجية');
  } else {
    const id = body.episodeId || body.episode;
    if (!isObjectId(id)) errors.push('episodeId غير صالح');
  }

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`category يجب أن يكون أحد القيم: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (body.assessedBy && !isObjectId(body.assessedBy)) {
    errors.push('assessedBy غير صالح');
  }

  if (body.assessmentDate && !isDateString(body.assessmentDate)) {
    errors.push('assessmentDate تاريخ غير صالح');
  }

  if (body.scores !== undefined && typeof body.scores !== 'object') {
    errors.push('scores يجب أن يكون كائناً');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Update Assessment ────────────────────────────────────────────────────────

/**
 * Validates PATCH /assessments/:id body.
 */
function validateUpdateAssessment(body) {
  const errors = [];

  if (Object.keys(body).length === 0) {
    errors.push('لا توجد حقول للتحديث');
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status يجب أن يكون أحد القيم: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.reviewedBy && !isObjectId(body.reviewedBy)) {
    errors.push('reviewedBy غير صالح');
  }

  if (body.reviewDate && !isDateString(body.reviewDate)) {
    errors.push('reviewDate تاريخ غير صالح');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Middleware Factory ───────────────────────────────────────────────────────

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
  validateCreateAssessment,
  validateUpdateAssessment,
  validate,
  VALID_CATEGORIES,
  VALID_STATUSES,
};
