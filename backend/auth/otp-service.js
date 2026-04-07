/* eslint-disable no-unused-vars */
/**
 * OTP Service - خدمة رمز التحقق الموحد
 * نظام التحقق عبر OTP للبريد الإلكتروني والواتساب والرسائل النصية
 * الإصدار 1.0.0
 */

const crypto = require('crypto');
const {
  smsService,
  sendOTP: sendSMSOTP,
  verifyOTP: verifySMSOTP,
} = require('../communication/sms-service');
const { whatsappService, sendWhatsAppOTP } = require('../communication/whatsapp-service');
const logger = require('../utils/logger');

/**
 * OTP Configuration
 */
const otpConfig = {
  // إعدادات OTP العامة
  otp: {
    length: parseInt(process.env.OTP_LENGTH) || 6,
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS) || 300, // 5 دقائق
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 3,
    resendCooldown: parseInt(process.env.OTP_RESEND_COOLDOWN) || 60, // ثانية
  },

  // طرق الإرسال المتاحة
  methods: {
    email: {
      enabled: process.env.OTP_EMAIL_ENABLED !== 'false',
      provider: process.env.EMAIL_PROVIDER || 'azure',
    },
    sms: {
      enabled: process.env.OTP_SMS_ENABLED !== 'false',
      provider: process.env.SMS_PROVIDER || 'twilio',
    },
    whatsapp: {
      enabled: process.env.OTP_WHATSAPP_ENABLED !== 'false',
      provider: process.env.WHATSAPP_PROVIDER || 'cloud_api',
    },
  },

  // أنواع OTP
  purposes: {
    login: { expirySeconds: 300, maxAttempts: 5 },
    register: { expirySeconds: 600, maxAttempts: 3 },
    resetPassword: { expirySeconds: 300, maxAttempts: 3 },
    verifyEmail: { expirySeconds: 86400, maxAttempts: 5 }, // 24 ساعة
    verifyPhone: { expirySeconds: 600, maxAttempts: 3 },
    twoFactor: { expirySeconds: 120, maxAttempts: 3 },
    changePassword: { expirySeconds: 300, maxAttempts: 3 },
    deleteAccount: { expirySeconds: 300, maxAttempts: 3 },
  },
};

/**
 * OTP Store Schema (for database)
 */
const OTPSchema = {
  otpId: { type: String, required: true, unique: true },
  identifier: { type: String, required: true, index: true }, // email, phone, userId
  identifierType: { type: String, enum: ['email', 'phone', 'userId'], required: true },
  otp: { type: String, required: true },
  purpose: { type: String, required: true },
  method: { type: String, enum: ['email', 'sms', 'whatsapp'], required: true },
  status: { type: String, enum: ['pending', 'verified', 'expired', 'used'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  expiresAt: { type: Date, required: true },
  verifiedAt: { type: Date },
  metadata: {
    userId: String,
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    location: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

/**
 * OTP Service Class
 */
class OTPService {
  constructor() {
    this.OTPModel = null;
    this.otpStore = new Map(); // في الذاكرة للتجربة
    this.rateLimitStore = new Map();
    this.config = otpConfig;
  }

  /**
   * Initialize OTP Service
   */
  async initialize(connection) {
    if (connection) {
      const mongoose = require('mongoose');
      this.OTPModel = connection.model('OTP', new mongoose.Schema(OTPSchema));
      logger.info('✅ OTP Service initialized with database');
    } else {
      logger.info('✅ OTP Service initialized with in-memory store');
    }
  }

  /**
   * Generate OTP
   */
  generateOTP(length = this.config.otp.length) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[crypto.randomInt(digits.length)];
    }
    return otp;
  }

  /**
   * Generate OTP ID
   */
  generateOTPId() {
    return `otp_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  /**
   * Format phone number for Saudi Arabia
   */
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    if (!cleaned.startsWith('966')) {
      cleaned = '966' + cleaned;
    }
    return cleaned;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (Saudi)
   */
  isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    // أرقام الجوال السعودية: 05xxxxxxxx أو 9665xxxxxxxx
    return /^(05\d{8}|9665\d{8})$/.test(cleaned);
  }

  /**
   * Check rate limit
   */
  checkRateLimit(identifier, purpose) {
    const key = `${identifier}:${purpose}`;
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (record) {
      // التحقق من فترة الانتظار
      if (now < record.nextAllowedAt) {
        const waitSeconds = Math.ceil((record.nextAllowedAt - now) / 1000);
        return {
          allowed: false,
          waitSeconds,
          message: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز جديد`,
        };
      }
      // التحقق من الحد الأقصى للطلبات
      if (record.count >= 5 && now < record.resetAt) {
        return {
          allowed: false,
          waitSeconds: Math.ceil((record.resetAt - now) / 1000),
          message: 'تم تجاوز الحد الأقصى من الطلبات. يرجى المحاولة لاحقاً',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Update rate limit
   */
  updateRateLimit(identifier, purpose) {
    const key = `${identifier}:${purpose}`;
    const now = Date.now();
    const record = this.rateLimitStore.get(key) || {
      count: 0,
      nextAllowedAt: now,
      resetAt: now + 3600000, // ساعة واحدة
    };

    record.count++;
    record.nextAllowedAt = now + this.config.otp.resendCooldown * 1000;
    this.rateLimitStore.set(key, record);

    return record;
  }

  /**
   * Send OTP - Main Method
   */
  async sendOTP(options) {
    const {
      identifier, // البريد أو رقم الجوال
      method = 'auto', // email, sms, whatsapp, auto
      purpose = 'login',
      metadata = {},
    } = options;

    // تحديد نوع المعرف وطريقة الإرسال
    let identifierType = 'email';
    let actualMethod = method;

    if (this.isValidEmail(identifier)) {
      identifierType = 'email';
      actualMethod = method === 'auto' ? 'email' : method;
    } else if (this.isValidPhone(identifier)) {
      identifierType = 'phone';
      actualMethod = method === 'auto' ? 'sms' : method;
    } else {
      throw new Error('صيغة البريد الإلكتروني أو رقم الجوال غير صحيحة');
    }

    // التحقق من تفعيل الطريقة
    if (!this.config.methods[actualMethod]?.enabled) {
      throw new Error(`طريقة الإرسال "${actualMethod}" غير مفعلة`);
    }

    // التحقق من Rate Limit
    const rateCheck = this.checkRateLimit(identifier, purpose);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.message);
    }

    // الحصول على إعدادات الغرض
    const purposeConfig = this.config.purposes[purpose] || this.config.otp;
    const expirySeconds = purposeConfig.expirySeconds || this.config.otp.expirySeconds;
    const maxAttempts = purposeConfig.maxAttempts || this.config.otp.maxAttempts;

    // إنشاء OTP
    const otp = this.generateOTP();
    const otpId = this.generateOTPId();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // تخزين OTP
    const otpRecord = {
      otpId,
      identifier,
      identifierType,
      otp,
      purpose,
      method: actualMethod,
      status: 'pending',
      attempts: 0,
      maxAttempts,
      expiresAt,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.OTPModel) {
      // إلغاء أي OTP سابق لنفس المعرف والغرض
      await this.OTPModel.updateMany(
        { identifier, purpose, status: 'pending' },
        { status: 'expired' }
      );
      await this.OTPModel.create(otpRecord);
    } else {
      // تخزين في الذاكرة
      const key = `${identifier}:${purpose}`;
      this.otpStore.set(key, otpRecord);
    }

    // إرسال OTP
    try {
      let sendResult;
      const formattedPhone =
        identifierType === 'phone' ? this.formatPhoneNumber(identifier) : identifier;

      switch (actualMethod) {
        case 'email':
          sendResult = await this.sendOTPViaEmail(identifier, otp, purpose);
          break;
        case 'sms':
          sendResult = await this.sendOTPViaSMS(formattedPhone, otp, purpose);
          break;
        case 'whatsapp':
          sendResult = await this.sendOTPViaWhatsApp(formattedPhone, otp, purpose);
          break;
        default:
          throw new Error('طريقة إرسال غير صالحة');
      }

      // تحديث Rate Limit
      this.updateRateLimit(identifier, purpose);

      return {
        success: true,
        otpId,
        method: actualMethod,
        expiresIn: expirySeconds,
        message: this.getSuccessMessage(actualMethod, identifier),
      };
    } catch (error) {
      // حذف OTP في حالة فشل الإرسال
      if (this.OTPModel) {
        await this.OTPModel.deleteOne({ otpId });
      } else {
        const key = `${identifier}:${purpose}`;
        this.otpStore.delete(key);
      }
      throw new Error(`فشل إرسال رمز التحقق: ${error.message}`);
    }
  }

  /**
   * Send OTP via Email
   */
  async sendOTPViaEmail(email, otp, purpose) {
    // استخدام خدمة البريد الإلكتروني
    const emailService = require('../communication/email-service');

    const subject = this.getEmailSubject(purpose);
    const body = this.getEmailBody(otp, purpose);

    // إذا كانت خدمة البريد متاحة
    if (emailService && emailService.sendEmail) {
      return emailService.sendEmail({
        to: email,
        subject,
        html: body,
        type: 'otp',
      });
    }

    // للتجربة - محاكاة الإرسال
    logger.info(`📧 [DEV] OTP for ${email}: ${otp}`);
    return { success: true, method: 'email', messageId: `dev_${Date.now()}` };
  }

  /**
   * Send OTP via SMS
   */
  async sendOTPViaSMS(phone, otp, purpose) {
    const message = this.getSMSMessage(otp, purpose);

    // استخدام خدمة SMS
    try {
      if (smsService && smsService.send) {
        return await smsService.send({
          to: phone,
          message,
          type: 'otp',
          metadata: { purpose },
        });
      }
    } catch (error) {
      logger.error('SMS Error:', error);
    }

    // للتجربة - محاكاة الإرسال
    logger.info(`📱 [DEV] OTP for ${phone}: ${otp}`);
    return { success: true, method: 'sms', messageId: `dev_${Date.now()}` };
  }

  /**
   * Send OTP via WhatsApp
   */
  async sendOTPViaWhatsApp(phone, otp, purpose) {
    const expiryMinutes = Math.floor(this.config.otp.expirySeconds / 60);

    try {
      // استخدام قالب الواتساب
      if (whatsappService && whatsappService.sendTemplate) {
        const template = {
          name: 'otp_verification',
          language: { code: 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: otp },
                { type: 'text', text: String(expiryMinutes) },
              ],
            },
          ],
        };

        return await whatsappService.sendTemplate(phone, template.name, template.components);
      }

      // إرسال كرسالة نصية عادية
      if (whatsappService && whatsappService.sendText) {
        const message = `🔐 رمز التحقق الخاص بك هو: ${otp}\n⏰ صالح لمدة ${expiryMinutes} دقيقة\n\n@الأهداف`;
        return await whatsappService.sendText(phone, message);
      }
    } catch (error) {
      logger.error('WhatsApp Error:', error);
    }

    // للتجربة - محاكاة الإرسال
    logger.info(`💬 [DEV] WhatsApp OTP for ${phone}: ${otp}`);
    return { success: true, method: 'whatsapp', messageId: `dev_${Date.now()}` };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(options) {
    const {
      identifier,
      otp,
      purpose = 'login',
      consume = true, // حذف OTP بعد التحقق
    } = options;

    // البحث عن OTP
    let otpRecord;

    if (this.OTPModel) {
      otpRecord = await this.OTPModel.findOne({
        identifier,
        purpose,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      });
    } else {
      const key = `${identifier}:${purpose}`;
      otpRecord = this.otpStore.get(key);
    }

    // التحقق من وجود OTP
    if (!otpRecord) {
      return {
        success: false,
        error: 'رمز التحقق غير موجود أو منتهي الصلاحية',
        code: 'OTP_NOT_FOUND',
      };
    }

    // التحقق من انتهاء الصلاحية
    if (new Date() > otpRecord.expiresAt) {
      if (this.OTPModel) {
        await this.OTPModel.updateOne({ otpId: otpRecord.otpId }, { status: 'expired' });
      }
      return {
        success: false,
        error: 'انتهت صلاحية رمز التحقق',
        code: 'OTP_EXPIRED',
      };
    }

    // التحقق من عدد المحاولات
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      if (this.OTPModel) {
        await this.OTPModel.updateOne({ otpId: otpRecord.otpId }, { status: 'expired' });
      }
      return {
        success: false,
        error: 'تم تجاوز الحد الأقصى من المحاولات',
        code: 'OTP_MAX_ATTEMPTS',
      };
    }

    // التحقق من صحة OTP — timing-safe comparison to prevent timing attacks
    const storedBuf = Buffer.from(String(otpRecord.otp), 'utf8');
    const providedBuf = Buffer.from(String(otp), 'utf8');
    const otpMatch =
      storedBuf.length === providedBuf.length && crypto.timingSafeEqual(storedBuf, providedBuf);
    if (!otpMatch) {
      // زيادة عدد المحاولات
      otpRecord.attempts++;
      otpRecord.updatedAt = new Date();

      if (this.OTPModel) {
        await this.OTPModel.updateOne(
          { otpId: otpRecord.otpId },
          { attempts: otpRecord.attempts, updatedAt: otpRecord.updatedAt }
        );
      } else {
        const key = `${identifier}:${purpose}`;
        this.otpStore.set(key, otpRecord);
      }

      return {
        success: false,
        error: 'رمز التحقق غير صحيح',
        code: 'OTP_INVALID',
        attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts,
      };
    }

    // OTP صحيح
    if (consume) {
      if (this.OTPModel) {
        await this.OTPModel.updateOne(
          { otpId: otpRecord.otpId },
          { status: 'verified', verifiedAt: new Date(), updatedAt: new Date() }
        );
      } else {
        const key = `${identifier}:${purpose}`;
        this.otpStore.delete(key);
      }
    }

    return {
      success: true,
      otpId: otpRecord.otpId,
      identifier: otpRecord.identifier,
      identifierType: otpRecord.identifierType,
      purpose: otpRecord.purpose,
      metadata: otpRecord.metadata,
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(identifier, purpose = 'login', method = 'auto') {
    // التحقق من Rate Limit
    const rateCheck = this.checkRateLimit(identifier, purpose);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.message);
    }

    return this.sendOTP({ identifier, method, purpose });
  }

  /**
   * Get OTP Status
   */
  async getOTPStatus(otpId) {
    if (this.OTPModel) {
      return this.OTPModel.findOne({ otpId });
    }
    return null;
  }

  /**
   * Cleanup expired OTPs
   */
  async cleanupExpired() {
    if (this.OTPModel) {
      const result = await this.OTPModel.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      return result.deletedCount;
    }
    return 0;
  }

  /**
   * Helper: Get email subject
   */
  getEmailSubject(purpose) {
    const subjects = {
      login: 'رمز التحقق لتسجيل الدخول - الأهداف',
      register: 'رمز التحقق للتسجيل - الأهداف',
      resetPassword: 'رمز إعادة تعيين كلمة المرور - الأهداف',
      verifyEmail: 'تأكيد البريد الإلكتروني - الأهداف',
      verifyPhone: 'تأكيد رقم الجوال - الأهداف',
      twoFactor: 'رمز التحقق الثنائي - الأهداف',
      changePassword: 'تأكيد تغيير كلمة المرور - الأهداف',
      deleteAccount: 'تأكيد حذف الحساب - الأهداف',
    };
    return subjects[purpose] || 'رمز التحقق - الأهداف';
  }

  /**
   * Helper: Get email body
   */
  getEmailBody(otp, purpose) {
    const expiryMinutes = Math.floor(this.config.otp.expirySeconds / 60);

    const purposeTexts = {
      login: 'تسجيل الدخول',
      register: 'التسجيل',
      resetPassword: 'إعادة تعيين كلمة المرور',
      verifyEmail: 'تأكيد البريد الإلكتروني',
      verifyPhone: 'تأكيد رقم الجوال',
      twoFactor: 'التحقق الثنائي',
      changePassword: 'تغيير كلمة المرور',
      deleteAccount: 'حذف الحساب',
    };

    const purposeText = purposeTexts[purpose] || 'التحقق';

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
          .otp-code { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 10px; text-align: center; letter-spacing: 8px; margin: 30px 0; }
          .info { color: #666; text-align: center; margin-top: 20px; }
          .warning { color: #e74c3c; font-size: 14px; text-align: center; margin-top: 20px; padding: 15px; background: #fdf2f2; border-radius: 8px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏢 الأهداف</div>
          </div>
          <h2 style="text-align: center; color: #333;">رمز التحقق لـ ${purposeText}</h2>
          <p style="text-align: center; color: #666;">استخدم الرمز التالي لإكمال عملية ${purposeText}:</p>
          <div class="otp-code">${otp}</div>
          <div class="info">
            <p>⏰ هذا الرمز صالح لمدة <strong>${expiryMinutes} دقائق</strong> فقط</p>
          </div>
          <div class="warning">
            ⚠️ لا تشارك هذا الرمز مع أي شخص لأغراض أمنية
          </div>
          <div class="footer">
            <p>هذه الرسالة مرسلة تلقائياً من نظام الأهداف</p>
            <p>© ${new Date().getFullYear()} الأهداف - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Helper: Get SMS message
   */
  getSMSMessage(otp, purpose) {
    const expiryMinutes = Math.floor(this.config.otp.expirySeconds / 60);
    return `رمز التحقق: ${otp}\nصالح لمدة ${expiryMinutes} دقيقة\n@الأهداف`;
  }

  /**
   * Helper: Get success message
   */
  getSuccessMessage(method, identifier) {
    const methodNames = {
      email: 'البريد الإلكتروني',
      sms: 'الرسائل النصية',
      whatsapp: 'الواتساب',
    };

    const maskedIdentifier =
      method === 'email'
        ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : identifier.replace(/(.{4})(.*)/, '$1****');

    return `تم إرسال رمز التحقق إلى ${methodNames[method]} (${maskedIdentifier})`;
  }
}

// Singleton instance
const otpService = new OTPService();

/**
 * Helper Functions
 */
const sendLoginOTP = async (identifier, method = 'auto') => {
  return otpService.sendOTP({ identifier, method, purpose: 'login' });
};

const verifyLoginOTP = async (identifier, otp) => {
  return otpService.verifyOTP({ identifier, otp, purpose: 'login' });
};

const sendRegisterOTP = async (identifier, method = 'auto') => {
  return otpService.sendOTP({ identifier, method, purpose: 'register' });
};

const verifyRegisterOTP = async (identifier, otp) => {
  return otpService.verifyOTP({ identifier, otp, purpose: 'register' });
};

const sendPasswordResetOTP = async (identifier, method = 'auto') => {
  return otpService.sendOTP({ identifier, method, purpose: 'resetPassword' });
};

const verifyPasswordResetOTP = async (identifier, otp) => {
  return otpService.verifyOTP({ identifier, otp, purpose: 'resetPassword' });
};

module.exports = {
  OTPService,
  otpService,
  otpConfig,
  sendLoginOTP,
  verifyLoginOTP,
  sendRegisterOTP,
  verifyRegisterOTP,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
};
