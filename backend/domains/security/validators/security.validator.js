'use strict';

/**
 * Security & RBAC Validators — مدقق بيانات الأمان والصلاحيات
 */

function validateCreateRole(body) {
  const errors = [];
  if (!body || !body.name) errors.push('اسم الدور مطلوب');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateCreatePermission(body) {
  const errors = [];
  if (!body || !body.name) errors.push('اسم الصلاحية مطلوب');
  if (!body || !body.resource) errors.push('المورد مطلوب');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateAssignPermission(body) {
  const errors = [];
  if (!body || !body.permissionId) errors.push('معرّف الصلاحية مطلوب');
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateCheckPermission(body) {
  const errors = [];
  if (!body || !body.userId) errors.push('معرّف المستخدم مطلوب');
  if (!body || !body.permission) errors.push('الصلاحية المراد التحقق منها مطلوبة');
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
  validateCreateRole,
  validateCreatePermission,
  validateAssignPermission,
  validateCheckPermission,
  validate,
};
