/**
 * Central Settings Routes — نظام الإعدادات المركزي
 * البرومبت 24: Settings + Branch Override + File Upload
 *
 * Endpoints:
 *   GET    /public              الإعدادات العامة (بدون admin)
 *   GET    /                    جميع الإعدادات مجمّعة بالمجموعات (admin)
 *   GET    /group/:group        إعدادات مجموعة محددة
 *   PUT    /                    تحديث إعدادات (bulk update)
 *   POST   /upload              رفع ملف/شعار
 *   POST   /reset-branch        إعادة تعيين إعداد الفرع للقيمة الافتراضية
 *   GET    /branch/:branchId    إعدادات فرع محدد (override)
 *   PUT    /branch/:branchId    تحديث إعدادات فرع
 *   POST   /seed                إضافة الإعدادات الافتراضية (للإعداد الأولي)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

// نستخدم نموذج BranchSetting الموجود في النظام
let GlobalSetting, BranchSetting;
try {
  const branchSettingModel = require('../models/BranchSetting');
  GlobalSetting = branchSettingModel.GlobalSetting || branchSettingModel;
  BranchSetting = branchSettingModel.BranchSetting || branchSettingModel;
} catch {
  // إنشاء نماذج مبسطة إذا لم تكن موجودة
  const mongoose = require('mongoose');
const safeError = require('../utils/safeError');

  const globalSettingSchema = new mongoose.Schema(
    {
      group: {
        type: String,
        required: true,
        enum: [
          'general',
          'appointments',
          'billing',
          'transport',
          'notifications',
          'integrations',
          'security',
          'appearance',
          'clinical',
          'hr',
        ],
      },
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
      type: {
        type: String,
        enum: [
          'string',
          'integer',
          'float',
          'boolean',
          'json',
          'array',
          'date',
          'time',
          'image',
          'file',
          'color',
          'html',
        ],
        default: 'string',
      },
      labelAr: { type: String, required: true },
      labelEn: { type: String, required: true },
      descriptionAr: { type: String, default: null },
      descriptionEn: { type: String, default: null },
      validationRules: { type: String, default: null },
      options: [{ value: mongoose.Schema.Types.Mixed, labelAr: String, labelEn: String }],
      isPublic: { type: Boolean, default: false },
      isEncrypted: { type: Boolean, default: false },
      sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
  );
  globalSettingSchema.index({ group: 1, sortOrder: 1 });

  const branchSettingSchema = new mongoose.Schema(
    {
      branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
      key: { type: String, required: true },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
  );
  branchSettingSchema.index({ branchId: 1, key: 1 }, { unique: true });

  GlobalSetting = mongoose.model('GlobalSetting', globalSettingSchema);
  BranchSetting = mongoose.model('BranchSetting', branchSettingSchema);
}

router.use(authenticate);
router.use(requireBranchAccess);
// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const adminRoles = ['admin', 'super_admin', 'manager'];
  if (!adminRoles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح — يتطلب صلاحية مدير',
    });
  }
  next();
}

/**
 * تحويل القيمة حسب نوع الإعداد
 */
function castValue(value, type) {
  if (value === null || value === undefined) return null;
  switch (type) {
    case 'integer':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'boolean':
      return value === true || value === 'true' || value === 1 || value === '1';
    case 'json':
    case 'array':
      return typeof value === 'string' ? JSON.parse(value) : value;
    default:
      return value;
  }
}

/**
 * جلب إعدادات الفرع (override)
 */
async function getBranchOverrides(branchId) {
  if (!branchId) return {};
  const overrides = await BranchSetting.find({ branchId }).lean();
  return overrides.reduce((acc, o) => ({ ...acc, [o.key]: o.value }), {});
}

// ─── PUBLIC SETTINGS ──────────────────────────────────────────────────────────

/**
 * GET /public — الإعدادات المرئية للعموم
 */
router.get('/public', async (req, res) => {
  try {
    const { branchId } = req.query;
    const settings = await GlobalSetting.find({ isPublic: true }).sort({ sortOrder: 1 }).lean();
    const overrides = await getBranchOverrides(branchId);

    const result = {};
    for (const s of settings) {
      const value = overrides[s.key] !== undefined ? overrides[s.key] : s.value;
      result[s.key] = {
        value: castValue(value, s.type),
        labelAr: s.labelAr,
        labelEn: s.labelEn,
        type: s.type,
      };
    }

    return res.json({ success: true, settings: result });
  } catch (err) {
    safeError(res, err, '[CentralSettings] public error');
  }
});

// ─── ALL GROUPS (admin) ───────────────────────────────────────────────────────

/**
 * GET / — جميع الإعدادات مجمّعة بالمجموعات
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { branchId } = req.query;
    const settings = await GlobalSetting.find().sort({ group: 1, sortOrder: 1 }).lean();
    const overrides = await getBranchOverrides(branchId);

    const groups = {};
    for (const s of settings) {
      if (!groups[s.group]) groups[s.group] = [];
      const branchValue = overrides[s.key];
      groups[s.group].push({
        key: s.key,
        value: castValue(s.value, s.type),
        branchValue: branchValue !== undefined ? castValue(branchValue, s.type) : undefined,
        effectiveValue:
          branchValue !== undefined ? castValue(branchValue, s.type) : castValue(s.value, s.type),
        hasBranchOverride: branchValue !== undefined,
        type: s.type,
        labelAr: s.labelAr,
        labelEn: s.labelEn,
        descriptionAr: s.descriptionAr,
        descriptionEn: s.descriptionEn,
        options: s.options,
        isPublic: s.isPublic,
        sortOrder: s.sortOrder,
      });
    }

    return res.json({ success: true, groups, branchId: branchId || null });
  } catch (err) {
    safeError(res, err, '[CentralSettings] all groups error');
  }
});

// ─── GROUP (admin) ────────────────────────────────────────────────────────────

/**
 * GET /group/:group — إعدادات مجموعة محددة
 */
router.get('/group/:group', requireAdmin, async (req, res) => {
  try {
    const { group } = req.params;
    const { branchId } = req.query;
    const settings = await GlobalSetting.find({ group }).sort({ sortOrder: 1 }).lean();
    const overrides = await getBranchOverrides(branchId);

    const result = {};
    for (const s of settings) {
      const branchValue = overrides[s.key];
      result[s.key] = {
        value: castValue(s.value, s.type),
        effectiveValue:
          branchValue !== undefined ? castValue(branchValue, s.type) : castValue(s.value, s.type),
        hasBranchOverride: branchValue !== undefined,
        type: s.type,
        labelAr: s.labelAr,
        labelEn: s.labelEn,
        descriptionAr: s.descriptionAr,
        options: s.options,
      };
    }

    return res.json({ success: true, group, settings: result });
  } catch (err) {
    safeError(res, err, '[CentralSettings] group error');
  }
});

// ─── UPDATE SETTINGS (bulk) ───────────────────────────────────────────────────

/**
 * PUT / — تحديث إعدادات دفعة واحدة
 */
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { settings, branchId } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(422).json({ success: false, message: 'settings مطلوب كـ object' });
    }

    const errors = [];
    const updated = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        if (branchId) {
          // إعداد الفرع (override)
          await BranchSetting.findOneAndUpdate(
            { branchId, key },
            { branchId, key, value },
            { upsert: true, new: true }
          );
        } else {
          // الإعداد العام
          await GlobalSetting.findOneAndUpdate({ key }, { value }, { new: true });
        }
        updated.push(key);
      } catch (e) {
        errors.push({ key, error: e.message });
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: `تم تحديث ${updated.length} إعداد، ${errors.length} أخطاء`,
        updated,
        errors,
      });
    }

    return res.json({
      success: true,
      message: `تم حفظ ${updated.length} إعداد بنجاح`,
      updated,
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] update error');
  }
});

// ─── BRANCH SETTINGS ──────────────────────────────────────────────────────────

/**
 * GET /branch/:branchId — إعدادات فرع محدد
 */
router.get('/branch/:branchId', requireAdmin, async (req, res) => {
  try {
    const { branchId } = req.params;
    const overrides = await BranchSetting.find({ branchId }).lean();

    return res.json({
      success: true,
      branchId,
      overrides: overrides.reduce((acc, o) => ({ ...acc, [o.key]: o.value }), {}),
      total: overrides.length,
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] branch settings error');
  }
});

/**
 * PUT /branch/:branchId — تحديث إعدادات فرع
 */
router.put('/branch/:branchId', requireAdmin, async (req, res) => {
  try {
    const { branchId } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(422).json({ success: false, message: 'settings مطلوب كـ object' });
    }

    const updated = [];
    for (const [key, value] of Object.entries(settings)) {
      await BranchSetting.findOneAndUpdate(
        { branchId, key },
        { branchId, key, value },
        { upsert: true }
      );
      updated.push(key);
    }

    return res.json({
      success: true,
      message: `تم تحديث ${updated.length} إعداد للفرع`,
      branchId,
      updated,
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] update branch error');
  }
});

// ─── RESET BRANCH OVERRIDE ────────────────────────────────────────────────────

/**
 * POST /reset-branch — إعادة تعيين إعداد الفرع للقيمة الافتراضية
 */
router.post('/reset-branch', requireAdmin, async (req, res) => {
  try {
    const { key, branchId } = req.body;

    if (!key || !branchId) {
      return res.status(422).json({ success: false, message: 'key و branchId مطلوبان' });
    }

    const result = await BranchSetting.deleteOne({ branchId, key });

    if (result.deletedCount === 0) {
      return res.json({
        success: true,
        message: 'لا يوجد override لهذا الإعداد في الفرع المحدد',
      });
    }

    return res.json({
      success: true,
      message: 'تم إعادة الإعداد للقيمة الافتراضية',
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] reset branch error');
  }
});

// ─── UPLOAD FILE/IMAGE ────────────────────────────────────────────────────────

/**
 * POST /upload — رفع ملف/شعار
 */
router.post('/upload', requireAdmin, async (req, res) => {
  try {
    const { key, branchId } = req.body;

    if (!key) {
      return res.status(422).json({ success: false, message: 'key مطلوب' });
    }

    // في حالة عدم وجود multer، نرجع استجابة مناسبة
    if (!req.file) {
      return res.status(422).json({
        success: false,
        message: 'الملف مطلوب. يرجى إرفاق file في multipart/form-data',
      });
    }

    const setting = await GlobalSetting.findOne({ key });
    if (setting && !['image', 'file'].includes(setting.type)) {
      return res.status(422).json({
        success: false,
        message: 'هذا الإعداد لا يقبل ملفات',
      });
    }

    const filePath = req.file.path || req.file.filename;
    const fileUrl = `/uploads/settings/${req.file.filename}`;

    if (branchId) {
      await BranchSetting.findOneAndUpdate(
        { branchId, key },
        { branchId, key, value: fileUrl },
        { upsert: true }
      );
    } else {
      await GlobalSetting.findOneAndUpdate({ key }, { value: fileUrl }, { new: true });
    }

    return res.json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      path: filePath,
      url: fileUrl,
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] upload error');
  }
});

// ─── SEED DEFAULT SETTINGS ────────────────────────────────────────────────────

/**
 * POST /seed — إضافة الإعدادات الافتراضية
 * للاستخدام عند الإعداد الأولي للنظام
 */
router.post('/seed', requireAdmin, async (req, res) => {
  try {
    const { force = false } = req.body;

    const existing = await GlobalSetting.countDocuments();
    if (existing > 0 && !force) {
      return res.json({
        success: true,
        message: `يوجد ${existing} إعداد بالفعل. أرسل force=true للإعادة`,
        existing,
      });
    }

    const defaults = [
      // ─── المجموعة: عامة ────────────────────────────────────────────────────
      {
        group: 'general',
        key: 'center_name_ar',
        value: 'مركز التأهيل الشامل',
        type: 'string',
        labelAr: 'اسم المركز (عربي)',
        labelEn: 'Center Name (Arabic)',
        isPublic: true,
        sortOrder: 1,
      },
      {
        group: 'general',
        key: 'center_name_en',
        value: 'Comprehensive Rehabilitation Center',
        type: 'string',
        labelAr: 'اسم المركز (إنجليزي)',
        labelEn: 'Center Name (English)',
        isPublic: true,
        sortOrder: 2,
      },
      {
        group: 'general',
        key: 'center_logo',
        value: null,
        type: 'image',
        labelAr: 'شعار المركز',
        labelEn: 'Center Logo',
        isPublic: true,
        sortOrder: 3,
      },
      {
        group: 'general',
        key: 'center_phone',
        value: '',
        type: 'string',
        labelAr: 'هاتف المركز',
        labelEn: 'Center Phone',
        isPublic: true,
        sortOrder: 4,
      },
      {
        group: 'general',
        key: 'center_email',
        value: '',
        type: 'string',
        labelAr: 'البريد الإلكتروني',
        labelEn: 'Email',
        isPublic: true,
        sortOrder: 5,
      },
      {
        group: 'general',
        key: 'working_days',
        value: ['sun', 'mon', 'tue', 'wed', 'thu'],
        type: 'array',
        labelAr: 'أيام العمل',
        labelEn: 'Working Days',
        isPublic: true,
        sortOrder: 6,
      },
      {
        group: 'general',
        key: 'working_hours_start',
        value: '08:00',
        type: 'time',
        labelAr: 'بداية الدوام',
        labelEn: 'Work Start Time',
        isPublic: true,
        sortOrder: 7,
      },
      {
        group: 'general',
        key: 'working_hours_end',
        value: '17:00',
        type: 'time',
        labelAr: 'نهاية الدوام',
        labelEn: 'Work End Time',
        isPublic: true,
        sortOrder: 8,
      },
      {
        group: 'general',
        key: 'default_language',
        value: 'ar',
        type: 'string',
        labelAr: 'اللغة الافتراضية',
        labelEn: 'Default Language',
        options: [
          { value: 'ar', labelAr: 'عربي', labelEn: 'Arabic' },
          { value: 'en', labelAr: 'إنجليزي', labelEn: 'English' },
        ],
        isPublic: true,
        sortOrder: 9,
      },
      {
        group: 'general',
        key: 'timezone',
        value: 'Asia/Riyadh',
        type: 'string',
        labelAr: 'المنطقة الزمنية',
        labelEn: 'Timezone',
        isPublic: false,
        sortOrder: 10,
      },

      // ─── المجموعة: المواعيد ──────────────────────────────────────────────
      {
        group: 'appointments',
        key: 'session_duration_default',
        value: 60,
        type: 'integer',
        labelAr: 'مدة الجلسة الافتراضية (دقيقة)',
        labelEn: 'Default Session Duration (min)',
        isPublic: false,
        sortOrder: 1,
      },
      {
        group: 'appointments',
        key: 'appointment_reminder_hours',
        value: 24,
        type: 'integer',
        labelAr: 'تذكير بالموعد قبل (ساعة)',
        labelEn: 'Appointment Reminder Before (hours)',
        isPublic: false,
        sortOrder: 2,
      },
      {
        group: 'appointments',
        key: 'max_appointments_per_day',
        value: 10,
        type: 'integer',
        labelAr: 'الحد الأقصى للمواعيد يومياً',
        labelEn: 'Max Appointments Per Day',
        isPublic: false,
        sortOrder: 3,
      },
      {
        group: 'appointments',
        key: 'allow_online_booking',
        value: false,
        type: 'boolean',
        labelAr: 'السماح بالحجز الإلكتروني',
        labelEn: 'Allow Online Booking',
        isPublic: true,
        sortOrder: 4,
      },

      // ─── المجموعة: الفوترة ───────────────────────────────────────────────
      {
        group: 'billing',
        key: 'vat_rate',
        value: 15,
        type: 'float',
        labelAr: 'نسبة ضريبة القيمة المضافة (%)',
        labelEn: 'VAT Rate (%)',
        isPublic: false,
        sortOrder: 1,
      },
      {
        group: 'billing',
        key: 'invoice_prefix',
        value: 'INV',
        type: 'string',
        labelAr: 'بادئة رقم الفاتورة',
        labelEn: 'Invoice Number Prefix',
        isPublic: false,
        sortOrder: 2,
      },
      {
        group: 'billing',
        key: 'payment_due_days',
        value: 30,
        type: 'integer',
        labelAr: 'أيام استحقاق الدفع',
        labelEn: 'Payment Due Days',
        isPublic: false,
        sortOrder: 3,
      },
      {
        group: 'billing',
        key: 'enable_zatca',
        value: false,
        type: 'boolean',
        labelAr: 'تفعيل ZATCA الفوترة الإلكترونية',
        labelEn: 'Enable ZATCA E-Invoicing',
        isPublic: false,
        sortOrder: 4,
      },

      // ─── المجموعة: الإشعارات ─────────────────────────────────────────────
      {
        group: 'notifications',
        key: 'enable_sms',
        value: false,
        type: 'boolean',
        labelAr: 'تفعيل إشعارات SMS',
        labelEn: 'Enable SMS Notifications',
        isPublic: false,
        sortOrder: 1,
      },
      {
        group: 'notifications',
        key: 'enable_whatsapp',
        value: false,
        type: 'boolean',
        labelAr: 'تفعيل إشعارات WhatsApp',
        labelEn: 'Enable WhatsApp Notifications',
        isPublic: false,
        sortOrder: 2,
      },
      {
        group: 'notifications',
        key: 'enable_push',
        value: false,
        type: 'boolean',
        labelAr: 'تفعيل الإشعارات الفورية',
        labelEn: 'Enable Push Notifications',
        isPublic: false,
        sortOrder: 3,
      },
      {
        group: 'notifications',
        key: 'sender_name',
        value: 'مركز التأهيل',
        type: 'string',
        labelAr: 'اسم المرسل',
        labelEn: 'Sender Name',
        isPublic: false,
        sortOrder: 4,
      },

      // ─── المجموعة: الأمان ────────────────────────────────────────────────
      {
        group: 'security',
        key: 'session_timeout_minutes',
        value: 480,
        type: 'integer',
        labelAr: 'مهلة انتهاء الجلسة (دقيقة)',
        labelEn: 'Session Timeout (minutes)',
        isPublic: false,
        sortOrder: 1,
      },
      {
        group: 'security',
        key: 'max_login_attempts',
        value: 5,
        type: 'integer',
        labelAr: 'الحد الأقصى لمحاولات الدخول',
        labelEn: 'Max Login Attempts',
        isPublic: false,
        sortOrder: 2,
      },
      {
        group: 'security',
        key: 'enable_2fa',
        value: false,
        type: 'boolean',
        labelAr: 'تفعيل التحقق الثنائي',
        labelEn: 'Enable 2FA',
        isPublic: false,
        sortOrder: 3,
      },
      {
        group: 'security',
        key: 'password_min_length',
        value: 8,
        type: 'integer',
        labelAr: 'الحد الأدنى لطول كلمة المرور',
        labelEn: 'Password Min Length',
        isPublic: false,
        sortOrder: 4,
      },

      // ─── المجموعة: المظهر ────────────────────────────────────────────────
      {
        group: 'appearance',
        key: 'primary_color',
        value: '#1a73e8',
        type: 'color',
        labelAr: 'اللون الأساسي',
        labelEn: 'Primary Color',
        isPublic: true,
        sortOrder: 1,
      },
      {
        group: 'appearance',
        key: 'sidebar_dark',
        value: false,
        type: 'boolean',
        labelAr: 'الشريط الجانبي داكن',
        labelEn: 'Dark Sidebar',
        isPublic: false,
        sortOrder: 2,
      },
      {
        group: 'appearance',
        key: 'dashboard_layout',
        value: 'default',
        type: 'string',
        labelAr: 'تخطيط لوحة التحكم',
        labelEn: 'Dashboard Layout',
        isPublic: false,
        sortOrder: 3,
      },
    ];

    if (force) {
      await GlobalSetting.deleteMany({});
    }

    let inserted = 0;
    let skipped = 0;
    for (const setting of defaults) {
      try {
        await GlobalSetting.findOneAndUpdate(
          { key: setting.key },
          {
            ...setting,
            labelEn: setting.labelEn || setting.labelAr,
          },
          { upsert: true }
        );
        inserted++;
      } catch {
        skipped++;
      }
    }

    return res.status(201).json({
      success: true,
      message: `تم إضافة ${inserted} إعداد افتراضي بنجاح`,
      inserted,
      skipped,
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] seed error');
  }
});

// ─── GET SINGLE SETTING ───────────────────────────────────────────────────────

/**
 * GET /key/:key — قراءة إعداد واحد
 */
router.get('/key/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { branchId } = req.query;

    const setting = await GlobalSetting.findOne({ key }).lean();
    if (!setting) {
      return res.status(404).json({ success: false, message: 'الإعداد غير موجود' });
    }

    let effectiveValue = castValue(setting.value, setting.type);

    if (branchId) {
      const override = await BranchSetting.findOne({ branchId, key }).lean();
      if (override) {
        effectiveValue = castValue(override.value, setting.type);
      }
    }

    return res.json({
      success: true,
      data: {
        ...setting,
        effectiveValue,
        hasBranchOverride: false,
      },
    });
  } catch (err) {
    safeError(res, err, '[CentralSettings] get key error');
  }
});

module.exports = router;
