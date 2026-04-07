/**
 * بوابة ولي الأمر — مسارات API الشاملة
 * Parent Portal — Full API Routes
 * AlAwael ERP — Disability Rehabilitation Center
 *
 * المسارات:
 *  POST  /api/parent-portal/auth/send-otp        — إرسال OTP
 *  POST  /api/parent-portal/auth/verify-otp       — التحقق والدخول
 *  POST  /api/parent-portal/auth/logout            — تسجيل الخروج
 *
 *  GET   /api/parent-portal/dashboard             — لوحة التحكم
 *  GET   /api/parent-portal/children              — قائمة الأبناء
 *  GET   /api/parent-portal/children/:id          — ملف ابن محدد
 *  GET   /api/parent-portal/children/:id/sessions — جلسات الابن
 *  GET   /api/parent-portal/children/:id/progress — تقدم الابن
 *
 *  GET   /api/parent-portal/appointments          — المواعيد
 *  POST  /api/parent-portal/appointments/request  — طلب موعد
 *  PUT   /api/parent-portal/appointments/:id/cancel — إلغاء موعد
 *
 *  GET   /api/parent-portal/transport/live        — تتبع النقل
 *
 *  GET   /api/parent-portal/invoices              — الفواتير
 *  GET   /api/parent-portal/invoices/:id          — فاتورة محددة
 *
 *  GET   /api/parent-portal/messages              — الرسائل
 *  POST  /api/parent-portal/messages              — إرسال رسالة
 *  PUT   /api/parent-portal/messages/:id/read     — تعليم كمقروء
 *
 *  GET   /api/parent-portal/notifications         — الإشعارات
 *  PUT   /api/parent-portal/notifications/mark-read — تعليم كمقروء
 *
 *  GET   /api/parent-portal/complaints            — الشكاوى
 *  POST  /api/parent-portal/complaints            — تقديم شكوى
 *  GET   /api/parent-portal/complaints/:id        — تفاصيل شكوى
 *  POST  /api/parent-portal/complaints/:id/rate   — تقييم الحل
 *
 *  GET   /api/parent-portal/settings              — إعدادات ولي الأمر
 *  PUT   /api/parent-portal/settings              — تحديث الإعدادات
 *
 *  POST  /api/parent-portal/devices               — تسجيل جهاز FCM
 *  DELETE /api/parent-portal/devices/:token       — إلغاء تسجيل جهاز
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/secrets');

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * تحقق من أن ولي الأمر المصادق عليه هو نفسه صاحب الطلب
 * أو أن المستخدم هو موظف مخوّل
 */
function isGuardianOrStaff(req, guardianId) {
  if (!req.user) return false;
  const roles = req.user.role || req.user.roles || [];
  const staffRoles = ['admin', 'manager', 'specialist', 'coordinator'];
  const isStaff = staffRoles.some(r => (Array.isArray(roles) ? roles.includes(r) : roles === r));
  if (isStaff) return true;
  return String(req.user._id || req.user.id) === String(guardianId);
}

// Generate secure 6-digit OTP using CSPRNG
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

// Rate limiters for parent portal OTP endpoints
const { createCustomLimiter } = require('../middleware/rateLimiter');
const parentOtpSendLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'rl:parent-otp-send:',
  message: { success: false, message: 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً.' },
});
const parentOtpVerifyLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:parent-otp-verify:',
  message: { success: false, message: 'تم تجاوز الحد الأقصى لمحاولات التحقق.' },
});

// ──────────────────────────────────────────────────────────────────────────────
// 1. المصادقة — بدون middleware
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/parent-portal/auth/send-otp
 * إرسال رمز التحقق لرقم الهاتف
 */
router.post('/auth/send-otp', parentOtpSendLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^05\d{8}$/.test(phone)) {
      return res.status(422).json({
        success: false,
        message: 'يرجى إدخال رقم جوال سعودي صحيح (05xxxxxxxxx)',
      });
    }

    const Guardian = require('../models/Guardian');
    const guardian = await Guardian.findOne({
      $or: [{ phone }, { phone2: phone }],
      isActive: { $ne: false },
    }).lean();

    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: 'رقم الهاتف غير مسجل في النظام. يرجى التواصل مع إدارة المركز.',
      });
    }

    const { ParentOTP } = require('../models/ParentPortal');

    // Rate limiting: لا أكثر من 5 طلبات في الساعة
    const recentCount = await ParentOTP.countDocuments({
      phone,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    if (recentCount >= 5) {
      return res.status(429).json({
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد ساعة.',
      });
    }

    const otp = generateOtp();
    await ParentOTP.createOtp(phone, otp, 'login', req.ip);

    // إرسال SMS في بيئة الإنتاج فقط
    if (process.env.NODE_ENV === 'production') {
      try {
        const SmsService = require('../services/smsService');
        await SmsService.send(phone, `رمز التحقق الخاص بك: ${otp}\nصالح لمدة 5 دقائق.`);
      } catch (smsErr) {
        logger.warn('SMS send failed:', smsErr.message);
      }
    } else {
      logger.info(
        `[DEV] OTP sent for ${phone.substring(0, 3)}****${phone.slice(-2)} (check response body for devOtp)`
      );
    }

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق',
      expiresIn: 300,
      // في التطوير فقط
      ...(process.env.NODE_ENV !== 'production' && { otp_dev: otp }),
    });
  } catch (err) {
    logger.error('send-otp error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /api/parent-portal/auth/verify-otp
 * التحقق من OTP وإنشاء token
 */
router.post('/auth/verify-otp', parentOtpVerifyLimiter, async (req, res) => {
  try {
    const { phone, otp, deviceToken, deviceType, deviceName } = req.body;

    if (!phone || !otp) {
      return res.status(422).json({ success: false, message: 'رقم الهاتف والرمز مطلوبان' });
    }

    const { ParentOTP, ParentDevice } = require('../models/ParentPortal');

    const otpRecord = await ParentOTP.findOne({
      phone,
      purpose: 'login',
      isVerified: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(422).json({
        success: false,
        message: 'رمز التحقق منتهي الصلاحية أو غير صحيح. يرجى طلب رمز جديد.',
      });
    }

    const valid = await otpRecord.verify(otp);
    if (!valid) {
      return res.status(422).json({
        success: false,
        message: 'رمز التحقق غير صحيح',
        remainingAttempts: 5 - otpRecord.attempts,
      });
    }

    const Guardian = require('../models/Guardian');
    const guardian = await Guardian.findOne({
      $or: [{ phone }, { phone2: phone }],
      isActive: { $ne: false },
    }).lean();

    if (!guardian) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على ولي الأمر' });
    }

    // إنشاء JWT للجلسة
    const token = jwt.sign(
      {
        id: guardian._id,
        guardianId: guardian._id,
        phone: guardian.phone,
        role: 'guardian',
        type: 'parent_portal',
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // تسجيل الجهاز للإشعارات
    if (deviceToken) {
      await ParentDevice.findOneAndUpdate(
        { deviceToken },
        {
          guardianId: guardian._id,
          deviceType: deviceType || 'web',
          deviceName: deviceName || null,
          isActive: true,
          lastActiveAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // إحصاء الأبناء
    const Beneficiary = require('../models/Beneficiary');
    const childrenCount = await Beneficiary.countDocuments({ guardianId: guardian._id });

    res.json({
      success: true,
      token,
      guardian: {
        id: guardian._id,
        nameAr: guardian.nameAr || guardian.name_ar || guardian.name,
        nameEn: guardian.nameEn || guardian.name_en,
        phone: guardian.phone,
        email: guardian.email,
        childrenCount,
      },
    });
  } catch (err) {
    logger.error('verify-otp error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /api/parent-portal/auth/logout
 */
router.post('/auth/logout', authenticate, async (req, res) => {
  try {
    const { deviceToken } = req.body;
    if (deviceToken) {
      const { ParentDevice } = require('../models/ParentPortal');
      await ParentDevice.updateOne({ deviceToken }, { isActive: false });
    }
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) {
    res.json({ success: true, message: 'تم تسجيل الخروج' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// جميع المسارات التالية تتطلب مصادقة
// ──────────────────────────────────────────────────────────────────────────────
router.use(authenticate);

// ──────────────────────────────────────────────────────────────────────────────
// 2. لوحة التحكم
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/dashboard
 * لوحة تحكم ولي الأمر الرئيسية
 */
router.get('/dashboard', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const Guardian = require('../models/Guardian');
    const Beneficiary = require('../models/Beneficiary');
    const { ParentMessage } = require('../models/ParentPortal');

    const guardian = await Guardian.findById(guardianId).lean();
    if (!guardian) return res.status(404).json({ success: false, message: 'ولي الأمر غير موجود' });

    // الأبناء
    const children = await Beneficiary.find({
      $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
      isActive: { $ne: false },
    })
      .select('nameAr nameEn photoUrl status disabilityType dateOfBirth branchId')
      .lean();

    // الرسائل غير المقروءة
    const unreadMessages = await ParentMessage.countDocuments({
      guardianId,
      direction: 'outbound',
      isRead: false,
    });

    // المواعيد القادمة
    let nextAppointment = null;
    try {
      const Schedule = require('../models/Schedule');
      nextAppointment = await Schedule.findOne({
        guardianId,
        date: { $gte: new Date() },
        status: { $nin: ['cancelled', 'completed'] },
      })
        .sort({ date: 1 })
        .lean();
    } catch (e) {
      logger.warn('Failed to fetch next appointment for dashboard', { error: e.message });
    }

    res.json({
      success: true,
      data: {
        guardian: {
          id: guardian._id,
          nameAr: guardian.nameAr || guardian.name_ar || guardian.name,
          phone: guardian.phone,
          email: guardian.email,
        },
        summary: {
          childrenCount: children.length,
          unreadMessages,
          nextAppointment: nextAppointment
            ? {
                date: nextAppointment.date,
                time: nextAppointment.time || nextAppointment.startTime,
                beneficiaryName: nextAppointment.beneficiaryName,
                specialistName: nextAppointment.specialistName,
              }
            : null,
        },
        children: children.map(c => ({
          id: c._id,
          nameAr: c.nameAr || c.name_ar,
          nameEn: c.nameEn || c.name_en,
          photoUrl: c.photoUrl,
          status: c.status,
          disabilityType: c.disabilityType,
          age: c.dateOfBirth
            ? Math.floor(
                (Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)
              )
            : null,
        })),
      },
    });
  } catch (err) {
    logger.error('parent dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في لوحة التحكم' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. الأبناء
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/children
 */
router.get('/children', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const Beneficiary = require('../models/Beneficiary');

    const children = await Beneficiary.find({
      $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
      isActive: { $ne: false },
    })
      .select('nameAr nameEn photoUrl status disabilityType dateOfBirth branchId diagnosis')
      .populate('branchId', 'nameAr nameEn')
      .lean();

    res.json({ success: true, data: children });
  } catch (err) {
    logger.error('parent children error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الأبناء' });
  }
});

/**
 * GET /api/parent-portal/children/:id
 */
router.get('/children/:id', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const Beneficiary = require('../models/Beneficiary');

    const child = await Beneficiary.findOne({
      _id: req.params.id,
      $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
    })
      .populate('branchId', 'nameAr nameEn phone addressAr')
      .lean();

    if (!child) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على الابن' });
    }

    res.json({ success: true, data: child });
  } catch (err) {
    logger.error('parent child detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الابن' });
  }
});

/**
 * GET /api/parent-portal/children/:id/sessions
 * جلسات الابن مع pagination
 */
router.get('/children/:id/sessions', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // التحقق من أن الابن تابع لولي الأمر
    const Beneficiary = require('../models/Beneficiary');
    const child = await Beneficiary.findOne({
      _id: req.params.id,
      $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
    }).lean();

    if (!child) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    // جلب الجلسات
    let sessions = [];
    let total = 0;
    try {
      const Session = require('../models/Session');
      total = await Session.countDocuments({ beneficiaryId: req.params.id });
      sessions = await Session.find({ beneficiaryId: req.params.id })
        .sort({ sessionDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('specialistId', 'nameAr nameEn specialty')
        .lean();
    } catch (e) {
      logger.warn('Failed to fetch sessions for child', {
        childId: req.params.id,
        error: e.message,
      });
    }

    res.json({
      success: true,
      data: sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('parent sessions error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الجلسات' });
  }
});

/**
 * GET /api/parent-portal/children/:id/progress
 * تقدم الابن عبر الزمن
 */
router.get('/children/:id/progress', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const Beneficiary = require('../models/Beneficiary');

    const child = await Beneficiary.findOne({
      _id: req.params.id,
      $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
    }).lean();

    if (!child) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    let progressData = { goals: [], assessments: [], overall: 0 };
    try {
      const BenProgress = require('../models/BeneficiaryProgress');
      const data = await BenProgress.findOne({ beneficiaryId: req.params.id }).lean();
      if (data) progressData = data;
    } catch (e) {
      logger.warn('Failed to fetch progress data', { childId: req.params.id, error: e.message });
    }

    res.json({ success: true, data: progressData });
  } catch (err) {
    logger.error('parent progress error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات التقدم' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. المواعيد
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/appointments
 */
router.get('/appointments', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { upcoming } = req.query;
    let appointments = [];
    try {
      const Schedule = require('../models/Schedule');
      const query = { guardianId };
      if (upcoming === 'true') query.date = { $gte: new Date() };
      appointments = await Schedule.find(query)
        .sort({ date: upcoming === 'true' ? 1 : -1 })
        .limit(50)
        .lean();
    } catch (e) {
      logger.warn('Failed to fetch appointments', { error: e.message });
    }
    res.json({ success: true, data: appointments });
  } catch (err) {
    logger.error('parent appointments error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المواعيد' });
  }
});

/**
 * POST /api/parent-portal/appointments/request
 * طلب موعد جديد
 */
router.post('/appointments/request', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { beneficiaryId, requestedDate, requestedTime, serviceType, notes } = req.body;

    if (!beneficiaryId || !requestedDate) {
      return res.status(422).json({ success: false, message: 'بيانات الطلب غير مكتملة' });
    }

    // التحقق من أن الابن تابع لولي الأمر
    const Beneficiary = require('../models/Beneficiary');
    const child = await Beneficiary.findOne({
      _id: beneficiaryId,
      $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
    }).lean();

    if (!child) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    // إنشاء طلب موعد (رسالة من نوع appointment_request)
    const { ParentMessage } = require('../models/ParentPortal');
    const message = await ParentMessage.create({
      guardianId,
      beneficiaryId,
      recipientType: 'administration',
      subject: 'طلب موعد جديد',
      body: `طلب موعد للابن/البنت: ${child.nameAr}\nالتاريخ المطلوب: ${requestedDate}\nالوقت: ${requestedTime || 'غير محدد'}\nنوع الخدمة: ${serviceType || 'غير محدد'}\nملاحظات: ${notes || '-'}`,
      direction: 'inbound',
      messageType: 'appointment_request',
    });

    res.status(201).json({
      success: true,
      message: 'تم تقديم طلب الموعد بنجاح. سيتم التواصل معك قريباً.',
      data: { requestId: message._id },
    });
  } catch (err) {
    logger.error('appointment request error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقديم الطلب' });
  }
});

/**
 * PUT /api/parent-portal/appointments/:id/cancel
 */
router.put('/appointments/:id/cancel', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    let updated = false;
    try {
      const Schedule = require('../models/Schedule');
      const appt = await Schedule.findOneAndUpdate(
        { _id: req.params.id, guardianId },
        { status: 'cancelled', cancelReason: req.body.reason || 'إلغاء من ولي الأمر' },
        { new: true }
      );
      updated = !!appt;
    } catch (e) {
      logger.warn('Failed to cancel appointment', {
        appointmentId: req.params.id,
        error: e.message,
      });
    }
    res.json({
      success: true,
      message: updated ? 'تم إلغاء الموعد' : 'لم يتم العثور على الموعد',
      updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الموعد' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. النقل — تتبع مباشر
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/transport/live
 */
router.get('/transport/live', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    let trips = [];
    try {
      const BusTracking = require('../models/BusTracking');
      trips = await BusTracking.find({
        'passengers.guardianId': guardianId,
        status: 'in_progress',
      })
        .select(
          'vehiclePlate driverName driverPhone currentLocation status estimatedArrival passengers'
        )
        .lean();
    } catch (e) {
      logger.warn('Failed to fetch live transport data', { error: e.message });
    }
    res.json({ success: true, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات النقل' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. الفواتير
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/invoices
 */
router.get('/invoices', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let invoices = [];
    let total = 0;
    try {
      const PortalPayment = require('../models/PortalPayment');
      total = await PortalPayment.countDocuments({ guardianId });
      invoices = await PortalPayment.find({ guardianId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (e) {
      logger.warn('Failed to fetch invoices', { error: e.message });
    }
    res.json({ success: true, data: invoices, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الفواتير' });
  }
});

/**
 * GET /api/parent-portal/invoices/:id
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    let invoice = null;
    try {
      const PortalPayment = require('../models/PortalPayment');
      invoice = await PortalPayment.findOne({ _id: req.params.id, guardianId }).lean();
    } catch (e) {
      logger.warn('Failed to fetch invoice detail', { invoiceId: req.params.id, error: e.message });
    }
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الفاتورة' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. الرسائل
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/messages
 */
router.get('/messages', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { ParentMessage } = require('../models/ParentPortal');

    const query = { guardianId, deletedAt: null };
    if (req.query.unread === 'true') query.isRead = false;
    if (req.query.direction) query.direction = req.query.direction;

    const total = await ParentMessage.countDocuments(query);
    const messages = await ParentMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipientId', 'name nameAr')
      .populate('beneficiaryId', 'nameAr nameEn')
      .lean();

    const unreadCount = await ParentMessage.countDocuments({
      guardianId,
      direction: 'outbound',
      isRead: false,
    });

    res.json({ success: true, data: messages, unreadCount, pagination: { page, limit, total } });
  } catch (err) {
    logger.error('parent messages error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الرسائل' });
  }
});

/**
 * POST /api/parent-portal/messages
 * إرسال رسالة جديدة
 */
router.post('/messages', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { beneficiaryId, recipientType, recipientId, subject, body, messageType } = req.body;

    if (!body || body.trim().length < 5) {
      return res
        .status(422)
        .json({ success: false, message: 'نص الرسالة مطلوب (5 أحرف على الأقل)' });
    }

    // التحقق من أن الابن تابع لولي الأمر (إن وُجد)
    if (beneficiaryId) {
      const Beneficiary = require('../models/Beneficiary');
      const child = await Beneficiary.findOne({
        _id: beneficiaryId,
        $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
      }).lean();
      if (!child) return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { ParentMessage } = require('../models/ParentPortal');
    const message = await ParentMessage.create({
      guardianId,
      beneficiaryId: beneficiaryId || null,
      recipientType: recipientType || 'administration',
      recipientId: recipientId || null,
      subject: subject || null,
      body: body.trim(),
      direction: 'inbound',
      messageType: messageType || 'general',
    });

    // إشعار للموظفين المعنيين (عبر Socket.IO إن وُجد)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('staff').emit('new_parent_message', {
          messageId: message._id,
          guardianId,
          messageType: message.messageType,
          subject: message.subject,
        });
      }
    } catch (e) {
      logger.debug('Socket.IO staff notification skipped', { error: e.message });
    }

    res.status(201).json({ success: true, message: 'تم إرسال الرسالة بنجاح', data: message });
  } catch (err) {
    logger.error('parent send message error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الرسالة' });
  }
});

/**
 * PUT /api/parent-portal/messages/:id/read
 */
router.put('/messages/:id/read', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { ParentMessage } = require('../models/ParentPortal');
    await ParentMessage.updateOne(
      { _id: req.params.id, guardianId },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'تم التعليم كمقروء' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. الإشعارات
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    let notifications = [];
    let unreadCount = 0;
    try {
      const PortalNotification = require('../models/PortalNotification');
      const skip = (page - 1) * limit;
      const query = { recipientId: guardianId };
      notifications = await PortalNotification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      unreadCount = await PortalNotification.countDocuments({ ...query, isRead: false });
    } catch (e) {
      logger.warn('Failed to fetch notifications', { error: e.message });
    }
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الإشعارات' });
  }
});

/**
 * PUT /api/parent-portal/notifications/mark-read
 */
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { ids, markAll } = req.body;
    try {
      const PortalNotification = require('../models/PortalNotification');
      if (markAll) {
        await PortalNotification.updateMany(
          { recipientId: guardianId, isRead: false },
          { isRead: true, readAt: new Date() }
        );
      } else if (ids && ids.length) {
        await PortalNotification.updateMany(
          { _id: { $in: ids }, recipientId: guardianId },
          { isRead: true, readAt: new Date() }
        );
      }
    } catch (e) {
      logger.warn('Failed to mark notifications as read', { error: e.message });
    }
    res.json({ success: true, message: 'تم التعليم كمقروء' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 9. الشكاوى والمقترحات
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/complaints
 */
router.get('/complaints', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const { ParentComplaint } = require('../models/ParentPortal');

    const query = { guardianId, deletedAt: null };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;

    const total = await ParentComplaint.countDocuments(query);
    const complaints = await ParentComplaint.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('beneficiaryId', 'nameAr nameEn')
      .lean();

    res.json({ success: true, data: complaints, pagination: { page, limit, total } });
  } catch (err) {
    logger.error('parent complaints error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشكاوى' });
  }
});

/**
 * POST /api/parent-portal/complaints
 * تقديم شكوى/مقترح/استفسار
 */
router.post('/complaints', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { type, category, subject, description, beneficiaryId, priority, isAnonymous } = req.body;

    if (!type || !category || !subject || !description) {
      return res.status(422).json({ success: false, message: 'البيانات الأساسية مطلوبة' });
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

    if (!validTypes.includes(type))
      return res.status(422).json({ success: false, message: 'نوع غير صحيح' });
    if (!validCategories.includes(category))
      return res.status(422).json({ success: false, message: 'فئة غير صحيحة' });

    // التحقق من الابن
    if (beneficiaryId) {
      const Beneficiary = require('../models/Beneficiary');
      const child = await Beneficiary.findOne({
        _id: beneficiaryId,
        $or: [{ guardianId }, { 'guardians.guardianId': guardianId }],
      }).lean();
      if (!child) return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { ParentComplaint } = require('../models/ParentPortal');
    const Guardian = require('../models/Guardian');
    const guardian = await Guardian.findById(guardianId).lean();

    const complaint = await ParentComplaint.create({
      guardianId,
      beneficiaryId: beneficiaryId || null,
      type,
      category,
      subject: subject.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      isAnonymous: isAnonymous || false,
      branchId: guardian?.branchId || null,
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلبك بنجاح. سنتواصل معك في أقرب وقت.',
      data: {
        id: complaint._id,
        ticketNumber: complaint.ticketNumber,
        status: complaint.status,
        type: complaint.type,
      },
    });
  } catch (err) {
    logger.error('parent complaint submit error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقديم الطلب' });
  }
});

/**
 * GET /api/parent-portal/complaints/:id
 */
router.get('/complaints/:id', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { ParentComplaint } = require('../models/ParentPortal');
    const complaint = await ParentComplaint.findOne({
      _id: req.params.id,
      guardianId,
    })
      .populate('beneficiaryId', 'nameAr nameEn')
      .populate('assignedTo', 'name nameAr')
      .lean();
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الشكوى' });
  }
});

/**
 * POST /api/parent-portal/complaints/:id/rate
 * تقييم حل الشكوى
 */
router.post('/complaints/:id/rate', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(422).json({ success: false, message: 'التقييم يجب أن يكون بين 1 و 5' });
    }

    const { ParentComplaint } = require('../models/ParentPortal');
    const complaint = await ParentComplaint.findOne({ _id: req.params.id, guardianId });

    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(422).json({ success: false, message: 'لا يمكن التقييم إلا بعد الحل' });
    }

    complaint.satisfactionRating = rating;
    complaint.satisfactionFeedback = feedback || null;
    await complaint.save();

    res.json({ success: true, message: 'شكراً لتقييمك' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التقييم' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 10. الإعدادات
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const Guardian = require('../models/Guardian');
    const guardian = await Guardian.findById(guardianId)
      .select(
        'nameAr nameEn phone email notificationPreferences quietHours preferredLanguage preferredContactMethod'
      )
      .lean();
    if (!guardian) return res.status(404).json({ success: false, message: 'ولي الأمر غير موجود' });
    res.json({
      success: true,
      data: {
        nameAr: guardian.nameAr || guardian.name_ar,
        nameEn: guardian.nameEn || guardian.name_en,
        phone: guardian.phone,
        email: guardian.email,
        language: guardian.preferredLanguage || 'ar',
        notificationPreferences: guardian.notificationPreferences || {
          sessions: true,
          assessments: true,
          transport: true,
          billing: true,
          messages: true,
          general: true,
        },
        quietHours: guardian.quietHours || { enabled: false, start: '22:00', end: '07:00' },
        preferredContactMethod: guardian.preferredContactMethod || 'whatsapp',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الإعدادات' });
  }
});

/**
 * PUT /api/parent-portal/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { nameAr, email, language, notificationPreferences, quietHours, preferredContactMethod } =
      req.body;

    const Guardian = require('../models/Guardian');
    const updateData = {};
    if (nameAr) updateData['nameAr'] = nameAr;
    if (email !== undefined) updateData['email'] = email;
    if (language) updateData['preferredLanguage'] = language;
    if (notificationPreferences) updateData['notificationPreferences'] = notificationPreferences;
    if (quietHours) updateData['quietHours'] = quietHours;
    if (preferredContactMethod) updateData['preferredContactMethod'] = preferredContactMethod;

    await Guardian.findByIdAndUpdate(guardianId, { $set: updateData });

    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حفظ الإعدادات' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 11. أجهزة FCM
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/parent-portal/devices
 */
router.post('/devices', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { deviceToken, deviceType, deviceName, notificationPreferences } = req.body;

    if (!deviceToken) return res.status(422).json({ success: false, message: 'deviceToken مطلوب' });

    const { ParentDevice } = require('../models/ParentPortal');
    const device = await ParentDevice.findOneAndUpdate(
      { deviceToken },
      {
        guardianId,
        deviceType: deviceType || 'web',
        deviceName: deviceName || null,
        isActive: true,
        lastActiveAt: new Date(),
        ...(notificationPreferences && { notificationPreferences }),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'تم تسجيل الجهاز', data: device });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الجهاز' });
  }
});

/**
 * DELETE /api/parent-portal/devices/:token
 */
router.delete('/devices/:token', async (req, res) => {
  try {
    const guardianId = req.user._id || req.user.id;
    const { ParentDevice } = require('../models/ParentPortal');
    await ParentDevice.updateOne(
      { deviceToken: req.params.token, guardianId },
      { isActive: false }
    );
    res.json({ success: true, message: 'تم إلغاء تسجيل الجهاز' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الجهاز' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 12. إدارة الشكاوى (للموظفين فقط)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/parent-portal/admin/complaints
 * قائمة شكاوى للمدراء والموظفين
 */
router.get('/admin/complaints', async (req, res) => {
  try {
    const roles = req.user.role || req.user.roles || '';
    const allowedRoles = ['admin', 'manager', 'coordinator', 'quality'];
    const isStaff = allowedRoles.some(r =>
      Array.isArray(roles) ? roles.includes(r) : roles === r
    );
    if (!isStaff) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { ParentComplaint } = require('../models/ParentPortal');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.branchId) query.branchId = req.query.branchId;

    const total = await ParentComplaint.countDocuments(query);
    const complaints = await ParentComplaint.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('guardianId', 'nameAr phone')
      .populate('beneficiaryId', 'nameAr nameEn')
      .populate('assignedTo', 'name nameAr')
      .lean();

    res.json({ success: true, data: complaints, pagination: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الشكاوى' });
  }
});

/**
 * PUT /api/parent-portal/admin/complaints/:id
 * تحديث حالة شكوى من قبل الموظف
 */
router.put('/admin/complaints/:id', async (req, res) => {
  try {
    const roles = req.user.role || req.user.roles || '';
    const allowedRoles = ['admin', 'manager', 'coordinator', 'quality'];
    const isStaff = allowedRoles.some(r =>
      Array.isArray(roles) ? roles.includes(r) : roles === r
    );
    if (!isStaff) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { status, resolution, assignedTo, response } = req.body;
    const { ParentComplaint } = require('../models/ParentPortal');

    const updateData = {};
    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'resolved') updateData.resolvedAt = new Date();

    const complaint = await ParentComplaint.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
        ...(response
          ? {
              $push: {
                responses: { userId: req.user._id, message: response, createdAt: new Date() },
              },
            }
          : {}),
      },
      { new: true }
    );

    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });

    res.json({ success: true, message: 'تم تحديث الشكوى', data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الشكوى' });
  }
});

module.exports = router;
