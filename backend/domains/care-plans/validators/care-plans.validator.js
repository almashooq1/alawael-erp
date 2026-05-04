'use strict';
/**
 * Care Plans Validator — التحقق من صحة بيانات خطط الرعاية
 *
 * @module domains/care-plans/validators/care-plans.validator
 */

const VALID_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'on_hold',
  'completed',
  'cancelled',
];
const VALID_GOAL_STATUSES = [
  'not_started',
  'in_progress',
  'achieved',
  'discontinued',
  'transferred',
];
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical'];
const VALID_FREQUENCY = [
  'daily',
  'twice_daily',
  'three_times_weekly',
  'twice_weekly',
  'weekly',
  'biweekly',
  'monthly',
  'as_needed',
];

const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v));
const isDateString = v => !Number.isNaN(Date.parse(v));

const invalid = errors => ({ valid: false, errors });
const valid = () => ({ valid: true, errors: [] });

// ─── Create Care Plan ─────────────────────────────────────────────────────────

/**
 * Validates POST /care-plans body.
 * @param {object} body
 */
function validateCreateCarePlan(body) {
  const errors = [];

  if (!body.beneficiaryId && !body.beneficiary) {
    errors.push('beneficiaryId مطلوب');
  } else {
    const id = body.beneficiaryId || body.beneficiary;
    if (!isObjectId(id)) errors.push('beneficiaryId غير صالح');
  }

  if (!body.episodeId && !body.episode) {
    errors.push('episodeId مطلوب — خطة الرعاية يجب أن ترتبط بحلقة علاجية');
  } else {
    const id = body.episodeId || body.episode;
    if (!isObjectId(id)) errors.push('episodeId غير صالح');
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status يجب أن يكون أحد القيم: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.startDate && !isDateString(body.startDate)) {
    errors.push('startDate تاريخ غير صالح');
  }

  if (body.endDate) {
    if (!isDateString(body.endDate)) {
      errors.push('endDate تاريخ غير صالح');
    } else if (body.startDate && new Date(body.endDate) <= new Date(body.startDate)) {
      errors.push('endDate يجب أن يكون بعد startDate');
    }
  }

  if (body.goals !== undefined && !Array.isArray(body.goals)) {
    errors.push('goals يجب أن يكون مصفوفة');
  }

  if (Array.isArray(body.goals)) {
    body.goals.forEach((g, i) => {
      if (!g.description) errors.push(`goals[${i}]: description مطلوب`);
      if (g.priority && !VALID_PRIORITY.includes(g.priority)) {
        errors.push(`goals[${i}]: priority غير صالح`);
      }
      if (g.targetDate && !isDateString(g.targetDate)) {
        errors.push(`goals[${i}]: targetDate تاريخ غير صالح`);
      }
    });
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Update Care Plan ─────────────────────────────────────────────────────────

/**
 * Validates PATCH /care-plans/:id body.
 */
function validateUpdateCarePlan(body) {
  const errors = [];

  if (Object.keys(body).length === 0) {
    errors.push('لا توجد حقول للتحديث');
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status يجب أن يكون أحد القيم: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.endDate && !isDateString(body.endDate)) {
    errors.push('endDate تاريخ غير صالح');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Goal Status Update ───────────────────────────────────────────────────────

/**
 * Validates updating a goal status within a care plan.
 * @param {object} body
 */
function validateGoalUpdate(body) {
  const errors = [];

  if (!body.goalId) {
    errors.push('goalId مطلوب');
  } else if (!isObjectId(body.goalId)) {
    errors.push('goalId غير صالح');
  }

  if (!body.status) {
    errors.push('status مطلوب');
  } else if (!VALID_GOAL_STATUSES.includes(body.status)) {
    errors.push(`status يجب أن يكون أحد القيم: ${VALID_GOAL_STATUSES.join(', ')}`);
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
  validateCreateCarePlan,
  validateUpdateCarePlan,
  validateGoalUpdate,
  validate,
  VALID_STATUSES,
  VALID_GOAL_STATUSES,
  VALID_PRIORITY,
  VALID_FREQUENCY,
};
