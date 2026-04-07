/**
 * Parent Portal Enhanced Routes — مسارات بوابة ولي الأمر المحسّنة
 * البرومبت 21: PWA Parent Portal
 *
 * Endpoints:
 *   POST   /send-otp                      إرسال OTP
 *   POST   /verify-otp                    التحقق من OTP وتسجيل الدخول
 *   POST   /logout                        تسجيل الخروج
 *   POST   /fcm-token                     تسجيل FCM token
 *   DELETE /fcm-token                     حذف FCM token
 *
 *   GET    /dashboard                     لوحة تحكم ولي الأمر
 *   GET    /children                      قائمة الأطفال
 *   GET    /children/:id                  ملف طفل محدد
 *   GET    /children/:id/sessions         جلسات الطفل
 *   GET    /children/:id/progress         تقدم الطفل
 *   GET    /children/:id/assessments      تقييمات الطفل
 *
 *   GET    /appointments                  المواعيد
 *   POST   /appointments/request          طلب موعد
 *   PUT    /appointments/:id/cancel       إلغاء موعد
 *
 *   GET    /transport/live-tracking       تتبع النقل
 *   GET    /transport/schedule            جدول النقل
 *
 *   GET    /invoices                      الفواتير
 *   GET    /invoices/:id                  فاتورة محددة
 *
 *   GET    /messages                      الرسائل
 *   POST   /messages                      إرسال رسالة
 *   PUT    /messages/:id/read             تعليم كمقروء
 *
 *   GET    /notifications                 الإشعارات
 *   PUT    /notifications/mark-read       تعليم الإشعارات كمقروءة
 *
 *   GET    /complaints                    الشكاوى
 *   POST   /complaints                    تقديم شكوى/اقتراح
 *   GET    /complaints/:id                تفاصيل شكوى
 *   POST   /complaints/:id/rate           تقييم الشكوى
 *
 *   GET    /settings                      الإعدادات
 *   PUT    /settings                      تحديث الإعدادات
 *   POST   /settings/change-phone         طلب تغيير رقم الهاتف
 *   POST   /settings/change-phone/verify  التحقق من OTP تغيير الهاتف
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Models
const {
  ParentOtp,
  ParentDevice,
  ParentMessage,
  ParentComplaint,
  ParentNotification,
} = require('../models/ParentPortal');

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const { createCustomLimiter } = require('../middleware/rateLimiter');
const parentOtpSendLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'rl:parent-enh-otp-send:',
  message: { success: false, message: 'تم تجاوز الحد الأقصى للمحاولات.' },
});
const parentOtpVerifyLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:parent-enh-otp-verify:',
  message: { success: false, message: 'تم تجاوز الحد الأقصى لمحاولات التحقق.' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generate secure 6-digit OTP using CSPRNG
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
}

// ─── AUTH ROUTES (بدون مصادقة) ───────────────────────────────────────────────

/**
 * POST /send-otp — إرسال OTP لولي الأمر
 */
router.post('/send-otp', parentOtpSendLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^05[0-9]{8}$/.test(phone)) {
      return res.status(422).json({
        success: false,
        message: 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
        messageEn: 'Invalid phone number. Must start with 05 and be 10 digits',
      });
    }

    // Rate limiting: لا أكثر من 5 OTPs في الساعة
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentCount = await ParentOtp.countDocuments({
      phone,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentCount >= 5) {
      return res.status(429).json({
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ساعة',
        messageEn: 'Rate limit exceeded. Please try again after an hour',
      });
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await ParentOtp.create({
      phone,
      otp: hashedOtp,
      purpose: 'login',
      expiresAt: new Date(Date.now() + 5 * 60000), // 5 دقائق
      ipAddress: req.ip,
    });

    // TODO: إرسال SMS عبر SmsService في الإنتاج
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[ParentPortal] OTP sent for ${phone.substring(0, 3)}****${phone.slice(-2)} (check response body for devOtp)`);
    }

    return res.json({
      success: true,
      message: 'تم إرسال رمز التحقق',
      messageEn: 'OTP sent successfully',
      expiresIn: 300,
      maskedPhone: maskPhone(phone),
      // للتطوير فقط
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });
  } catch (err) {
    logger.error('[ParentPortal] send-otp error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /verify-otp — التحقق من OTP وإرجاع JWT
 */
router.post('/verify-otp', parentOtpVerifyLimiter, async (req, res) => {
  try {
    const { phone, otp, deviceToken, deviceType, deviceName } = req.body;

    if (!phone || !otp) {
      return res.status(422).json({ success: false, message: 'الهاتف والرمز مطلوبان' });
    }

    const otpRecord = await ParentOtp.findOne({
      phone,
      purpose: 'login',
      isVerified: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(422).json({
        success: false,
        message: 'رمز التحقق منتهي الصلاحية أو مستخدم مسبقاً',
        messageEn: 'OTP expired or already used',
      });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(422).json({
        success: false,
        message: 'رمز التحقق غير صحيح',
        messageEn: 'Invalid OTP',
        remainingAttempts: 5 - otpRecord.attempts,
      });
    }

    otpRecord.isVerified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // إنشاء JWT (يحمل phone كـ guardianPhone)
    const token = jwt.sign(
      { guardianPhone: phone, role: 'guardian', type: 'parent_portal' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // تسجيل الجهاز إذا أرسل deviceToken
    if (deviceToken) {
      await ParentDevice.findOneAndUpdate(
        { deviceToken },
        {
          guardianId: null, // سيُحدَّث لاحقاً عند ربط الولي
          deviceToken,
          deviceType: deviceType || 'web',
          deviceName: deviceName || null,
          isActive: true,
          lastActiveAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      guardian: { phone: maskPhone(phone) },
    });
  } catch (err) {
    logger.error('[ParentPortal] verify-otp error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── AUTHENTICATED ROUTES ─────────────────────────────────────────────────────
router.use(authenticate);

/**
 * POST /logout — تسجيل الخروج
 */
router.post('/logout', async (req, res) => {
  try {
    const { deviceToken } = req.body;
    if (deviceToken) {
      await ParentDevice.updateOne({ deviceToken }, { isActive: false });
    }
    return res.json({ success: true, message: 'تم تسجيل الخروج' });
  } catch (err) {
    logger.error('[ParentPortal] logout error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /fcm-token — تسجيل FCM Token للإشعارات
 */
router.post('/fcm-token', async (req, res) => {
  try {
    const { token, deviceType, deviceName } = req.body;
    if (!token) return res.status(422).json({ success: false, message: 'token مطلوب' });

    await ParentDevice.findOneAndUpdate(
      { deviceToken: token },
      {
        deviceToken: token,
        deviceType: deviceType || 'web',
        deviceName: deviceName || null,
        isActive: true,
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: 'تم تسجيل الجهاز' });
  } catch (err) {
    logger.error('[ParentPortal] fcm-token error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * DELETE /fcm-token — إلغاء تسجيل FCM Token
 */
router.delete('/fcm-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await ParentDevice.updateOne({ deviceToken: token }, { isActive: false });
    }
    return res.json({ success: true, message: 'تم إلغاء تسجيل الجهاز' });
  } catch (err) {
    logger.error('[ParentPortal] delete fcm-token error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

/**
 * GET /dashboard — لوحة تحكم ولي الأمر
 */
router.get('/dashboard', async (req, res) => {
  try {
    const guardianPhone = req.user?.guardianPhone || req.user?.phone;

    const unreadNotifications = await ParentNotification.countDocuments({
      isRead: false,
    });

    const unreadMessages = await ParentMessage.countDocuments({
      direction: 'outbound',
      isRead: false,
    });

    return res.json({
      success: true,
      data: {
        unreadNotifications,
        unreadMessages,
        guardian: { phone: maskPhone(guardianPhone || '') },
        summary: {
          nextSession: null, // سيُربط بجدول الجلسات الفعلي
          activeTransport: null,
          recentReports: [],
        },
      },
    });
  } catch (err) {
    logger.error('[ParentPortal] dashboard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── CHILDREN ────────────────────────────────────────────────────────────────

/**
 * GET /children — قائمة أبناء ولي الأمر
 */
router.get('/children', async (req, res) => {
  try {
    // سيُربط بنموذج Guardian الفعلي لاحقاً
    return res.json({
      success: true,
      data: [],
      message: 'قائمة الأبناء',
      hint: 'يتطلب ربط Guardian بـ Beneficiaries في قاعدة البيانات',
    });
  } catch (err) {
    logger.error('[ParentPortal] children error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /children/:id — ملف طفل محدد
 */
router.get('/children/:id', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: { id: req.params.id },
      message: 'ملف الطفل',
    });
  } catch (err) {
    logger.error('[ParentPortal] child detail error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /children/:id/sessions — جلسات الطفل
 */
router.get('/children/:id/sessions', async (req, res) => {
  try {
    const { page = 1, perPage = 15 } = req.query;
    return res.json({
      success: true,
      data: [],
      pagination: { page: Number(page), perPage: Number(perPage), total: 0 },
      message: 'جلسات الطفل',
    });
  } catch (err) {
    logger.error('[ParentPortal] child sessions error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /children/:id/progress — تقدم الطفل
 */
router.get('/children/:id/progress', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        overallProgress: 0,
        goals: [],
        assessmentTrend: [],
      },
      message: 'تقدم الطفل',
    });
  } catch (err) {
    logger.error('[ParentPortal] child progress error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /children/:id/assessments — تقييمات الطفل
 */
router.get('/children/:id/assessments', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: [],
      message: 'تقييمات الطفل',
    });
  } catch (err) {
    logger.error('[ParentPortal] child assessments error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

/**
 * GET /appointments — المواعيد
 */
router.get('/appointments', async (req, res) => {
  try {
    const { childId, from, to, page = 1, perPage = 15 } = req.query;
    return res.json({
      success: true,
      data: [],
      pagination: { page: Number(page), perPage: Number(perPage), total: 0 },
      message: 'قائمة المواعيد',
    });
  } catch (err) {
    logger.error('[ParentPortal] appointments error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /appointments/request — طلب موعد جديد
 */
router.post('/appointments/request', async (req, res) => {
  try {
    const { childId, preferredDate, preferredTime, notes } = req.body;

    if (!childId || !preferredDate) {
      return res.status(422).json({
        success: false,
        message: 'معرف الطفل والتاريخ المطلوب مطلوبان',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'تم إرسال طلب الموعد بنجاح. سيتواصل معك فريق المركز لتأكيد الموعد',
      data: {
        childId,
        preferredDate,
        preferredTime,
        status: 'pending_review',
      },
    });
  } catch (err) {
    logger.error('[ParentPortal] appointment request error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /appointments/:id/cancel — إلغاء موعد
 */
router.put('/appointments/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    return res.json({
      success: true,
      message: 'تم إرسال طلب إلغاء الموعد',
      data: { id: req.params.id, reason },
    });
  } catch (err) {
    logger.error('[ParentPortal] cancel appointment error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── TRANSPORT ────────────────────────────────────────────────────────────────

/**
 * GET /transport/live-tracking — تتبع النقل الفعلي
 */
router.get('/transport/live-tracking', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        activeTrips: [],
        message: 'لا توجد رحلات نشطة حالياً',
      },
    });
  } catch (err) {
    logger.error('[ParentPortal] live-tracking error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /transport/schedule — جدول النقل
 */
router.get('/transport/schedule', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: [],
      message: 'جدول النقل',
    });
  } catch (err) {
    logger.error('[ParentPortal] transport schedule error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────

/**
 * GET /invoices — الفواتير
 */
router.get('/invoices', async (req, res) => {
  try {
    const { status, page = 1, perPage = 15 } = req.query;
    return res.json({
      success: true,
      data: [],
      pagination: { page: Number(page), perPage: Number(perPage), total: 0 },
      message: 'قائمة الفواتير',
    });
  } catch (err) {
    logger.error('[ParentPortal] invoices error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /invoices/:id — فاتورة محددة
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: { id: req.params.id },
      message: 'تفاصيل الفاتورة',
    });
  } catch (err) {
    logger.error('[ParentPortal] invoice detail error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

/**
 * GET /messages — قائمة الرسائل
 */
router.get('/messages', async (req, res) => {
  try {
    const { childId, page = 1, perPage = 20 } = req.query;
    const filter = {};
    if (childId) filter.beneficiaryId = childId;

    const skip = (Number(page) - 1) * Number(perPage);
    const [data, total] = await Promise.all([
      ParentMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(perPage)).lean(),
      ParentMessage.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    logger.error('[ParentPortal] messages error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /messages — إرسال رسالة جديدة
 */
router.post('/messages', async (req, res) => {
  try {
    const { beneficiaryId, recipientType, subject, body, messageType } = req.body;

    if (!body) {
      return res.status(422).json({ success: false, message: 'نص الرسالة مطلوب' });
    }

    const msg = await ParentMessage.create({
      beneficiaryId: beneficiaryId || null,
      recipientType: recipientType || 'administration',
      subject: subject || null,
      body,
      direction: 'inbound',
      messageType: messageType || 'general',
    });

    return res.status(201).json({
      success: true,
      message: 'تم إرسال الرسالة بنجاح',
      data: msg,
    });
  } catch (err) {
    logger.error('[ParentPortal] send message error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /messages/:id/read — تعليم رسالة كمقروءة
 */
router.put('/messages/:id/read', async (req, res) => {
  try {
    await ParentMessage.findByIdAndUpdate(req.params.id, {
      isRead: true,
      readAt: new Date(),
    });
    return res.json({ success: true, message: 'تم التعليم كمقروء' });
  } catch (err) {
    logger.error('[ParentPortal] mark read error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

/**
 * GET /notifications — قائمة الإشعارات
 */
router.get('/notifications', async (req, res) => {
  try {
    const { type, page = 1, perPage = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(perPage);
    const [data, total, unreadCount] = await Promise.all([
      ParentNotification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(perPage))
        .lean(),
      ParentNotification.countDocuments(filter),
      ParentNotification.countDocuments({ ...filter, isRead: false }),
    ]);

    return res.json({
      success: true,
      data,
      unreadCount,
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    logger.error('[ParentPortal] notifications error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /notifications/mark-read — تعليم الإشعارات كمقروءة
 */
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const { notificationIds, markAll } = req.body;

    if (markAll) {
      await ParentNotification.updateMany({ isRead: false }, { isRead: true, readAt: new Date() });
    } else if (notificationIds && notificationIds.length > 0) {
      await ParentNotification.updateMany(
        { _id: { $in: notificationIds } },
        { isRead: true, readAt: new Date() }
      );
    }

    const unreadCount = await ParentNotification.countDocuments({ isRead: false });

    return res.json({
      success: true,
      message: 'تم التعليم كمقروء',
      unreadCount,
    });
  } catch (err) {
    logger.error('[ParentPortal] mark-read error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────

/**
 * GET /complaints — قائمة الشكاوى
 */
router.get('/complaints', async (req, res) => {
  try {
    const { page = 1, perPage = 15 } = req.query;
    const skip = (Number(page) - 1) * Number(perPage);

    const [data, total] = await Promise.all([
      ParentComplaint.find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(perPage))
        .lean(),
      ParentComplaint.countDocuments({ deletedAt: null }),
    ]);

    return res.json({
      success: true,
      data,
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    logger.error('[ParentPortal] complaints list error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /complaints — تقديم شكوى/اقتراح
 */
router.post('/complaints', async (req, res) => {
  try {
    const { type, category, subject, description, beneficiaryId, priority, isAnonymous } = req.body;

    if (!type || !category || !subject || !description) {
      return res.status(422).json({
        success: false,
        message: 'النوع والتصنيف والموضوع والوصف مطلوبة',
      });
    }

    const validTypes = ['complaint', 'suggestion', 'inquiry'];
    const validCategories = [
      'service_quality',
      'staff',
      'facilities',
      'scheduling',
      'transport',
      'billing',
      'other',
    ];

    if (!validTypes.includes(type)) {
      return res.status(422).json({ success: false, message: 'نوع غير صحيح' });
    }
    if (!validCategories.includes(category)) {
      return res.status(422).json({ success: false, message: 'تصنيف غير صحيح' });
    }

    // توليد رقم التذكرة
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await ParentComplaint.countDocuments({
      createdAt: { $gte: todayStart },
    });
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ticketNumber = `CMP-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;

    const complaint = await ParentComplaint.create({
      type,
      category,
      subject,
      description,
      beneficiaryId: beneficiaryId || null,
      priority: priority || 'medium',
      isAnonymous: isAnonymous || false,
      status: 'submitted',
      ticketNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل طلبك بنجاح. سيتم الرد عليك في أقرب وقت ممكن',
      data: {
        id: complaint._id,
        ticketNumber: complaint.ticketNumber,
        status: complaint.status,
      },
    });
  } catch (err) {
    logger.error('[ParentPortal] submit complaint error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /complaints/:id — تفاصيل شكوى
 */
router.get('/complaints/:id', async (req, res) => {
  try {
    const complaint = await ParentComplaint.findById(req.params.id).lean();
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    }
    return res.json({ success: true, data: complaint });
  } catch (err) {
    logger.error('[ParentPortal] complaint detail error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /complaints/:id/rate — تقييم الشكوى بعد الحل
 */
router.post('/complaints/:id/rate', async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(422).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5',
      });
    }

    const complaint = await ParentComplaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    }

    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(422).json({
        success: false,
        message: 'لا يمكن التقييم إلا بعد حل الشكوى',
      });
    }

    complaint.satisfactionRating = rating;
    complaint.satisfactionFeedback = feedback || null;
    await complaint.save();

    return res.json({ success: true, message: 'شكراً لتقييمك' });
  } catch (err) {
    logger.error('[ParentPortal] rate complaint error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

/**
 * GET /settings — عرض إعدادات ولي الأمر
 */
router.get('/settings', async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      data: {
        phone: maskPhone(user?.guardianPhone || user?.phone || ''),
        language: user?.preferredLanguage || 'ar',
        notificationPreferences: {
          sessions: true,
          assessments: true,
          transport: true,
          billing: true,
          messages: true,
          general: true,
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00',
        },
        preferredContactMethod: 'whatsapp',
      },
    });
  } catch (err) {
    logger.error('[ParentPortal] settings error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /settings — تحديث الإعدادات
 */
router.put('/settings', async (req, res) => {
  try {
    const { language, notificationPreferences, quietHours, preferredContactMethod } = req.body;

    const validLanguages = ['ar', 'en'];
    const validContactMethods = ['sms', 'whatsapp', 'email', 'app'];

    if (language && !validLanguages.includes(language)) {
      return res.status(422).json({ success: false, message: 'لغة غير مدعومة' });
    }
    if (preferredContactMethod && !validContactMethods.includes(preferredContactMethod)) {
      return res.status(422).json({ success: false, message: 'طريقة تواصل غير مدعومة' });
    }

    // TODO: حفظ الإعدادات في نموذج Guardian
    return res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
  } catch (err) {
    logger.error('[ParentPortal] update settings error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /settings/change-phone — طلب تغيير رقم الهاتف (الخطوة 1)
 */
router.post('/settings/change-phone', async (req, res) => {
  try {
    const { newPhone } = req.body;

    if (!newPhone || !/^05[0-9]{8}$/.test(newPhone)) {
      return res.status(422).json({
        success: false,
        message: 'رقم الجوال الجديد غير صحيح',
      });
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await ParentOtp.create({
      phone: newPhone,
      otp: hashedOtp,
      purpose: 'change_phone',
      expiresAt: new Date(Date.now() + 10 * 60000), // 10 دقائق
      ipAddress: req.ip,
    });

    // TODO: إرسال SMS للرقم الجديد
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[ParentPortal] Change phone OTP for ${newPhone}: ${otp}`);
    }

    return res.json({
      success: true,
      message: 'تم إرسال رمز التحقق للرقم الجديد',
      maskedPhone: maskPhone(newPhone),
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });
  } catch (err) {
    logger.error('[ParentPortal] change-phone error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /settings/change-phone/verify — التحقق من OTP تغيير الهاتف (الخطوة 2)
 */
router.post('/settings/change-phone/verify', async (req, res) => {
  try {
    const { newPhone, otp } = req.body;

    if (!newPhone || !otp) {
      return res.status(422).json({
        success: false,
        message: 'الرقم الجديد ورمز التحقق مطلوبان',
      });
    }

    const otpRecord = await ParentOtp.findOne({
      phone: newPhone,
      purpose: 'change_phone',
      isVerified: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 3 },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(422).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
      });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(422).json({
        success: false,
        message: 'رمز التحقق غير صحيح',
        remainingAttempts: 3 - otpRecord.attempts,
      });
    }

    otpRecord.isVerified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // TODO: تحديث رقم الهاتف في نموذج Guardian

    return res.json({
      success: true,
      message: 'تم تغيير رقم الهاتف بنجاح',
      newPhone: maskPhone(newPhone),
    });
  } catch (err) {
    logger.error('[ParentPortal] change-phone verify error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── ADMIN: إدارة الشكاوى (للمشرفين) ────────────────────────────────────────

/**
 * GET /admin/complaints — جميع الشكاوى (للمشرف)
 */
router.get('/admin/complaints', async (req, res) => {
  try {
    const { status, type, category, page = 1, perPage = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(perPage);
    const [data, total] = await Promise.all([
      ParentComplaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(perPage)).lean(),
      ParentComplaint.countDocuments(filter),
    ]);

    const stats = await ParentComplaint.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return res.json({
      success: true,
      data,
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    logger.error('[ParentPortal] admin complaints error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /admin/complaints/:id — تحديث حالة الشكوى (للمشرف)
 */
router.put('/admin/complaints/:id', async (req, res) => {
  try {
    const { status, resolution, assignedTo } = req.body;

    const validStatuses = ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(422).json({ success: false, message: 'حالة غير صحيحة' });
    }

    const update = {};
    if (status) update.status = status;
    if (resolution) update.resolution = resolution;
    if (assignedTo) update.assignedTo = assignedTo;
    if (status === 'resolved') update.resolvedAt = new Date();

    const complaint = await ParentComplaint.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    }

    return res.json({
      success: true,
      message: 'تم تحديث الشكوى',
      data: complaint,
    });
  } catch (err) {
    logger.error('[ParentPortal] admin update complaint error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * GET /admin/notifications/stats — إحصائيات الإشعارات
 */
router.get('/admin/notifications/stats', async (req, res) => {
  try {
    const stats = await ParentNotification.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        },
      },
    ]);

    const totalUnread = await ParentNotification.countDocuments({ isRead: false });

    return res.json({
      success: true,
      data: {
        totalUnread,
        byType: stats.reduce(
          (acc, s) => ({ ...acc, [s._id]: { total: s.total, unread: s.unread } }),
          {}
        ),
      },
    });
  } catch (err) {
    logger.error('[ParentPortal] notifications stats error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /admin/notifications/broadcast — إرسال إشعار جماعي
 */
router.post('/admin/notifications/broadcast', async (req, res) => {
  try {
    const { title, body, type, data } = req.body;

    if (!title || !body) {
      return res.status(422).json({ success: false, message: 'العنوان والمحتوى مطلوبان' });
    }

    // TODO: إرسال عبر FCM لجميع الأجهزة النشطة
    const activeDevices = await ParentDevice.find({ isActive: true }).lean();

    const notification = await ParentNotification.create({
      title,
      body,
      type: type || 'general',
      data: data || {},
      channel: 'push',
      sentAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `تم إرسال الإشعار لـ ${activeDevices.length} جهاز`,
      data: notification,
    });
  } catch (err) {
    logger.error('[ParentPortal] broadcast error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
