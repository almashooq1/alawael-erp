/**
 * Beneficiary 360° Routes — مسارات لوحة تحكم المستفيد الشاملة
 *
 * @module domains/core/routes/beneficiary360.routes
 */

const express = require('express');
const router = express.Router();
const { beneficiary360Service } = require('../services/beneficiary360.service');

// ── W1146 (W269-class): nested routers do NOT inherit router.param hooks
// from the parent (core.routes.js), so this router wires its own.
const { branchScopedBeneficiaryParam } = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 360° Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /beneficiaries/:beneficiaryId/360
 * لوحة 360° كاملة — جميع الـ widgets
 *
 * Query params:
 *  - role: الدور الوظيفي (لترتيب الأقسام حسب الأولوية)
 *  - widgets: قائمة widgets محددة مفصولة بفاصلة (اختياري)
 *  - timelineLimit: عدد أحداث الخط الزمني (default 20)
 *  - sessionsLimit: عدد الجلسات (default 10)
 */
router.get(
  '/beneficiaries/:beneficiaryId/360',
  asyncHandler(async (req, res) => {
    const options = {
      role: req.query.role || req.user?.role,
      widgets: req.query.widgets ? req.query.widgets.split(',') : undefined,
      timelineLimit: parseInt(req.query.timelineLimit) || 20,
      sessionsLimit: parseInt(req.query.sessionsLimit) || 10,
    };

    const dashboard = await beneficiary360Service.getDashboard(req.params.beneficiaryId, options);
    res.json({ success: true, data: dashboard });
  })
);

/**
 * GET /beneficiaries/:beneficiaryId/360/summary
 * الملخص التنفيذي فقط (خفيف وسريع)
 */
router.get(
  '/beneficiaries/:beneficiaryId/360/summary',
  asyncHandler(async (req, res) => {
    const dashboard = await beneficiary360Service.getDashboard(req.params.beneficiaryId, {
      widgets: ['summary', 'alerts'],
      role: req.query.role || req.user?.role,
    });
    res.json({ success: true, data: dashboard });
  })
);

/**
 * GET /beneficiaries/:beneficiaryId/360/clinical
 * العرض السريري (التقييمات + الأهداف + الخطة + التقدم)
 */
router.get(
  '/beneficiaries/:beneficiaryId/360/clinical',
  asyncHandler(async (req, res) => {
    const dashboard = await beneficiary360Service.getDashboard(req.params.beneficiaryId, {
      widgets: ['summary', 'assessments', 'goals', 'carePlan', 'progress'],
      role: req.query.role || req.user?.role,
    });
    res.json({ success: true, data: dashboard });
  })
);

/**
 * GET /beneficiaries/:beneficiaryId/360/operational
 * العرض التشغيلي (الرحلة + الجلسات + المهام + التنبيهات)
 */
router.get(
  '/beneficiaries/:beneficiaryId/360/operational',
  asyncHandler(async (req, res) => {
    const dashboard = await beneficiary360Service.getDashboard(req.params.beneficiaryId, {
      widgets: ['summary', 'journey', 'sessions', 'alerts'],
      role: req.query.role || req.user?.role,
    });
    res.json({ success: true, data: dashboard });
  })
);

/**
 * GET /beneficiaries/:beneficiaryId/360/family
 * عرض الأسرة (ملخص + أسرة + جلسات + تقدم)
 */
router.get(
  '/beneficiaries/:beneficiaryId/360/family',
  asyncHandler(async (req, res) => {
    const dashboard = await beneficiary360Service.getDashboard(req.params.beneficiaryId, {
      widgets: ['summary', 'family', 'sessions', 'goals', 'progress'],
      role: 'family',
    });
    res.json({ success: true, data: dashboard });
  })
);

/**
 * GET /beneficiaries/:beneficiaryId/360/widget/:widgetName
 * جلب widget واحد فقط
 */
router.get(
  '/beneficiaries/:beneficiaryId/360/widget/:widgetName',
  asyncHandler(async (req, res) => {
    const dashboard = await beneficiary360Service.getDashboard(req.params.beneficiaryId, {
      widgets: [req.params.widgetName],
      role: req.query.role || req.user?.role,
    });
    const widgetData = dashboard[req.params.widgetName];
    if (widgetData === undefined) {
      return res
        .status(400)
        .json({ success: false, message: `Widget غير معروف: ${req.params.widgetName}` });
    }
    res.json({ success: true, data: widgetData });
  })
);

module.exports = router;
