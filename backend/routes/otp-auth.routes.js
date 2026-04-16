/**
 * OTP Authentication Routes - مسارات المصادقة بواسطة OTP
 * نظام التسجيل والدخول عبر رمز التحقق
 * الإصدار 1.0.0
 */

const express = require('express');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { createCustomLimiter } = require('../middleware/rateLimiter');
const {
  otpService,
  sendLoginOTP,
  verifyLoginOTP,
  sendRegisterOTP,
  verifyRegisterOTP,
} = require('../auth/otp-service');
const { UnauthorizedError, ValidationError, TooManyRequestsError } = require('../errors/AppError');
const User = require('../models/User');

// JWT Secret
const { jwtSecret: JWT_SECRET } = require('../config/secrets');
const JWT_EXPIRE = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '15m';

// Rate limiters for OTP endpoints — strict to prevent brute-force
const otpSendLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP sends per window
  prefix: 'rl:otp-send:',
  message: { error: 'تجاوزت الحد المسموح من إرسال رموز التحقق' },
});

const otpVerifyLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 verify attempts per window
  prefix: 'rl:otp-verify:',
  message: { error: 'تجاوزت الحد المسموح من محاولات التحقق' },
});

/**
 * @route   POST /api/v1/auth/otp/send
 * @desc    إرسال رمز التحقق OTP
 * @access  Public
 *
 * @body { identifier, method, purpose }
 * - identifier: البريد الإلكتروني أو رقم الجوال
 * - method: email, sms, whatsapp, auto (افتراضي)
 * - purpose: login, register, resetPassword, verifyEmail, verifyPhone
 */
router.post(
  '/send',
  otpSendLimiter,
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('method')
      .optional()
      .isIn(['email', 'sms', 'whatsapp', 'auto'])
      .withMessage('طريقة الإرسال غير صالحة'),
    body('purpose')
      .optional()
      .isIn(['login', 'register', 'resetPassword', 'verifyEmail', 'verifyPhone', 'twoFactor'])
      .withMessage('الغرض غير صالح'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, method = 'auto', purpose = 'login' } = req.body;

      // الحصول على معلومات الطلب
      const metadata = {
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id'],
      };

      // إرسال OTP
      const result = await otpService.sendOTP({
        identifier,
        method,
        purpose,
        metadata,
      });

      res.json({
        success: true,
        message: result.message,
        data: {
          otpId: result.otpId,
          method: result.method,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      const msg = (error && error.message) || '';
      if (msg.includes('يرجى الانتظار') || msg.includes('الحد الأقصى')) {
        return next(new TooManyRequestsError('تم تجاوز الحد الأقصى للمحاولات'));
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/otp/verify
 * @desc    التحقق من رمز OTP
 * @access  Public
 *
 * @body { identifier, otp, purpose }
 */
router.post(
  '/verify',
  otpVerifyLimiter,
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('otp').isLength({ min: 4, max: 8 }).withMessage('رمز التحقق يجب أن يكون 4-8 أرقام'),
    body('purpose')
      .optional()
      .isIn(['login', 'register', 'resetPassword', 'verifyEmail', 'verifyPhone', 'twoFactor'])
      .withMessage('الغرض غير صالح'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, otp, purpose = 'login' } = req.body;

      // التحقق من OTP
      const result = await otpService.verifyOTP({
        identifier,
        otp,
        purpose,
        consume: true,
      });

      if (!result.success) {
        throw new UnauthorizedError(result.error);
      }

      // إذا كان الغرض تسجيل الدخول، إنشاء توكن
      if (purpose === 'login') {
        // Look up user from database
        const user = await User.findOne({
          $or: [{ email: identifier }, { phone: identifier }],
        }).select('-password');

        if (!user) {
          throw new UnauthorizedError('المستخدم غير موجود');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        // إنشاء التوكن
        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role, jti: crypto.randomUUID() },
          JWT_SECRET,
          {
            expiresIn: JWT_EXPIRE,
          }
        );

        return res.json({
          success: true,
          message: 'تم تسجيل الدخول بنجاح',
          data: {
            token,
            user: {
              id: user._id,
              email: user.email,
              name: user.fullName,
              role: user.role,
            },
            verifiedBy: result.identifierType,
          },
        });
      }

      // للتحقق من البريد أو الجوال
      if (purpose === 'verifyEmail' || purpose === 'verifyPhone') {
        return res.json({
          success: true,
          message:
            purpose === 'verifyEmail'
              ? 'تم تأكيد البريد الإلكتروني بنجاح'
              : 'تم تأكيد رقم الجوال بنجاح',
          data: {
            verified: true,
            identifier: result.identifier,
            identifierType: result.identifierType,
          },
        });
      }

      // لإعادة تعيين كلمة المرور
      if (purpose === 'resetPassword') {
        // إنشاء توكن مؤقت لإعادة تعيين كلمة المرور
        const resetToken = jwt.sign(
          { identifier, purpose: 'passwordReset', otpId: result.otpId },
          JWT_SECRET,
          { expiresIn: '15m' }
        );

        return res.json({
          success: true,
          message: 'تم التحقق بنجاح، يمكنك الآن إعادة تعيين كلمة المرور',
          data: {
            resetToken,
            expiresIn: 900, // 15 دقيقة
          },
        });
      }

      // رد عام
      res.json({
        success: true,
        message: 'تم التحقق بنجاح',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/otp/resend
 * @desc    إعادة إرسال رمز OTP
 * @access  Public
 */
router.post(
  '/resend',
  otpSendLimiter,
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('method').optional().isIn(['email', 'sms', 'whatsapp', 'auto']),
    body('purpose')
      .optional()
      .isIn(['login', 'register', 'resetPassword', 'verifyEmail', 'verifyPhone']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, method = 'auto', purpose = 'login' } = req.body;

      const _metadata = {
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = await otpService.resendOTP(identifier, purpose, method);

      res.json({
        success: true,
        message: result.message,
        data: {
          otpId: result.otpId,
          method: result.method,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      const msg = (error && error.message) || '';
      if (msg.includes('يرجى الانتظار') || msg.includes('الحد الأقصى')) {
        return next(new TooManyRequestsError('تم تجاوز الحد الأقصى للمحاولات'));
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/otp/login
 * @desc    تسجيل الدخول المباشر بـ OTP (إرسال + تحقق في خطوة واحدة)
 * @access  Public
 *
 * هذا المسار للوضع البسيط: يرسل OTP ويتوقع المستخدم إدخاله
 */
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('method').optional().isIn(['email', 'sms', 'whatsapp', 'auto']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, method = 'auto' } = req.body;

      const _metadata = {
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id'],
      };

      // إرسال OTP لتسجيل الدخول
      const result = await sendLoginOTP(identifier, method);

      res.json({
        success: true,
        message: result.message,
        data: {
          otpId: result.otpId,
          method: result.method,
          expiresIn: result.expiresIn,
          // معلومات إضافية للواجهة
          identifier: identifier.includes('@')
            ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
            : identifier.replace(/(.{4})(.*)/, '$1****'),
        },
      });
    } catch (error) {
      const msg = (error && error.message) || '';
      if (msg.includes('يرجى الانتظار') || msg.includes('الحد الأقصى')) {
        return next(new TooManyRequestsError('تم تجاوز الحد الأقصى للمحاولات'));
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/otp/login/verify
 * @desc    التحقق من OTP وتسجيل الدخول
 * @access  Public
 */
router.post(
  '/login/verify',
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('otp').isLength({ min: 4, max: 8 }).withMessage('رمز التحقق يجب أن يكون 4-8 أرقام'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, otp } = req.body;

      // التحقق من OTP
      const result = await verifyLoginOTP(identifier, otp);

      if (!result.success) {
        throw new UnauthorizedError(result.error);
      }

      // البحث عن المستخدم في قاعدة البيانات بالبريد أو الجوال
      const isEmail = identifier.includes('@');
      const query = isEmail ? { email: identifier } : { phone: identifier };
      const user = await User.findOne(query).select('-password');

      if (!user) {
        throw new UnauthorizedError('المستخدم غير مسجل. يرجى إنشاء حساب أولاً');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('هذا الحساب غير مفعل');
      }

      // تحديث آخر تسجيل دخول
      user.lastLogin = new Date();
      user.loginHistory.push({
        date: new Date(),
        ip: req.ip || req.socket?.remoteAddress,
        device: req.headers['user-agent'],
      });
      await user.save();

      // إنشاء التوكن
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          jti: crypto.randomUUID(),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      // إنشاء Refresh Token
      const { jwtRefreshSecret } = require('../config/secrets');
      const refreshToken = jwt.sign({ id: user._id, type: 'refresh' }, jwtRefreshSecret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: {
          token,
          refreshToken,
          expiresIn: 15 * 60, // 15 دقيقة بالثواني
          user: {
            id: user._id,
            email: user.email,
            phone: user.phone,
            name: user.fullName,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/otp/register
 * @desc    بدء عملية التسجيل بإرسال OTP
 * @access  Public
 */
router.post(
  '/register',
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('الاسم يجب أن يكون 2-100 حرف'),
    body('method').optional().isIn(['email', 'sms', 'whatsapp', 'auto']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, name, method = 'auto' } = req.body;

      // التحقق من عدم وجود المستخدم مسبقاً
      const isEmail = identifier.includes('@');
      const existQuery = isEmail ? { email: identifier } : { phone: identifier };
      const existingUser = await User.findOne(existQuery);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'هذا الحساب مسجل مسبقاً. يرجى تسجيل الدخول',
        });
      }

      const _metadata = {
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        name, // تخزين الاسم للتسجيل لاحقاً
      };

      const result = await sendRegisterOTP(identifier, method);

      res.json({
        success: true,
        message: result.message,
        data: {
          otpId: result.otpId,
          method: result.method,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      const msg = (error && error.message) || '';
      if (msg.includes('يرجى الانتظار') || msg.includes('الحد الأقصى')) {
        return next(new TooManyRequestsError('تم تجاوز الحد الأقصى للمحاولات'));
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/otp/register/complete
 * @desc    إكمال التسجيل بعد التحقق من OTP
 * @access  Public
 */
router.post(
  '/register/complete',
  [
    body('identifier').notEmpty().withMessage('البريد الإلكتروني أو رقم الجوال مطلوب'),
    body('otp').isLength({ min: 4, max: 8 }).withMessage('رمز التحقق يجب أن يكون 4-8 أرقام'),
    body('name').isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون 2-100 حرف'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array()[0].msg);
      }

      const { identifier, otp, name, password } = req.body;

      // التحقق من OTP
      const result = await verifyRegisterOTP(identifier, otp);

      if (!result.success) {
        throw new UnauthorizedError(result.error);
      }

      // التحقق من عدم وجود المستخدم مسبقاً
      const isEmail = identifier.includes('@');
      const existQuery = isEmail ? { email: identifier } : { phone: identifier };
      const existingUser = await User.findOne(existQuery);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'هذا الحساب مسجل مسبقاً. يرجى تسجيل الدخول',
        });
      }

      // إنشاء المستخدم في قاعدة البيانات
      const userData = {
        fullName: name,
        role: 'user',
        isActive: true,
      };

      if (isEmail) {
        userData.email = identifier;
        userData.emailVerified = true;
      } else {
        userData.phone = identifier;
        userData.phoneVerified = true;
      }

      // حفظ كلمة المرور إذا تم تقديمها (hash explicitly)
      if (password) {
        userData.password = await bcrypt.hash(password, 12);
      }

      const newUser = new User(userData);
      await newUser.save();

      // إنشاء التوكن
      const token = jwt.sign(
        {
          id: newUser._id,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          jti: crypto.randomUUID(),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحساب بنجاح',
        data: {
          token,
          user: {
            id: newUser._id,
            email: newUser.email,
            phone: newUser.phone,
            name: newUser.fullName,
            role: newUser.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/otp/methods
 * @desc    الحصول على طرق التحقق المتاحة
 * @access  Public
 */
router.get('/methods', (_req, res) => {
  res.json({
    success: true,
    data: {
      methods: [
        {
          id: 'email',
          name: 'البريد الإلكتروني',
          nameEn: 'Email',
          enabled: process.env.OTP_EMAIL_ENABLED !== 'false',
          icon: 'email',
        },
        {
          id: 'sms',
          name: 'الرسائل النصية',
          nameEn: 'SMS',
          enabled: process.env.OTP_SMS_ENABLED !== 'false',
          icon: 'sms',
        },
        {
          id: 'whatsapp',
          name: 'الواتساب',
          nameEn: 'WhatsApp',
          enabled: process.env.OTP_WHATSAPP_ENABLED !== 'false',
          icon: 'whatsapp',
        },
      ],
      purposes: [
        { id: 'login', name: 'تسجيل الدخول', expirySeconds: 300 },
        { id: 'register', name: 'التسجيل', expirySeconds: 600 },
        { id: 'resetPassword', name: 'إعادة تعيين كلمة المرور', expirySeconds: 300 },
        { id: 'verifyEmail', name: 'تأكيد البريد الإلكتروني', expirySeconds: 86400 },
        { id: 'verifyPhone', name: 'تأكيد رقم الجوال', expirySeconds: 600 },
        { id: 'twoFactor', name: 'التحقق الثنائي', expirySeconds: 120 },
      ],
      config: {
        otpLength: parseInt(process.env.OTP_LENGTH) || 6,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 3,
        resendCooldown: parseInt(process.env.OTP_RESEND_COOLDOWN) || 60,
      },
    },
  });
});

/**
 * @route   GET /api/v1/auth/otp/status/:otpId
 * @desc    التحقق من حالة OTP
 * @access  Public
 */
router.get('/status/:otpId', async (req, res, next) => {
  try {
    const { otpId } = req.params;

    const status = await otpService.getOTPStatus(otpId);

    if (!status) {
      return res.json({
        success: false,
        message: 'رمز التحقق غير موجود',
      });
    }

    res.json({
      success: true,
      data: {
        otpId: status.otpId,
        status: status.status,
        expiresAt: status.expiresAt,
        attempts: status.attempts,
        maxAttempts: status.maxAttempts,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
