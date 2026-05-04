'use strict';
/**
 * Sessions Validator — التحقق من صحة بيانات الجلسات السريرية
 *
 * @module domains/sessions/validators/sessions.validator
 */

const VALID_TYPES = [
  'individual',
  'group',
  'family',
  'home_visit',
  'tele_session',
  'assessment',
  'mdt',
  'consultation',
  'workshop',
  'parent_training',
];

const VALID_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
];

const VALID_ATTENDANCE = ['present', 'absent', 'late', 'partial', 'remote'];

const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v));
const isDateString = v => !Number.isNaN(Date.parse(v));

const invalid = errors => ({ valid: false, errors });
const valid = () => ({ valid: true, errors: [] });

// ─── Create Session ───────────────────────────────────────────────────────────

/**
 * Validates POST /sessions body.
 * @param {object} body
 */
function validateCreateSession(body) {
  const errors = [];

  if (!body.beneficiaryId && !body.beneficiary) {
    errors.push('beneficiaryId مطلوب');
  } else {
    const id = body.beneficiaryId || body.beneficiary;
    if (!isObjectId(id)) errors.push('beneficiaryId غير صالح');
  }

  if (!body.episodeId && !body.episode) {
    errors.push('episodeId مطلوب — الجلسة يجب أن ترتبط بحلقة علاجية');
  } else {
    const id = body.episodeId || body.episode;
    if (!isObjectId(id)) errors.push('episodeId غير صالح');
  }

  if (!body.therapistId && !body.therapist) {
    errors.push('therapistId مطلوب');
  } else {
    const id = body.therapistId || body.therapist;
    if (!isObjectId(id)) errors.push('therapistId غير صالح');
  }

  if (body.type && !VALID_TYPES.includes(body.type)) {
    errors.push(`type يجب أن يكون أحد القيم: ${VALID_TYPES.join(', ')}`);
  }

  if (!body.scheduledDate && !body.sessionDate) {
    errors.push('scheduledDate مطلوب');
  } else {
    const d = body.scheduledDate || body.sessionDate;
    if (!isDateString(d)) errors.push('scheduledDate تاريخ غير صالح');
  }

  if (body.duration !== undefined) {
    const dur = Number(body.duration);
    if (Number.isNaN(dur) || dur < 5 || dur > 480) {
      errors.push('duration يجب أن يكون بين 5 و 480 دقيقة');
    }
  }

  if (errors.length) return invalid(errors);
  return valid();
}

// ─── Update Session ───────────────────────────────────────────────────────────

/**
 * Validates PATCH /sessions/:id body.
 */
function validateUpdateSession(body) {
  const errors = [];

  if (Object.keys(body).length === 0) {
    errors.push('لا توجد حقول للتحديث');
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status يجب أن يكون أحد القيم: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.attendance && !VALID_ATTENDANCE.includes(body.attendance)) {
    errors.push(`attendance يجب أن يكون أحد القيم: ${VALID_ATTENDANCE.join(', ')}`);
  }

  if (body.duration !== undefined) {
    const dur = Number(body.duration);
    if (Number.isNaN(dur) || dur < 5 || dur > 480) {
      errors.push('duration يجب أن يكون بين 5 و 480 دقيقة');
    }
  }

  if (body.actualDate && !isDateString(body.actualDate)) {
    errors.push('actualDate تاريخ غير صالح');
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
  validateCreateSession,
  validateUpdateSession,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
  VALID_ATTENDANCE,
};
