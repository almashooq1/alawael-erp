/**
 * Advanced Request Validation Schemas
 * مخططات التحقق المتقدمة من الطلبات
 */

const Joi = require('joi');

/**
 * Schemas مشتركة
 */
const commonSchemas = {
  // معرّف
  id: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'معرف غير صحيح',
      'any.required': 'المعرف مطلوب',
    }),

  // البريد الإلكتروني
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'بريد إلكتروني غير صحيح',
    'any.required': 'البريد الإلكتروني مطلوب',
  }),

  // كلمة المرور
  password: Joi.string()
    .min(8)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .messages({
      'string.min': 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
      'string.pattern.base': 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة',
      'any.required': 'كلمة المرور مطلوبة',
    }),

  // الهاتف
  phone: Joi.string()
    .pattern(/^(\+966|0)[0-9]{9}$/)
    .messages({
      'string.pattern.base': 'رقم هاتف سعودي غير صحيح',
    }),

  // الاسم
  name: Joi.string().min(2).max(100).trim().messages({
    'string.min': 'الاسم يجب أن يكون أكثر من حرفين',
    'string.max': 'الاسم يجب أن لا يتجاوز 100 حرف',
  }),

  // التاريخ
  date: Joi.date().iso().messages({
    'date.base': 'تاريخ غير صحيح',
  }),

  // URL
  url: Joi.string().uri().messages({
    'string.uri': 'رابط غير صحيح',
  }),

  // عملة
  amount: Joi.number().positive().precision(2).messages({
    'number.base': 'يجب أن تكون قيمة رقمية',
    'number.positive': 'يجب أن تكون القيمة موجبة',
  }),

  // النسبة المئوية
  percentage: Joi.number().min(0).max(100).messages({
    'number.min': 'يجب أن تكون النسبة بين 0 و 100',
    'number.max': 'يجب أن تكون النسبة بين 0 و 100',
  }),
};

/**
 * User Validation Schemas
 */
const userSchemas = {
  // تسجيل جديد
  register: Joi.object().keys({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name.required(),
    phone: commonSchemas.phone,
    role: Joi.string().valid('user', 'admin', 'manager').default('user').messages({
      'any.only': 'دور غير صحيح',
    }),
    agreeToTerms: Joi.boolean().valid(true).required().messages({
      'any.required': 'يجب الموافقة على الشروط والأحكام',
    }),
  }),

  // تسجيل الدخول
  login: Joi.object().keys({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'كلمة المرور مطلوبة',
    }),
    rememberMe: Joi.boolean().default(false),
  }),

  // تحديث الملف الشخصي
  updateProfile: Joi.object().keys({
    name: commonSchemas.name,
    phone: commonSchemas.phone,
    avatar: commonSchemas.url,
    bio: Joi.string().max(500),
  }),

  // تغيير كلمة المرور
  changePassword: Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'كلمات المرور غير متطابقة',
    }),
  }),
};

/**
 * Order Validation Schemas
 */
const orderSchemas = {
  // إنشاء طلب
  create: Joi.object().keys({
    items: Joi.array()
      .items(
        Joi.object().keys({
          productId: commonSchemas.id,
          quantity: Joi.number().integer().positive().required().messages({
            'number.positive': 'الكمية يجب أن تكون موجبة',
          }),
          price: commonSchemas.amount.required(),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'يجب أن يحتوي الطلب على عنصر واحد على الأقل',
      }),

    shippingAddress: Joi.object()
      .keys({
        street: Joi.string().required(),
        city: Joi.string().required(),
        postalCode: Joi.string().required(),
        country: Joi.string().required(),
      })
      .required(),

    paymentMethod: Joi.string().valid('credit_card', 'bank_transfer', 'cash').required().messages({
      'any.only': 'طريقة دفع غير صحيحة',
    }),

    notes: Joi.string().max(500),
  }),

  // تحديث الحالة
  updateStatus: Joi.object().keys({
    status: Joi.string()
      .valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
      .required()
      .messages({
        'any.only': 'حالة غير صحيحة',
      }),
    reason: Joi.string().when('status', {
      is: 'cancelled',
      then: Joi.required().messages({
        'any.required': 'السبب مطلوب عند إلغاء الطلب',
      }),
      otherwise: Joi.optional(),
    }),
  }),
};

/**
 * Pagination Validation
 */
const paginationSchema = Joi.object().keys({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'رقم الصفحة يجب أن يكون أكثر من 0',
  }),

  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.min': 'الحد الأدنى 1',
    'number.max': 'الحد الأقصى 100',
  }),

  sort: Joi.string()
    .pattern(/^-?[a-zA-Z_]+$/)
    .messages({
      'string.pattern.base': 'ترتيب غير صحيح',
    }),

  search: Joi.string().max(100),
});

/**
 * Middleware للتحقق من البيانات
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        messageAr: detail.context?.messageAr || detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'خطأ في التحقق من البيانات',
          details: errors,
        },
      });
    }

    req[property] = value;
    next();
  };
};

/**
 * Middleware مجمع للتحقق
 */
const validateRequest = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      }
    );

    if (error) {
      const errors = error.details.map(detail => ({
        location: detail.path[0],
        field: detail.path.slice(1).join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'خطأ في التحقق من البيانات',
          details: errors,
        },
      });
    }

    req.body = value.body || req.body;
    req.query = value.query || req.query;
    req.params = value.params || req.params;
    next();
  };
};

module.exports = {
  commonSchemas,
  userSchemas,
  orderSchemas,
  paginationSchema,
  validate,
  validateRequest,
};
