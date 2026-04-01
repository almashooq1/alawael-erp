/**
 * SettingsService — خدمة الإعدادات المركزية
 * البرومبت 24: نظام الإعدادات المركزي مع دعم Override للفروع
 *
 * منطق الأولوية:
 *   1. إعداد الفرع (BranchSetting) — أعلى أولوية
 *   2. الإعداد العام (GlobalSetting)
 *   3. القيمة الافتراضية المُمررة
 */

const { GlobalSetting, BranchSetting } = require('../models/BranchSetting');
const logger = require('../utils/logger');

// ─── Cache في الذاكرة (بسيط بدون Redis) ─────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // ساعة واحدة

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

function cacheDelete(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

// ─── تحويل القيمة حسب نوع الإعداد ───────────────────────────────────────────
function castValue(value, type) {
  if (value === null || value === undefined) return value;
  try {
    switch (type) {
      case 'integer':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === '1' || value === 1;
      case 'json':
      case 'array':
        if (typeof value === 'string') return JSON.parse(value);
        return value;
      default:
        return value;
    }
  } catch {
    return value;
  }
}

// ─── الوظائف الرئيسية ─────────────────────────────────────────────────────

/**
 * الحصول على قيمة إعداد واحد
 * @param {string} key - مفتاح الإعداد
 * @param {*} defaultValue - القيمة الافتراضية
 * @param {string|null} branchId - معرف الفرع (اختياري)
 */
async function get(key, defaultValue = null, branchId = null) {
  try {
    // 1. فحص إعداد الفرع أولاً
    if (branchId) {
      const cacheKey = `branch:${branchId}:${key}`;
      let branchValue = cacheGet(cacheKey);

      if (branchValue === null) {
        const branchSetting = await BranchSetting.findOne({ branchId, key }).lean();
        if (branchSetting && branchSetting.value !== undefined) {
          // الحصول على نوع الإعداد من الإعداد العام
          const globalSetting = await GlobalSetting.findOne({ key }).select('type').lean();
          branchValue = castValue(branchSetting.value, globalSetting?.type || 'string');
          cacheSet(cacheKey, branchValue);
          return branchValue;
        }
      } else {
        return branchValue;
      }
    }

    // 2. الإعداد العام
    const globalCacheKey = `global:${key}`;
    let globalValue = cacheGet(globalCacheKey);

    if (globalValue === null) {
      const globalSetting = await GlobalSetting.findOne({ key }).lean();
      if (!globalSetting) return defaultValue;
      globalValue = castValue(globalSetting.value, globalSetting.type);
      cacheSet(globalCacheKey, globalValue);
    }

    return globalValue ?? defaultValue;
  } catch (err) {
    logger.error(`[SettingsService] get(${key}) failed`, { error: err.message });
    return defaultValue;
  }
}

/**
 * تعيين قيمة إعداد
 * @param {string} key
 * @param {*} value
 * @param {string|null} branchId - إذا null → إعداد عام
 * @param {string|null} updatedBy - معرف المستخدم الذي قام بالتحديث
 */
async function set(key, value, branchId = null, updatedBy = null) {
  try {
    if (branchId) {
      // تحديث أو إنشاء إعداد فرع
      await BranchSetting.findOneAndUpdate(
        { branchId, key },
        { value, overriddenBy: updatedBy, overriddenAt: new Date() },
        { upsert: true, new: true }
      );
      cacheDelete(`branch:${branchId}:${key}`);
    } else {
      // تحديث الإعداد العام
      await GlobalSetting.findOneAndUpdate({ key }, { value }, { upsert: false });
      cacheDelete(`global:${key}`);
    }
  } catch (err) {
    logger.error(`[SettingsService] set(${key}) failed`, { error: err.message });
    throw err;
  }
}

/**
 * الحصول على كل إعدادات مجموعة معينة
 * @param {string} group - اسم المجموعة
 * @param {string|null} branchId
 */
async function getGroup(group, branchId = null) {
  try {
    const cacheKey = `group:${group}:${branchId || 'global'}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const globalSettings = await GlobalSetting.find({ group }).sort({ sortOrder: 1 }).lean();

    if (!globalSettings.length) return {};

    let branchOverrides = {};
    if (branchId) {
      const keys = globalSettings.map(s => s.key);
      const overrides = await BranchSetting.find({ branchId, key: { $in: keys } }).lean();
      branchOverrides = overrides.reduce((acc, o) => {
        acc[o.key] = o.value;
        return acc;
      }, {});
    }

    const result = {};
    for (const setting of globalSettings) {
      const hasOverride = branchId && branchOverrides[setting.key] !== undefined;
      const rawValue = hasOverride ? branchOverrides[setting.key] : setting.value;

      result[setting.key] = {
        value: castValue(rawValue, setting.type),
        labelAr: setting.labelAr,
        labelEn: setting.labelEn,
        descriptionAr: setting.descriptionAr,
        descriptionEn: setting.descriptionEn,
        type: setting.type,
        group: setting.group,
        options: setting.options,
        isPublic: setting.isPublic,
        hasBranchOverride: hasOverride,
        sortOrder: setting.sortOrder,
      };
    }

    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    logger.error(`[SettingsService] getGroup(${group}) failed`, { error: err.message });
    return {};
  }
}

/**
 * الحصول على كل المجموعات
 * @param {string|null} branchId
 */
async function getAllGroups(branchId = null) {
  try {
    const globalSettings = await GlobalSetting.find().sort({ group: 1, sortOrder: 1 }).lean();

    let branchOverrides = {};
    if (branchId) {
      const overrides = await BranchSetting.find({ branchId }).lean();
      branchOverrides = overrides.reduce((acc, o) => {
        acc[o.key] = o.value;
        return acc;
      }, {});
    }

    const groups = {};
    for (const setting of globalSettings) {
      if (!groups[setting.group]) groups[setting.group] = {};

      const hasOverride = branchId && branchOverrides[setting.key] !== undefined;
      const rawValue = hasOverride ? branchOverrides[setting.key] : setting.value;

      groups[setting.group][setting.key] = {
        value: castValue(rawValue, setting.type),
        labelAr: setting.labelAr,
        labelEn: setting.labelEn,
        type: setting.type,
        isPublic: setting.isPublic,
        hasBranchOverride: hasOverride,
      };
    }

    return groups;
  } catch (err) {
    logger.error('[SettingsService] getAllGroups failed', { error: err.message });
    return {};
  }
}

/**
 * تحديث مجموعة من الإعدادات دفعة واحدة
 * @param {Object} settings - { key: value }
 * @param {string|null} branchId
 * @param {string|null} updatedBy
 */
async function updateBulk(settings, branchId = null, updatedBy = null) {
  try {
    const keys = Object.keys(settings);
    if (!keys.length) return;

    if (branchId) {
      // تحديث إعدادات الفرع
      const ops = keys.map(key => ({
        updateOne: {
          filter: { branchId, key },
          update: {
            $set: { value: settings[key], overriddenBy: updatedBy, overriddenAt: new Date() },
          },
          upsert: true,
        },
      }));
      await BranchSetting.bulkWrite(ops);
      cacheDelete(`group:`);
      cacheDelete(`branch:${branchId}:`);
    } else {
      // تحديث الإعدادات العامة
      const ops = keys.map(key => ({
        updateOne: {
          filter: { key },
          update: { $set: { value: settings[key] } },
          upsert: false,
        },
      }));
      await GlobalSetting.bulkWrite(ops);
      cacheDelete('global:');
      cacheDelete('group:');
    }

    logger.info(`[SettingsService] updateBulk: ${keys.length} settings updated`, {
      branchId,
      keys,
    });
  } catch (err) {
    logger.error('[SettingsService] updateBulk failed', { error: err.message });
    throw err;
  }
}

/**
 * إعادة تعيين إعداد فرع (حذف Override والعودة للإعداد العام)
 * @param {string} key
 * @param {string} branchId
 */
async function resetBranchSetting(key, branchId) {
  try {
    await BranchSetting.deleteOne({ branchId, key });
    cacheDelete(`branch:${branchId}:${key}`);
    cacheDelete(`group:`);
    logger.info(`[SettingsService] Branch setting reset: ${key} for branch ${branchId}`);
  } catch (err) {
    logger.error(`[SettingsService] resetBranchSetting(${key}) failed`, { error: err.message });
    throw err;
  }
}

/**
 * مسح الكاش بالكامل
 */
function clearCache() {
  cache.clear();
  logger.info('[SettingsService] Cache cleared');
}

/**
 * الحصول على الإعدادات العامة فقط (للـ public API)
 */
async function getPublicSettings(branchId = null) {
  try {
    const publicSettings = await GlobalSetting.find({ isPublic: true })
      .sort({ group: 1, sortOrder: 1 })
      .lean();

    let branchOverrides = {};
    if (branchId) {
      const keys = publicSettings.map(s => s.key);
      const overrides = await BranchSetting.find({ branchId, key: { $in: keys } }).lean();
      branchOverrides = overrides.reduce((acc, o) => {
        acc[o.key] = o.value;
        return acc;
      }, {});
    }

    const result = {};
    for (const setting of publicSettings) {
      const rawValue =
        branchId && branchOverrides[setting.key] !== undefined
          ? branchOverrides[setting.key]
          : setting.value;
      result[setting.key] = castValue(rawValue, setting.type);
    }

    return result;
  } catch (err) {
    logger.error('[SettingsService] getPublicSettings failed', { error: err.message });
    return {};
  }
}

/**
 * Seed الإعدادات الافتراضية (يُستدعى مرة واحدة عند التثبيت)
 */
async function seedDefaultSettings() {
  const defaults = [
    // ─── عام ───
    {
      group: 'general',
      key: 'center_name_ar',
      value: 'مركز الأوائل لتأهيل ذوي الإعاقة',
      type: 'string',
      labelAr: 'اسم المركز (عربي)',
      labelEn: 'Center Name (Arabic)',
      isPublic: true,
      sortOrder: 1,
    },
    {
      group: 'general',
      key: 'center_name_en',
      value: 'AlAwael Rehabilitation Center',
      type: 'string',
      labelAr: 'اسم المركز (إنجليزي)',
      labelEn: 'Center Name (English)',
      isPublic: true,
      sortOrder: 2,
    },
    {
      group: 'general',
      key: 'center_phone',
      value: '',
      type: 'string',
      labelAr: 'هاتف المركز',
      labelEn: 'Center Phone',
      isPublic: true,
      sortOrder: 3,
    },
    {
      group: 'general',
      key: 'center_email',
      value: '',
      type: 'string',
      labelAr: 'بريد المركز',
      labelEn: 'Center Email',
      isPublic: true,
      sortOrder: 4,
    },
    {
      group: 'general',
      key: 'working_days',
      value: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      type: 'array',
      labelAr: 'أيام العمل',
      labelEn: 'Working Days',
      isPublic: true,
      sortOrder: 5,
    },
    {
      group: 'general',
      key: 'working_hours_start',
      value: '08:00',
      type: 'string',
      labelAr: 'بداية الدوام',
      labelEn: 'Work Start Time',
      isPublic: true,
      sortOrder: 6,
    },
    {
      group: 'general',
      key: 'working_hours_end',
      value: '16:00',
      type: 'string',
      labelAr: 'نهاية الدوام',
      labelEn: 'Work End Time',
      isPublic: true,
      sortOrder: 7,
    },
    // ─── المواعيد ───
    {
      group: 'appointments',
      key: 'session_duration_default',
      value: 45,
      type: 'integer',
      labelAr: 'مدة الجلسة الافتراضية (دقائق)',
      labelEn: 'Default Session Duration (minutes)',
      isPublic: false,
      sortOrder: 1,
    },
    {
      group: 'appointments',
      key: 'booking_advance_days',
      value: 30,
      type: 'integer',
      labelAr: 'أقصى أيام للحجز المسبق',
      labelEn: 'Max Advance Booking Days',
      isPublic: false,
      sortOrder: 2,
    },
    {
      group: 'appointments',
      key: 'cancellation_hours',
      value: 24,
      type: 'integer',
      labelAr: 'ساعات الإلغاء المسموح',
      labelEn: 'Cancellation Notice Hours',
      isPublic: true,
      sortOrder: 3,
    },
    {
      group: 'appointments',
      key: 'reminder_hours_before',
      value: 24,
      type: 'integer',
      labelAr: 'إرسال التذكير قبل (ساعات)',
      labelEn: 'Send Reminder Before (hours)',
      isPublic: false,
      sortOrder: 4,
    },
    // ─── الفواتير ───
    {
      group: 'billing',
      key: 'vat_rate',
      value: 15,
      type: 'float',
      labelAr: 'نسبة ضريبة القيمة المضافة (%)',
      labelEn: 'VAT Rate (%)',
      isPublic: true,
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
      labelAr: 'أيام استحقاق السداد',
      labelEn: 'Payment Due Days',
      isPublic: false,
      sortOrder: 3,
    },
    // ─── الإشعارات ───
    {
      group: 'notifications',
      key: 'sms_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل الرسائل النصية',
      labelEn: 'Enable SMS',
      isPublic: false,
      sortOrder: 1,
    },
    {
      group: 'notifications',
      key: 'email_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل البريد الإلكتروني',
      labelEn: 'Enable Email',
      isPublic: false,
      sortOrder: 2,
    },
    {
      group: 'notifications',
      key: 'push_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل الإشعارات الفورية',
      labelEn: 'Enable Push Notifications',
      isPublic: false,
      sortOrder: 3,
    },
    {
      group: 'notifications',
      key: 'whatsapp_enabled',
      value: false,
      type: 'boolean',
      labelAr: 'تفعيل واتساب',
      labelEn: 'Enable WhatsApp',
      isPublic: false,
      sortOrder: 4,
    },
    // ─── الأمان ───
    {
      group: 'security',
      key: 'max_login_attempts',
      value: 5,
      type: 'integer',
      labelAr: 'أقصى محاولات تسجيل الدخول',
      labelEn: 'Max Login Attempts',
      isPublic: false,
      sortOrder: 1,
    },
    {
      group: 'security',
      key: 'session_timeout_minutes',
      value: 60,
      type: 'integer',
      labelAr: 'انتهاء الجلسة (دقيقة)',
      labelEn: 'Session Timeout (minutes)',
      isPublic: false,
      sortOrder: 2,
    },
    {
      group: 'security',
      key: 'password_min_length',
      value: 8,
      type: 'integer',
      labelAr: 'أدنى طول لكلمة المرور',
      labelEn: 'Minimum Password Length',
      isPublic: false,
      sortOrder: 3,
    },
    {
      group: 'security',
      key: 'audit_log_retention_days',
      value: 365,
      type: 'integer',
      labelAr: 'مدة الاحتفاظ بسجلات التدقيق (يوم)',
      labelEn: 'Audit Log Retention (days)',
      isPublic: false,
      sortOrder: 4,
    },
  ];

  let inserted = 0;
  for (const setting of defaults) {
    const exists = await GlobalSetting.findOne({ key: setting.key });
    if (!exists) {
      await GlobalSetting.create(setting);
      inserted++;
    }
  }

  if (inserted > 0) {
    logger.info(`[SettingsService] Seeded ${inserted} default settings`);
  }

  return inserted;
}

module.exports = {
  get,
  set,
  getGroup,
  getAllGroups,
  updateBulk,
  resetBranchSetting,
  clearCache,
  getPublicSettings,
  seedDefaultSettings,
};
