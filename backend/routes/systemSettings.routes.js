/**
 * SystemSettings Routes — مسارات إعدادات النظام
 *
 * ✅ GET  /               — الحصول على الإعدادات الحالية
 * ✅ PUT  /               — تحديث الإعدادات (جزئي)
 * ✅ POST /reset/:section — إعادة تعيين قسم للقيم الافتراضية
 * ✅ POST /maintenance    — تبديل وضع الصيانة
 *
 * 🔐 محمي بالمصادقة + صلاحية admin
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const systemSettingsService = require('../services/systemSettings.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('SystemSettings route error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: safeError(err) });
  }
};

const getUserId = req => req.user?.userId || req.user?._id || req.user?.id;

// ─── Get current settings ────────────────────────────────────────────────────
router.get(
  '/',
  wrap(async () => {
    return systemSettingsService.get();
  })
);

// ─── Update settings (partial) ───────────────────────────────────────────────
router.put(
  '/',
  authorize('admin', 'super_admin'),
  wrap(async req => {
    return systemSettingsService.update(req.body, getUserId(req));
  })
);

// ─── Reset a section to defaults ─────────────────────────────────────────────
router.post(
  '/reset/:section',
  authorize('admin', 'super_admin'),
  wrap(async req => {
    return systemSettingsService.resetSection(req.params.section);
  })
);

// ─── Toggle maintenance mode ─────────────────────────────────────────────────
router.post(
  '/maintenance',
  authorize('admin', 'super_admin'),
  wrap(async req => {
    const { enabled, message } = req.body;
    return systemSettingsService.toggleMaintenance(enabled, message);
  })
);

module.exports = router;
