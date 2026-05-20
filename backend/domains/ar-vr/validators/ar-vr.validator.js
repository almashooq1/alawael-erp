'use strict';

/**
 * AR/VR Rehabilitation Validators — مدقق بيانات تأهيل الواقع الافتراضي / المعزز
 *
 * The legacy frontend create-form sends `{beneficiaryId, sessionType,
 * duration, environment, goals, difficulty}`; older API consumers pass
 * `{beneficiaryId, therapistId, technologyType, scenario:{...}}`. We
 * accept both and defer the canonical mapping to the service.
 */

const VALID_TECHNOLOGY_TYPES = ['ar', 'vr', 'mr', 'xr', 'mixed', 'hologram', 'bci'];
const TECH_ALIASES = { virtual: 'vr', augmented: 'ar', extended: 'xr' };

function validateCreateSession(body) {
  const errors = [];
  if (!body || !body.beneficiaryId) errors.push('معرّف المستفيد مطلوب');

  const techRaw = body && (body.technologyType || body.sessionType);
  if (techRaw) {
    const tech = TECH_ALIASES[String(techRaw).toLowerCase()] || String(techRaw).toLowerCase();
    if (!VALID_TECHNOLOGY_TYPES.includes(tech)) {
      errors.push(
        `نوع التقنية غير صالح: ${techRaw}. القيم المقبولة: ${VALID_TECHNOLOGY_TYPES.join(', ')}`
      );
    }
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateCompleteSession(body) {
  const errors = [];
  const hasOutcome =
    body &&
    (body.outcome ||
      body.notes ||
      body.summary ||
      body.sessionNotes ||
      body.performance ||
      body.performanceScore != null);
  if (!hasOutcome) errors.push('نتيجة الجلسة أو الملاحظات مطلوبة');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateSafetyReport(body) {
  const errors = [];
  if (!body || !body.type) errors.push('نوع الحادثة مطلوب');
  if (!body || !body.severity) errors.push('شدة الحادثة مطلوبة');
  const validSeverities = ['low', 'medium', 'high', 'minor', 'moderate', 'serious'];
  if (body && body.severity && !validSeverities.includes(body.severity)) {
    errors.push(`شدة غير صالحة. القيم المقبولة: ${validSeverities.join(', ')}`);
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
  validateCreateSession,
  validateCompleteSession,
  validateSafetyReport,
  VALID_TECHNOLOGY_TYPES,
  TECH_ALIASES,
  validate,
};
