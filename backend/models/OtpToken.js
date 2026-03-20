/* eslint-disable no-unused-vars */
/**
 * نموذج رمز التحقق (OTP) - قاعدة البيانات
 * OTP Token Model - Database
 * الإصدار 1.0.0
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * مخطط رمز التحقق
 */
const otpTokenSchema = new Schema(
  {
    // المعرف (البريد أو الجوال)
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // نوع المعرف
    identifierType: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },

    // رمز التحقق
    otp: {
      type: String,
      required: true,
      length: 6,
    },

    // طريقة الإرسال
    method: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      required: true,
    },

    // الغرض
    purpose: {
      type: String,
      enum: ['login', 'register', 'resetPassword', 'verifyEmail', 'verifyPhone', 'twoFactor'],
      default: 'login',
    },

    // حالة الرمز
    status: {
      type: String,
      enum: ['pending', 'used', 'expired', 'blocked'],
      default: 'pending',
    },

    // عدد المحاولات
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },

    // معرف الجلسة
    sessionId: {
      type: String,
      default: () => `otp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    },

    // تاريخ انتهاء الصلاحية
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 دقائق
    },

    // تاريخ الاستخدام
    usedAt: {
      type: Date,
    },

    // IP المستخدم
    ipAddress: {
      type: String,
    },

    // User Agent
    userAgent: {
      type: String,
    },

    // معلومات إضافية
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
    collection: 'otptokens',
  }
);

// فهارس
otpTokenSchema.index({ identifier: 1, purpose: 1, status: 1 });
otpTokenSchema.index({ sessionId: 1 }, { unique: true });
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

/**
 * طرق النموذج الثابتة
 */

// إنشاء رمز جديد
otpTokenSchema.statics.createOTP = async function (data) {
  // إلغاء الرموز السابقة النشطة
  await this.updateMany(
    {
      identifier: data.identifier,
      purpose: data.purpose || 'login',
      status: 'pending',
    },
    { status: 'expired' }
  );

  // تحديد نوع المعرف
  const identifierType = data.identifier.includes('@') ? 'email' : 'phone';

  // إنشاء الرمز
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpToken = new this({
    identifier: data.identifier,
    identifierType,
    otp,
    method: data.method || (identifierType === 'email' ? 'email' : 'sms'),
    purpose: data.purpose || 'login',
    expiresAt: new Date(Date.now() + (data.expirySeconds || 300) * 1000),
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    metadata: data.metadata,
  });

  await otpToken.save();
  return otpToken;
};

// التحقق من الرمز
otpTokenSchema.statics.verifyOTP = async function (identifier, otp, purpose = 'login') {
  const otpToken = await this.findOne({
    identifier: identifier.toLowerCase(),
    purpose,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpToken) {
    return { success: false, message: 'رمز التحقق غير موجود أو منتهي الصلاحية' };
  }

  // التحقق من عدد المحاولات
  if (otpToken.attempts >= 3) {
    otpToken.status = 'blocked';
    await otpToken.save();
    return { success: false, message: 'تم تجاوز عدد المحاولات المسموحة' };
  }

  // التحقق من الرمز
  if (otpToken.otp !== otp) {
    otpToken.attempts += 1;
    await otpToken.save();
    return {
      success: false,
      message: `رمز التحقق غير صحيح. المحاولات المتبقية: ${3 - otpToken.attempts}`,
    };
  }

  // تحديث الحالة
  otpToken.status = 'used';
  otpToken.usedAt = new Date();
  await otpToken.save();

  return {
    success: true,
    message: 'تم التحقق بنجاح',
    data: {
      sessionId: otpToken.sessionId,
      method: otpToken.method,
      identifierType: otpToken.identifierType,
    },
  };
};

// الحصول على رمز نشط
otpTokenSchema.statics.getActiveOTP = async function (identifier, purpose = 'login') {
  return this.findOne({
    identifier: identifier.toLowerCase(),
    purpose,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

// عدد الرموز المرسلة اليوم
otpTokenSchema.statics.getTodayCount = async function (identifier) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.countDocuments({
    identifier: identifier.toLowerCase(),
    createdAt: { $gte: today },
  });
};

/**
 * طرق المثيل
 */

// التحقق من الصلاحية
otpTokenSchema.methods.isValid = function () {
  return this.status === 'pending' && this.expiresAt > new Date();
};

// الوقت المتبقي
otpTokenSchema.methods.getRemainingTime = function () {
  if (!this.isValid()) return 0;
  return Math.max(0, Math.floor((this.expiresAt - new Date()) / 1000));
};

// إلغاء الرمز
otpTokenSchema.methods.revoke = async function () {
  this.status = 'expired';
  await this.save();
};

// تصدير النموذج
const OtpToken = mongoose.models.OtpToken || mongoose.model('OtpToken', otpTokenSchema);

module.exports = OtpToken;
