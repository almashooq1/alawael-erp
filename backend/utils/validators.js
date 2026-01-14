// backend/utils/validators.js
const Joi = require('joi');

// Auth Validators
const authValidators = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'البريد الإلكتروني غير صحيح',
      'any.required': 'البريد الإلكتروني مطلوب',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      'any.required': 'كلمة المرور مطلوبة',
    }),
  }),

  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'البريد الإلكتروني غير صحيح',
      'any.required': 'البريد الإلكتروني مطلوب',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      'any.required': 'كلمة المرور مطلوبة',
    }),
    fullName: Joi.string().required().messages({
      'any.required': 'الاسم الكامل مطلوب',
    }),
  }),
};

// Employee Validators
const employeeValidators = {
  create: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'الاسم مطلوب',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'البريد الإلكتروني غير صحيح',
      'any.required': 'البريد الإلكتروني مطلوب',
    }),
    department: Joi.string().required().messages({
      'any.required': 'القسم مطلوب',
    }),
    position: Joi.string().required().messages({
      'any.required': 'الوظيفة مطلوبة',
    }),
    salary: Joi.number().positive().required().messages({
      'number.positive': 'الراتب يجب أن يكون رقماً موجباً',
      'any.required': 'الراتب مطلوب',
    }),
  }),

  update: Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    department: Joi.string(),
    position: Joi.string(),
    salary: Joi.number().positive(),
  }),
};

// Finance Validators
const financeValidators = {
  createInvoice: Joi.object({
    clientName: Joi.string().required(),
    amount: Joi.number().positive().required(),
    dueDate: Joi.date().required(),
    description: Joi.string(),
  }),

  createExpense: Joi.object({
    category: Joi.string().required(),
    amount: Joi.number().positive().required(),
    description: Joi.string(),
  }),
};

// Validation middleware
const validate = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: messages,
      });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = {
  authValidators,
  employeeValidators,
  financeValidators,
  validate,
};
