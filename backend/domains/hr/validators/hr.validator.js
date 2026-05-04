'use strict';

/**
 * HR Domain Validators — التحقق من مدخلات الموارد البشرية
 */

const VALID_LEAVE_TYPES = [
  'annual',
  'sick',
  'emergency',
  'maternity',
  'paternity',
  'unpaid',
  'other',
];

/**
 * التحقق من بيانات إنشاء موظف جديد
 */
function validateCreateEmployee(body) {
  const errors = [];
  if (!body.firstName && !body.name) errors.push('اسم الموظف مطلوب (firstName أو name)');
  if (body.firstName && typeof body.firstName !== 'string')
    errors.push('firstName يجب أن يكون نصاً');
  if (body.lastName && typeof body.lastName !== 'string') errors.push('lastName يجب أن يكون نصاً');
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('صيغة البريد الإلكتروني غير صحيحة');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من بيانات تحديث موظف
 */
function validateUpdateEmployee(body) {
  const errors = [];
  if (!body || Object.keys(body).length === 0) {
    errors.push('يجب توفير حقل واحد على الأقل للتحديث');
    return { valid: false, errors };
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('صيغة البريد الإلكتروني غير صحيحة');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من طلب إجازة
 */
function validateRequestLeave(body) {
  const errors = [];
  if (!body.type) {
    errors.push('نوع الإجازة مطلوب');
  } else if (!VALID_LEAVE_TYPES.includes(body.type)) {
    errors.push(`نوع الإجازة غير صالح. المقبول: ${VALID_LEAVE_TYPES.join(', ')}`);
  }
  if (!body.startDate) errors.push('تاريخ بدء الإجازة مطلوب');
  if (!body.endDate) errors.push('تاريخ انتهاء الإجازة مطلوب');
  if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) {
    errors.push('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء');
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * التحقق من تسجيل الحضور
 */
function validateCheckIn(body) {
  const errors = [];
  if (body.location !== undefined && typeof body.location !== 'object') {
    errors.push('location يجب أن يكون كائناً (lat/lng)');
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
  validateCreateEmployee,
  validateUpdateEmployee,
  validateRequestLeave,
  validateCheckIn,
  validate,
  VALID_LEAVE_TYPES,
};
