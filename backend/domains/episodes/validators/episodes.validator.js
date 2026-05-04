'use strict';
/**
 * Episodes Validator — التحقق من صحة بيانات الحلقة العلاجية
 *
 * يُطبَّق على حدود النظام (API boundary) فقط.
 * كل حقل يخدم قراراً سريرياً أو تشغيلياً.
 *
 * @module domains/episodes/validators/episodes.validator
 */

const VALID_TYPES = [
  'standard',
  'intensive',
  'home_based',
  'crisis',
  'transitional',
  'maintenance',
  'assessment_only',
  'research',
];

const VALID_PHASES = [
  'referral',
  'intake',
  'triage',
  'initial_assessment',
  'mdt_review',
  'care_plan_approval',
  'active_treatment',
  'reassessment',
  'outcome_review',
  'discharge_planning',
  'discharge',
  'post_discharge_followup',
];

const VALID_STATUSES = ['active', 'on_hold', 'completed', 'cancelled', 'transferred'];

const VALID_DISCHARGE_REASONS = [
  'goals_achieved',
  'patient_request',
  'family_request',
  'non_compliance',
  'transfer',
  'medical_complication',
  'financial',
  'moved_away',
  'deceased',
  'other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v));
const isDateString = v => !Number.isNaN(Date.parse(v));

/**
 * Build a validation error response object.
 * @param {string[]} errors
 * @returns {{ valid: false, errors: string[] }}
 */
const invalid = errors => ({ valid: false, errors });
const valid = () => ({ valid: true, errors: [] });

// ─── Create Episode ───────────────────────────────────────────────────────────

/**
 * Validates the body of POST /episodes
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCreateEpisode(body) {
  const errors = [];

  if (!body.beneficiaryId) {
    errors.push('beneficiaryId مطلوب');
  } else if (!isObjectId(body.beneficiaryId)) {
    errors.push('beneficiaryId غير صالح');
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`type يجب أن يكون أحد القيم: ${VALID_TYPES.join(', ')}`);
  }

  if (body.leadTherapistId && !isObjectId(body.leadTherapistId)) {
    errors.push('leadTherapistId غير صالح');
  }

  if (body.branchId && !isObjectId(body.branchId)) {
    errors.push('branchId غير صالح');
  }

  if (body.startDate && !isDateString(body.startDate)) {
    errors.push('startDate تاريخ غير صالح');
  }

  if (body.expectedEndDate) {
    if (!isDateString(body.expectedEndDate)) {
      errors.push('expectedEndDate تاريخ غير صالح');
    } else if (body.startDate && new Date(body.expectedEndDate) <= new Date(body.startDate)) {
      errors.push('expectedEndDate يجب أن يكون بعد startDate');
    }
  }

  if (body.referralSource && typeof body.referralSource !== 'string') {
    errors.push('referralSource يجب أن يكون نصاً');
  }

  if (body.goals && !Array.isArray(body.goals)) {
    errors.push('goals يجب أن يكون مصفوفة');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Update Episode ───────────────────────────────────────────────────────────

/**
 * Validates the body of PATCH /episodes/:id
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateUpdateEpisode(body) {
  const errors = [];

  if (Object.keys(body).length === 0) {
    errors.push('لا توجد حقول للتحديث');
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status يجب أن يكون أحد القيم: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.currentPhase && !VALID_PHASES.includes(body.currentPhase)) {
    errors.push(`currentPhase يجب أن يكون أحد القيم: ${VALID_PHASES.join(', ')}`);
  }

  if (body.leadTherapistId && !isObjectId(body.leadTherapistId)) {
    errors.push('leadTherapistId غير صالح');
  }

  if (body.expectedEndDate && !isDateString(body.expectedEndDate)) {
    errors.push('expectedEndDate تاريخ غير صالح');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Phase Transition ─────────────────────────────────────────────────────────

/**
 * Validates a phase transition request body.
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePhaseTransition(body) {
  const errors = [];

  if (!body.phase) {
    errors.push('phase مطلوب');
  } else if (!VALID_PHASES.includes(body.phase)) {
    errors.push(`phase يجب أن يكون أحد القيم: ${VALID_PHASES.join(', ')}`);
  }

  if (body.completedBy && !isObjectId(body.completedBy)) {
    errors.push('completedBy غير صالح');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Discharge ────────────────────────────────────────────────────────────────

/**
 * Validates a discharge request body.
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDischarge(body) {
  const errors = [];

  if (!body.dischargeReason) {
    errors.push('dischargeReason مطلوب');
  } else if (!VALID_DISCHARGE_REASONS.includes(body.dischargeReason)) {
    errors.push(`dischargeReason يجب أن يكون أحد القيم: ${VALID_DISCHARGE_REASONS.join(', ')}`);
  }

  if (body.dischargeDate && !isDateString(body.dischargeDate)) {
    errors.push('dischargeDate تاريخ غير صالح');
  }

  if (body.dischargedBy && !isObjectId(body.dischargedBy)) {
    errors.push('dischargedBy غير صالح');
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Team Member ──────────────────────────────────────────────────────────────

const VALID_TEAM_ROLES = [
  'lead_therapist',
  'speech_therapist',
  'occupational_therapist',
  'physical_therapist',
  'psychologist',
  'behavioral_therapist',
  'social_worker',
  'special_educator',
  'nurse',
  'physician',
  'coordinator',
  'supervisor',
];

/**
 * Validates adding a care team member.
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAddTeamMember(body) {
  const errors = [];

  if (!body.userId) {
    errors.push('userId مطلوب');
  } else if (!isObjectId(body.userId)) {
    errors.push('userId غير صالح');
  }

  if (!body.role) {
    errors.push('role مطلوب');
  } else if (!VALID_TEAM_ROLES.includes(body.role)) {
    errors.push(`role يجب أن يكون أحد القيم: ${VALID_TEAM_ROLES.join(', ')}`);
  }

  if (body.weeklyHours !== undefined) {
    const h = Number(body.weeklyHours);
    if (Number.isNaN(h) || h < 0 || h > 168) {
      errors.push('weeklyHours يجب أن يكون بين 0 و 168');
    }
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Middleware Factory ───────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates the request body using the
 * provided validator function and responds 400 on failure.
 *
 * @param {Function} validatorFn
 * @returns {import('express').RequestHandler}
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
  validateCreateEpisode,
  validateUpdateEpisode,
  validatePhaseTransition,
  validateDischarge,
  validateAddTeamMember,
  validate,
  // expose constants for reuse
  VALID_TYPES,
  VALID_PHASES,
  VALID_STATUSES,
  VALID_DISCHARGE_REASONS,
  VALID_TEAM_ROLES,
};
