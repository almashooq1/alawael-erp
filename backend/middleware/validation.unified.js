/**
 * ✅ Unified Validation Middleware - middleware التحقق الموحد
 * يجمع كل وظائف التحقق في ملف واحد
 * @version 2.0.0
 */

const { body, param, query, validationResult } = require('express-validator');

// ============================================
// 1. معالجة نتائج التحقق
// ============================================

/**
 * معالجة أخطاء التحقق
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * التحقق من صحة البيانات وإرجاع الأخطاء
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // تنفيذ جميع التحققات
    await Promise.all(validations.map(validation => validation.run(req)));

    // معالجة النتائج
    handleValidationErrors(req, res, next);
  };
};

// ============================================
// 2. قواعد التحقق الأساسية
// ============================================

/**
 * التحقق من البريد الإلكتروني
 */
const emailRules = () => [
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('بريد إلكتروني غير صالح')
    .normalizeEmail()
];

/**
 * التحقق من كلمة المرور
 */
const passwordRules = (minLength = 8) => [
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: minLength }).withMessage(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`)
    .matches(/\d/).withMessage('كلمة المرور يجب أن تحتوي على رقم')
    .matches(/[a-z]/).withMessage('كلمة المرور يجب أن تحتوي على حرف صغير')
    .matches(/[A-Z]/).withMessage('كلمة المرور يجب أن تحتوي على حرف كبير')
];

/**
 * التحقق من كلمة المرور البسيطة (للاختبار)
 */
const simplePasswordRules = (minLength = 6) => [
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: minLength }).withMessage(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`)
];

/**
 * التحقق من رقم الهاتف
 */
const phoneRules = () => [
  body('phone')
    .notEmpty().withMessage('رقم الهاتف مطلوب')
    .matches(/^(\+966|0)?5\d{8}$/).withMessage('رقم هاتف سعودي غير صالح')
];

/**
 * التحقق من الرقم الوطني
 */
const nationalIdRules = () => [
  body('nationalId')
    .notEmpty().withMessage('رقم الهوية مطلوب')
    .isLength({ min: 10, max: 10 }).withMessage('رقم الهوية يجب أن يكون 10 أرقام')
    .matches(/^[12]\d{9}$/).withMessage('رقم هوية سعودي غير صالح')
];

// ============================================
// 3. التحقق من الموارد
// ============================================

/**
 * التحقق من ID
 */
const idRules = (paramName = 'id') => [
  param(paramName)
    .notEmpty().withMessage('المعرف مطلوب')
    .isMongoId().withMessage('معرف غير صالح')
];

/**
 * التحقق من الترقيم الصفحي
 */
const paginationRules = () => [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('رقم الصفحة يجب أن يكون رقم صحيح موجب'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('حد الصفحة يجب أن يكون بين 1 و 100')
];

/**
 * التحقق من التاريخ
 */
const dateRules = (fieldName = 'date') => [
  body(fieldName)
    .notEmpty().withMessage('التاريخ مطلوب')
    .isISO8601().withMessage('تاريخ غير صالح')
    .toDate()
];

// ============================================
// 4. التحقق من المستخدمين
// ============================================

/**
 * التحقق من بيانات المستخدم الكاملة
 */
const userRules = () => [
  ...emailRules(),
  body('name')
    .trim()
    .notEmpty().withMessage('الاسم مطلوب')
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و 100 حرف'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee', 'user']).withMessage('دور غير صالح')
];

/**
 * التحقق من تسجيل الدخول
 */
const loginRules = () => [
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('بريد إلكتروني غير صالح'),
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
];

/**
 * التحقق من تحديث المستخدم
 */
const updateUserRules = () => [
  param('id')
    .notEmpty().withMessage('المعرف مطلوب')
    .isMongoId().withMessage('معرف غير صالح'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و 100 حرف'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('بريد إلكتروني غير صالح'),
  body('phone')
    .optional()
    .matches(/^(\+966|0)?5\d{8}$/).withMessage('رقم هاتف سعودي غير صالح')
];

// ============================================
// 5. التحقق من الموظفين
// ============================================

/**
 * التحقق من بيانات الموظف
 */
const employeeRules = () => [
  body('fullName')
    .trim()
    .notEmpty().withMessage('الاسم الكامل مطلوب')
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و 100 حرف'),
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('بريد إلكتروني غير صالح'),
  body('nationalId')
    .notEmpty().withMessage('رقم الهوية مطلوب')
    .isLength({ min: 10, max: 10 }).withMessage('رقم الهوية يجب أن يكون 10 أرقام'),
  body('department')
    .optional()
    .trim(),
  body('position')
    .optional()
    .trim(),
  body('salary')
    .optional()
    .isFloat({ min: 0 }).withMessage('الراتب يجب أن يكون رقم موجب'),
  body('joinDate')
    .optional()
    .isISO8601().withMessage('تاريخ غير صالح')
];

/**
 * التحقق من بيانات الموظف للتسجيل
 */
const validateEmployee = (req, res, next) => {
  const { email, fullName, nationalId } = req.body;
  const errors = [];

  if (!email || !email.includes('@')) {
    errors.push({ field: 'email', message: 'بريد إلكتروني غير صالح' });
  }

  if (!fullName || fullName.length < 2) {
    errors.push({ field: 'fullName', message: 'الاسم يجب أن يكون حرفين على الأقل' });
  }

  if (!nationalId || !/^\d{10}$/.test(nationalId)) {
    errors.push({ field: 'nationalId', message: 'رقم الهوية يجب أن يكون 10 أرقام' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة',
      errors
    });
  }

  next();
};

// ============================================
// 6. التحقق من المستفيدين
// ============================================

/**
 * التحقق من بيانات المستفيد
 */
const beneficiaryRules = () => [
  body('name')
    .trim()
    .notEmpty().withMessage('الاسم مطلوب')
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و 100 حرف'),
  body('nationalId')
    .notEmpty().withMessage('رقم الهوية مطلوب')
    .matches(/^[12]\d{9}$/).withMessage('رقم هوية سعودي غير صالح'),
  body('dateOfBirth')
    .notEmpty().withMessage('تاريخ الميلاد مطلوب')
    .isISO8601().withMessage('تاريخ غير صالح'),
  body('gender')
    .notEmpty().withMessage('الجنس مطلوب')
    .isIn(['male', 'female']).withMessage('جنس غير صالح'),
  body('disabilityType')
    .optional()
    .trim()
];

// ============================================
// 7. التحقق من الملفات
// ============================================

/**
 * التحقق من رفع الملفات
 */
const fileUploadRules = () => [
  body('file')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('الملف مطلوب');
      }
      return true;
    })
];

/**
 * التحقق من حجم الملف
 */
const maxFileSize = (maxSizeInMB = 5) => {
  return (req, res, next) => {
    if (req.file && req.file.size > maxSizeInMB * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: `حجم الملف يجب أن لا يتجاوز ${maxSizeInMB} ميجابايت`
      });
    }
    next();
  };
};

/**
 * التحقق من نوع الملف
 */
const allowedFileTypes = (allowedTypes = []) => {
  return (req, res, next) => {
    if (req.file && allowedTypes.length > 0) {
      const mimeType = req.file.mimetype;
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({
          success: false,
          message: `نوع الملف غير مسموح. الأنواع المسموحة: ${allowedTypes.join(', ')}`
        });
      }
    }
    next();
  };
};

// ============================================
// 8. التحقق من المالية
// ============================================

/**
 * التحقق من المبالغ المالية
 */
const amountRules = (fieldName = 'amount') => [
  body(fieldName)
    .notEmpty().withMessage('المبلغ مطلوب')
    .isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون رقم موجب')
];

/**
 * التحقق من الفاتورة
 */
const invoiceRules = () => [
  body('invoiceNumber')
    .trim()
    .notEmpty().withMessage('رقم الفاتورة مطلوب'),
  body('amount')
    .notEmpty().withMessage('المبلغ مطلوب')
    .isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون رقم موجب'),
  body('dueDate')
    .notEmpty().withMessage('تاريخ الاستحقاق مطلوب')
    .isISO8601().withMessage('تاريخ غير صالح'),
  body('customerId')
    .notEmpty().withMessage('معرف العميل مطلوب')
    .isMongoId().withMessage('معرف غير صالح')
];

// ============================================
// 9. التحقق المخصص
// ============================================

/**
 * إنشاء قاعدة تحقق مخصصة
 */
const customRule = (field, validator, message) => {
  return body(field).custom(validator).withMessage(message);
};

/**
 * التحقق من وجود حقل
 */
const required = (field, customMessage) => {
  return body(field)
    .notEmpty()
    .withMessage(customMessage || `${field} مطلوب`);
};

/**
 * التحقق من أن الحقل اختياري
 */
const optional = (field) => {
  return body(field).optional();
};

/**
 * التحقق من النص
 */
const stringRule = (field, minLength = 0, maxLength = 1000) => {
  return body(field)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} يجب أن يكون بين ${minLength} و ${maxLength} حرف`);
};

/**
 * التحقق من الرقم
 */
const numberRule = (field, min = -Infinity, max = Infinity) => {
  return body(field)
    .isFloat({ min, max })
    .withMessage(`${field} يجب أن يكون رقم بين ${min} و ${max}`);
};

// ============================================
// 10. sanitize البيانات
// ============================================

/**
 * تنظيف البيانات المدخلة
 */
const sanitizeInput = (req, res, next) => {
  // تنظيف الـ body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // تنظيف الـ query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // تنظيف الـ params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * تنظيف كائن
 */
const sanitizeObject = (obj) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // إزالة المسافات الزائدة
      sanitized[key] = value.trim();
      // إزالة الأحرف الخطرة
      sanitized[key] = sanitized[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * منع حقن NoSQL
 */
const preventNoSQLInjection = (req, res, next) => {
  const checkForInjection = (obj) => {
    if (!obj || typeof obj !== 'object') return false;

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$') || key === '__proto__') {
        return true;
      }
      if (typeof value === 'object' && checkForInjection(value)) {
        return true;
      }
    }
    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة'
    });
  }

  next();
};

// ============================================
// التصدير - Exports
// ============================================

module.exports = {
  // Main validation handler
  validate,
  handleValidationErrors,

  // Basic rules
  emailRules,
  passwordRules,
  simplePasswordRules,
  phoneRules,
  nationalIdRules,
  idRules,
  paginationRules,
  dateRules,

  // Entity rules
  userRules,
  loginRules,
  updateUserRules,
  employeeRules,
  validateEmployee,
  beneficiaryRules,

  // File rules
  fileUploadRules,
  maxFileSize,
  allowedFileTypes,

  // Financial rules
  amountRules,
  invoiceRules,

  // Custom rules
  customRule,
  required,
  optional,
  stringRule,
  numberRule,

  // Sanitization
  sanitizeInput,
  sanitizeObject,
  preventNoSQLInjection,

  // Aliases for backward compatibility
  validationResult,
  body,
  param,
  query
};
