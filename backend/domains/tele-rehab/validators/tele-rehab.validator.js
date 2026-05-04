'use strict';

/**
 * Tele-Rehabilitation Domain Validators — التحقق من مدخلات التأهيل عن بُعد
 */

const VALID_PLATFORMS = ['zoom', 'teams', 'meet', 'webrtc', 'custom'];

/**
 * التحقق من بيانات جدولة جلسة تأهيل عن بُعد
 */
function validateScheduleSession(body) {
  const errors = [];
  if (!body.beneficiaryId) errors.push('معرّف المستفيد مطلوب (beneficiaryId)');
  if (!body.therapistId) errors.push('معرّف المعالج مطلوب (therapistId)');
  if (!body.scheduledAt && !body.date && !body.sessionDate) {
    errors.push('وقت الجلسة مطلوب (scheduledAt أو date أو sessionDate)');
  }
  if (body.platform !== undefined && !VALID_PLATFORMS.includes(body.platform)) {
    errors.push(`المنصة غير صالحة. المقبول: ${VALID_PLATFORMS.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات إكمال جلسة
 */
function validateCompleteSession(body) {
  const errors = [];
  if (!body.notes && !body.outcome && !body.summary && !body.sessionNotes) {
    errors.push('يجب توفير notes أو outcome أو summary لإكمال الجلسة');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات جودة الاتصال
 */
function validateRecordQuality(body) {
  const errors = [];
  if (body.score === undefined && body.rating === undefined && body.qualityScore === undefined) {
    errors.push('يجب توفير score أو rating لتسجيل جودة الاتصال');
  }
  const score = body.score ?? body.rating ?? body.qualityScore;
  if (score !== undefined) {
    const n = Number(score);
    if (isNaN(n) || n < 1 || n > 5) {
      errors.push('التقييم يجب أن يكون بين 1 و 5');
    }
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات رضا المستخدم
 */
function validateSubmitSatisfaction(body) {
  const errors = [];
  if (body.rating === undefined && body.satisfactionScore === undefined) {
    errors.push('تقييم الرضا مطلوب (rating أو satisfactionScore)');
  }
  const rating = body.rating ?? body.satisfactionScore;
  if (rating !== undefined) {
    const n = Number(rating);
    if (isNaN(n) || n < 1 || n > 5 || !Number.isInteger(n)) {
      errors.push('التقييم يجب أن يكون رقماً صحيحاً بين 1 و 5');
    }
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
  validateScheduleSession,
  validateCompleteSession,
  validateRecordQuality,
  validateSubmitSatisfaction,
  validate,
  VALID_PLATFORMS,
};
