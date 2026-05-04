/**
 * Behavior Validator — التحقق من صحة بيانات إدارة السلوك
 *
 * @module domains/behavior/validators/behavior.validator
 */

'use strict';

const VALID_SEVERITIES = ['mild', 'moderate', 'severe', 'critical'];

const VALID_TOPOGRAPHIES = [
  'aggression',
  'self-injury',
  'elopement',
  'tantrum',
  'property-destruction',
  'stereotypy',
  'non-compliance',
  'verbal-aggression',
  'other',
];

const VALID_PLAN_STATUSES = ['draft', 'active', 'on-hold', 'completed', 'cancelled'];

// ─── Validators ──────────────────────────────────────────────────────────────

function validateCreateRecord(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب');
  }

  const hasTopography =
    body.topography && typeof body.topography === 'string' && body.topography.trim();
  const hasDescription =
    body.description && typeof body.description === 'string' && body.description.trim();

  if (!hasTopography && !hasDescription) {
    errors.push('topography أو description مطلوب لتسجيل السلوك');
  }

  if (body.topography && !VALID_TOPOGRAPHIES.includes(body.topography)) {
    errors.push(`نوع السلوك (topography) غير صالح. المقبول: ${VALID_TOPOGRAPHIES.join(', ')}`);
  }

  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    errors.push(`مستوى الشدة غير صالح. المقبول: ${VALID_SEVERITIES.join(', ')}`);
  }

  if (body.occurredAt && isNaN(Date.parse(body.occurredAt))) {
    errors.push('occurredAt تاريخ غير صالح');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateCreatePlan(body) {
  const errors = [];

  if (!body.beneficiaryId || typeof body.beneficiaryId !== 'string' || !body.beneficiaryId.trim()) {
    errors.push('beneficiaryId مطلوب');
  }

  const hasTitle = body.title && typeof body.title === 'string' && body.title.trim();
  const hasTargetBehavior =
    body.targetBehavior && typeof body.targetBehavior === 'string' && body.targetBehavior.trim();

  if (!hasTitle && !hasTargetBehavior) {
    errors.push('title أو targetBehavior مطلوب لإنشاء خطة السلوك');
  }

  if (body.status && !VALID_PLAN_STATUSES.includes(body.status)) {
    errors.push(`حالة الخطة غير صالحة. المقبول: ${VALID_PLAN_STATUSES.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateUpdatePlan(body) {
  const errors = [];

  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب تحديد حقل واحد على الأقل للتحديث');
    return { valid: false, errors };
  }

  if (body.status && !VALID_PLAN_STATUSES.includes(body.status)) {
    errors.push(`حالة الخطة غير صالحة. المقبول: ${VALID_PLAN_STATUSES.join(', ')}`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateAddReview(body) {
  const errors = [];

  const hasNotes = body.notes && typeof body.notes === 'string' && body.notes.trim();
  const hasOutcome = body.outcome && typeof body.outcome === 'string' && body.outcome.trim();
  const hasSummary = body.summary && typeof body.summary === 'string' && body.summary.trim();

  if (!hasNotes && !hasOutcome && !hasSummary) {
    errors.push('يجب توفير notes أو outcome أو summary في المراجعة');
  }

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

// ─── Middleware factory ───────────────────────────────────────────────────────

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
  validateCreatePlan,
  validateUpdatePlan,
  validateAddReview,
  validate,
  VALID_SEVERITIES,
  VALID_TOPOGRAPHIES,
  VALID_PLAN_STATUSES,
};
