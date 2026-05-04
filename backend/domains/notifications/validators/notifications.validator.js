'use strict';

/**
 * Notifications Domain Validators — التحقق من مدخلات الإشعارات
 */

const VALID_CHANNELS = ['push', 'email', 'sms', 'in-app', 'whatsapp'];

/**
 * التحقق من بيانات إرسال إشعار
 */
function validateSendNotification(body) {
  const errors = [];
  if (!body.title && !body.message && !body.type) {
    errors.push('يجب توفير title أو message أو type للإشعار');
  }
  if (!body.recipientId && !body.userId && !body.targetGroup && !body.branchId) {
    errors.push('يجب تحديد المستلم (recipientId أو userId أو targetGroup أو branchId)');
  }
  if (body.channel !== undefined && !VALID_CHANNELS.includes(body.channel)) {
    errors.push(`قناة الإشعار غير صالحة. المقبول: ${VALID_CHANNELS.join(', ')}`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات الإرسال الجماعي
 */
function validateSendBulk(body) {
  const errors = [];
  if (!body.recipientIds || !Array.isArray(body.recipientIds) || body.recipientIds.length === 0) {
    errors.push('recipientIds مطلوب ويجب أن يكون مصفوفة غير فارغة');
  }
  if (!body.title && !body.message && !body.type) {
    errors.push('يجب توفير title أو message أو type للإشعار');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات جدولة إشعار
 */
function validateScheduleNotification(body) {
  const errors = [];
  if (!body.scheduledAt && !body.sendAt && !body.scheduledTime) {
    errors.push('وقت الجدولة مطلوب (scheduledAt أو sendAt أو scheduledTime)');
  }
  if (!body.title && !body.message && !body.type) {
    errors.push('يجب توفير title أو message أو type للإشعار');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات التأجيل
 */
function validateSnoozeNotification(body) {
  const errors = [];
  if (!body.snoozeUntil) {
    errors.push('snoozeUntil مطلوب');
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
  validateSendNotification,
  validateSendBulk,
  validateScheduleNotification,
  validateSnoozeNotification,
  validate,
  VALID_CHANNELS,
};
