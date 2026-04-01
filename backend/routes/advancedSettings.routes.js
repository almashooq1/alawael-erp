/**
 * Advanced Settings Routes — مسارات الإعدادات المتقدمة مع Override الفروع
 * البرومبت 24: نظام الإعدادات المركزي
 */

const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const { GlobalSetting } = require('../models/BranchSetting');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// ─── Middleware: يتطلب مصادقة لجميع المسارات ─────────────────────────────────
router.use(auth);

// ─── Helper للتحقق من دور المدير ──────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const adminRoles = ['admin', 'super_admin', 'manager'];
  if (!adminRoles.includes(req.user?.role)) {
    return res
      .status(403)
      .json({
        message: 'غير مصرح — يتطلب صلاحية مدير',
        messageEn: 'Forbidden — admin role required',
      });
  }
  next();
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC — الإعدادات العامة (بدون admin)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/advanced-settings/public
 * الإعدادات المرئية للعموم (center_name, working_hours...)
 */
router.get('/public', async (req, res) => {
  try {
    const branchId = req.query.branch_id || req.user?.branchId || null;
    const settings = await settingsService.getPublicSettings(branchId);
    res.json({ settings });
  } catch (err) {
    logger.error('[AdvancedSettings] GET /public error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — إدارة الإعدادات
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/advanced-settings
 * جلب جميع الإعدادات مجمّعة حسب المجموعة
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const branchId = req.query.branch_id || null;
    const groups = await settingsService.getAllGroups(branchId);
    res.json({ groups, branch_id: branchId });
  } catch (err) {
    logger.error('[AdvancedSettings] GET / error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

/**
 * GET /api/advanced-settings/group/:group
 * جلب إعدادات مجموعة معينة
 */
router.get('/group/:group', requireAdmin, async (req, res) => {
  try {
    const { group } = req.params;
    const branchId = req.query.branch_id || null;
    const settings = await settingsService.getGroup(group, branchId);

    if (!Object.keys(settings).length) {
      return res.status(404).json({ message: `المجموعة "${group}" غير موجودة` });
    }

    res.json({ group, settings, branch_id: branchId });
  } catch (err) {
    logger.error('[AdvancedSettings] GET /group error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

/**
 * GET /api/advanced-settings/:key
 * جلب إعداد واحد بمفتاحه
 */
router.get('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const branchId = req.query.branch_id || null;

    const setting = await GlobalSetting.findOne({ key }).lean();
    if (!setting) {
      return res.status(404).json({ message: `الإعداد "${key}" غير موجود` });
    }

    const value = await settingsService.get(key, null, branchId);
    res.json({ key, value, meta: setting, branch_id: branchId });
  } catch (err) {
    logger.error('[AdvancedSettings] GET /:key error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /api/advanced-settings
 * تحديث مجموعة من الإعدادات دفعة واحدة
 * Body: { settings: { key: value }, branch_id?: string }
 */
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { settings, branch_id } = req.body;

    if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) {
      return res.status(400).json({ message: 'يجب تمرير settings كـ object' });
    }

    // التحقق من وجود المفاتيح
    const keys = Object.keys(settings);
    const existingKeys = await GlobalSetting.find({ key: { $in: keys } })
      .select('key')
      .lean();
    const existingKeyNames = existingKeys.map(k => k.key);
    const unknownKeys = keys.filter(k => !existingKeyNames.includes(k));

    if (unknownKeys.length > 0) {
      return res.status(400).json({
        message: `مفاتيح غير موجودة: ${unknownKeys.join(', ')}`,
        unknownKeys,
      });
    }

    await settingsService.updateBulk(settings, branch_id || null, req.user._id || req.user.id);

    res.json({
      message: 'تم حفظ الإعدادات بنجاح',
      updated: keys.length,
      branch_id: branch_id || null,
    });
  } catch (err) {
    logger.error('[AdvancedSettings] PUT / error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الحفظ', error: err.message });
  }
});

/**
 * PUT /api/advanced-settings/:key
 * تحديث إعداد واحد
 * Body: { value: any, branch_id?: string }
 */
router.put('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, branch_id } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: 'يجب تمرير القيمة value' });
    }

    const exists = await GlobalSetting.findOne({ key });
    if (!exists) {
      return res.status(404).json({ message: `الإعداد "${key}" غير موجود` });
    }

    await settingsService.set(key, value, branch_id || null, req.user._id || req.user.id);

    res.json({
      message: 'تم التحديث بنجاح',
      key,
      value,
      branch_id: branch_id || null,
    });
  } catch (err) {
    logger.error('[AdvancedSettings] PUT /:key error', { error: err.message });
    res.status(500).json({ message: 'خطأ في التحديث' });
  }
});

/**
 * DELETE /api/advanced-settings/branch-override
 * إعادة تعيين إعداد فرع (حذف Override والعودة للقيمة العامة)
 * Body: { key: string, branch_id: string }
 */
router.delete('/branch-override', requireAdmin, async (req, res) => {
  try {
    const { key, branch_id } = req.body;

    if (!key || !branch_id) {
      return res.status(400).json({ message: 'يجب تمرير key و branch_id' });
    }

    await settingsService.resetBranchSetting(key, branch_id);

    res.json({
      message: 'تم إعادة تعيين الإعداد للقيمة العامة',
      key,
      branch_id,
    });
  } catch (err) {
    logger.error('[AdvancedSettings] DELETE /branch-override error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الحذف' });
  }
});

/**
 * POST /api/advanced-settings/cache/clear
 * مسح الكاش (للمدراء)
 */
router.post('/cache/clear', requireAdmin, (req, res) => {
  settingsService.clearCache();
  res.json({ message: 'تم مسح الكاش بنجاح' });
});

/**
 * POST /api/advanced-settings/seed
 * تهيئة الإعدادات الافتراضية
 */
router.post('/seed', requireAdmin, async (req, res) => {
  try {
    const inserted = await settingsService.seedDefaultSettings();
    res.json({
      message: inserted > 0 ? `تم إضافة ${inserted} إعداد افتراضي` : 'جميع الإعدادات موجودة مسبقاً',
      inserted,
    });
  } catch (err) {
    logger.error('[AdvancedSettings] POST /seed error', { error: err.message });
    res.status(500).json({ message: 'خطأ في التهيئة' });
  }
});

/**
 * POST /api/advanced-settings/custom
 * إضافة إعداد مخصص جديد (للمدراء)
 */
router.post('/custom', requireAdmin, async (req, res) => {
  try {
    const { group, key, value, type, labelAr, labelEn, descriptionAr, isPublic, options } =
      req.body;

    if (!group || !key || !labelAr) {
      return res.status(400).json({ message: 'group و key و labelAr مطلوبة' });
    }

    const exists = await GlobalSetting.findOne({ key });
    if (exists) {
      return res.status(409).json({ message: `الإعداد "${key}" موجود مسبقاً` });
    }

    const setting = await GlobalSetting.create({
      group,
      key,
      value: value ?? null,
      type: type || 'string',
      labelAr,
      labelEn: labelEn || labelAr,
      descriptionAr: descriptionAr || '',
      options: options || null,
      isPublic: isPublic ?? false,
    });

    res.status(201).json({
      message: 'تم إضافة الإعداد بنجاح',
      setting,
    });
  } catch (err) {
    logger.error('[AdvancedSettings] POST /custom error', { error: err.message });
    res.status(500).json({ message: 'خطأ في الإضافة', error: err.message });
  }
});

module.exports = router;
