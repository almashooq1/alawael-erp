/**
 * ✅ Validation Middleware - التحقق من صحة المدخلات
 * نظام ERP الألوائل - إصدار احترافي
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * معالجة أخطاء التحقق
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق من البيانات',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * التحقق من تسجيل المستخدم
 */
const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صالح')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('البريد الإلكتروني طويل جداً'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/[A-Z]/)
    .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
    .matches(/[a-z]/)
    .withMessage('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
    .matches(/[0-9]/)
    .withMessage('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'),

  body('fullName')
    .notEmpty()
    .withMessage('الاسم الكامل مطلوب')
    .isLength({ min: 2, max: 100 })
    .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
    .trim(),

  body('role')
    .optional()
    .isIn(['user', 'admin', 'manager', 'employee', 'hr', 'accountant'])
    .withMessage('الدور غير صالح'),

  body('phone')
    .optional()
    .matches(/^(\+966|0)?5\d{8}$/)
    .withMessage('رقم الجوال غير صالح'),

  handleValidationErrors
];

/**
 * التحقق من تغيير كلمة المرور
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('كلمة المرور الحالية مطلوبة'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .matches(/[A-Z]/)
    .withMessage('كلمة المرور الجديدة يجب أن تحتوي على حرف كبير')
    .matches(/[a-z]/)
    .withMessage('كلمة المرور الجديدة يجب أن تحتوي على حرف صغير')
    .matches(/[0-9]/)
    .withMessage('كلمة المرور الجديدة يجب أن تحتوي على رقم')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية');
      }
      return true;
    }),

  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('تأكيد كلمة المرور غير متطابق');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * التحقق من تسجيل الدخول
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صالح')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة'),

  handleValidationErrors
];

/**
 * التحقق من معرف MongoDB
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`معرف ${paramName} غير صالح`),

  handleValidationErrors
];

/**
 * التحقق من الترقيم
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('رقم الصفحة يجب أن يكون رقماً موجباً'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('الحد يجب أن يكون بين 1 و 100'),

  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z_,]+$/)
    .withMessage('حقل الترتيب غير صالح'),

  handleValidationErrors
];

/**
 * التحقق من التواريخ
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صالح')
    .toDate(),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صالح')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.startDate && value < new Date(req.query.startDate)) {
        throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * التحقق من الملفات
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }

    const files = req.files || [req.file];

    for (const file of files) {
      // التحقق من الحجم
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `حجم الملف يتجاوز الحد المسموح (${maxSize / 1024 / 1024} MB)`
        });
      }

      // التحقق من النوع
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `نوع الملف غير مسموح: ${file.mimetype}`
        });
      }
    }

    next();
  };
};

/**
 * تنظيف المدخلات
 */
const sanitizeInput = (req, res, next) => {
  // تنظيف النصوص من HTML
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#x27;')
        .trim();
    }
    return value;
  };

  // تنظيف body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeValue(req.body[key]);
      }
    }
  }

  // تنظيف query
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeValue(req.query[key]);
      }
    }
  }

  next();
};

/**
 * منع حقن NoSQL
 */
const preventNoSQLInjection = (req, res, next) => {
  const checkForInjection = (obj) => {
    if (!obj || typeof obj !== 'object') return false;

    const dangerousKeys = ['$gt', '$lt', '$gte', '$lte', '$ne', '$in', '$nin', '$or', '$and', '$regex', '$where'];

    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      if (typeof obj[key] === 'object' && checkForInjection(obj[key])) {
        return true;
      }
    }
    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query)) {
    return res.status(400).json({
      success: false,
      message: 'تم اكتشاف محاولة حقن غير صالحة'
    });
  }

  next();
};

// Password policy configuration
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

// Backward compatibility functions
const validatePassword = (password) => {
  const result = { valid: true, errors: [] };

  // Handle null/undefined
  if (!password || typeof password !== 'string') {
    result.errors.push('كلمة المرور مطلوبة');
    result.valid = false;
    return result;
  }

  if (password.length < passwordPolicy.minLength) {
    result.errors.push(`كلمة المرور يجب أن تكون ${passwordPolicy.minLength} أحرف على الأقل`);
    result.valid = false;
  }
  if (password.length > passwordPolicy.maxLength) {
    result.errors.push(`كلمة المرور يجب ألا تتجاوز ${passwordPolicy.maxLength} حرف`);
    result.valid = false;
  }
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    result.errors.push('كلمة المرور يجب أن تحتوي على حرف كبير');
    result.valid = false;
  }
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    result.errors.push('كلمة المرور يجب أن تحتوي على حرف صغير');
    result.valid = false;
  }
  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
    result.errors.push('كلمة المرور يجب أن تحتوي على رقم');
    result.valid = false;
  }
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.errors.push('كلمة المرور يجب أن تحتوي على حرف خاص');
    result.valid = false;
  }

  return result;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valid: emailRegex.test(email),
    errors: emailRegex.test(email) ? [] : ['البريد الإلكتروني غير صالح']
  };
};

const validateFullName = (name) => {
  return {
    valid: name && name.length >= 2 && name.length <= 100,
    errors: (!name || name.length < 2) ? ['الاسم يجب أن يكون حرفين على الأقل'] : []
  };
};

const validatePhone = (phone) => {
  const phoneRegex = /^(\+966|0)?5\d{8}$/;
  return {
    valid: phoneRegex.test(phone),
    errors: phoneRegex.test(phone) ? [] : ['رقم الجوال غير صالح']
  };
};

const validateNationalId = (nationalId) => {
  const idRegex = /^[12]\d{9}$/;
  return {
    valid: idRegex.test(nationalId),
    errors: idRegex.test(nationalId) ? [] : ['رقم الهوية غير صالح']
  };
};

/**
 * التحقق من تحديث ملف تعريف المستخدم
 */
const validateProfileUpdate = [
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
    .trim(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صالح')
    .normalizeEmail(),

  body('phone')
    .optional()
    .matches(/^(\+966|0)?5\d{8}$/)
    .withMessage('رقم الجوال غير صالح'),

  body('role')
    .optional()
    .isIn(['user', 'admin', 'manager', 'employee', 'hr', 'accountant'])
    .withMessage('الدور غير صالح'),

  handleValidationErrors
];

module.exports = {
  // New exports
  handleValidationErrors,
  validateRegistration,
  validatePasswordChange,
  validateProfileUpdate,
  validateLogin,
  validateObjectId,
  validatePagination,
  validateDateRange,
  validateFileUpload,
  sanitizeInput,
  preventNoSQLInjection,
  // Backward compatibility exports
  passwordPolicy,
  validatePassword,
  validateEmail,
  validateFullName,
  validatePhone,
  validateNationalId
};
