/**
 * Enterprise Risk Management Routes — مسارات إدارة المخاطر المؤسسية
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// W465: role gate for enterprise risk register. Pre-W465 every
// POST/PUT/DELETE was open to any authenticated user — any
// therapist/nurse/parent could create/modify/delete enterprise risks
// + risk assessments. Org-level governance, regulator-facing.
const RISK_ROLES = [
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'branch_manager',
  'risk_manager',
  'quality',
  'compliance',
  'compliance_officer',
];
const RISK_READ_ROLES = [...RISK_ROLES, 'clinical_supervisor', 'safety_officer'];

const safeModel = n =>
  mongoose.models[n] ? mongoose.model(n) : require(`../models/EnterpriseRisk`)[n];

// Business-content fields a client may set. riskScore is COMPUTED (probability ×
// impact in the pre('save') hook); branchId/organizationId/createdBy/isDeleted are
// server-controlled — stripUpdateMeta (a prototype-pollution blacklist) didn't
// strip any of these, so a caller could forge riskScore (skewing the top-risk
// ranking) or branchId (relocating a risk to another branch).
const RISK_WRITABLE = [
  'riskCode',
  'titleAr',
  'category',
  'description',
  'probability',
  'impact',
  'priority',
  'status',
  'owner',
  'ownerUserId',
  'reviewDate',
];
const pick = (body, keys) => {
  const out = {};
  const src = body || {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
};

// ── Dashboard ────────────────────────────────────────────────
router.get(
  '/dashboard',
  authenticate,
  requireBranchAccess,
  authorize(RISK_READ_ROLES) /* W465 */,
  async (req, res) => {
    try {
      const Risk = safeModel('EnterpriseRisk');
      const Assessment = safeModel('RiskAssessment');

      // W663 — branch-scope (Risk carries branchId). {} for cross-branch/HQ.
      const _rs = branchFilter(req);
      const [totalRisks, critical, mitigating, assessments] = await Promise.all([
        Risk.countDocuments({ ..._rs }).catch(() => 0),
        Risk.countDocuments({ ..._rs, priority: 'critical' }).catch(() => 0),
        Risk.countDocuments({ ..._rs, status: 'mitigating' }).catch(() => 0),
        Assessment.countDocuments().catch(() => 0),
      ]);
      const byCategory = await Risk.aggregate([
        { $match: { ..._rs } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]).catch(() => []);
      const byStatus = await Risk.aggregate([
        { $match: { ..._rs } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).catch(() => []);
      const byPriority = await Risk.aggregate([
        { $match: { ..._rs } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]).catch(() => []);
      const topRisks = await Risk.find({ ..._rs, priority: { $in: ['critical', 'high'] } })
        .sort({ riskScore: -1 })
        .limit(5)
        .lean()
        .catch(() => []);

      res.json({
        success: true,
        data: {
          summary: {
            totalRisks,
            criticalRisks: critical,
            mitigating,
            totalAssessments: assessments,
          },
          risksByCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
          risksByStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
          risksByPriority: byPriority.map(p => ({ priority: p._id, count: p.count })),
          topRisks,
        },
      });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

// ── Risks CRUD ───────────────────────────────────────────────
router.get(
  '/risks',
  authenticate,
  requireBranchAccess,
  authorize(RISK_READ_ROLES) /* W465 */,
  async (req, res) => {
    try {
      const Risk = safeModel('EnterpriseRisk');
      const { status, category, priority, page = 1, limit = 20 } = req.query;
      const filter = { ...branchFilter(req) }; // branch isolation (EnterpriseRisk has branchId)
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      const skip = (page - 1) * limit;
      const [docs, total] = await Promise.all([
        Risk.find(filter)
          .sort({ riskScore: -1, createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Risk.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: docs,
        pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

router.post(
  '/risks',
  authenticate,
  requireBranchAccess,
  authorize(RISK_ROLES) /* W465 */,
  async (req, res) => {
    try {
      const Risk = safeModel('EnterpriseRisk');
      const doc = await Risk.create({
        ...pick(req.body, RISK_WRITABLE),
        branchId: req.branchScope?.branchId || req.body.branchId || undefined,
        createdBy: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

router.put(
  '/risks/:id',
  authenticate,
  requireBranchAccess,
  authorize(RISK_ROLES) /* W465 */,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      }
      const Risk = safeModel('EnterpriseRisk');
      // branch-scoped load + whitelist + save() so the pre('save') hook recomputes
      // riskScore (findByIdAndUpdate skips it → forged/stale score skews ranking)
      // and the branch can't be re-homed.
      const risk = await Risk.findOne({ _id: req.params.id, ...branchFilter(req) });
      if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
      Object.assign(risk, pick(req.body, RISK_WRITABLE));
      await risk.save();
      res.json({ success: true, data: risk });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

router.delete(
  '/risks/:id',
  authenticate,
  requireBranchAccess,
  authorize(RISK_ROLES) /* W465 */,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      }
      const Risk = safeModel('EnterpriseRisk');
      // branch-scoped + result-checked: was an unscoped hard delete that returned
      // success even when nothing matched → cross-branch destruction of any risk.
      const deleted = await Risk.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
      if (!deleted) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
      res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

// ── Risk Mitigations ─────────────────────────────────────────
router.post(
  '/risks/:id/mitigations',
  authenticate,
  requireBranchAccess,
  authorize(RISK_ROLES) /* W465 */,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      }
      const Risk = safeModel('EnterpriseRisk');
      const risk = await Risk.findOne({ _id: req.params.id, ...branchFilter(req) });
      if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
      risk.mitigations.push(req.body);
      risk.history.push({ action: 'إضافة إجراء تخفيف', user: req.user?._id });
      await risk.save();
      res.status(201).json({ success: true, data: risk });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

// ── Assessments CRUD ─────────────────────────────────────────
router.get(
  '/assessments',
  authenticate,
  requireBranchAccess,
  authorize(RISK_READ_ROLES) /* W465 */,
  async (req, res) => {
    try {
      const Assessment = safeModel('RiskAssessment');
      const docs = await Assessment.find().sort({ assessmentDate: -1 }).limit(200).lean();
      res.json({ success: true, data: docs });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

router.post(
  '/assessments',
  authenticate,
  requireBranchAccess,
  authorize(RISK_ROLES) /* W465 */,
  async (req, res) => {
    try {
      const Assessment = safeModel('RiskAssessment');
      const doc = await Assessment.create({
        ...stripUpdateMeta(req.body),
        createdBy: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

router.put(
  '/assessments/:id',
  authenticate,
  requireBranchAccess,
  authorize(RISK_ROLES) /* W465 */,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      }
      const Assessment = safeModel('RiskAssessment');
      // runValidators so probability/impact (min:0,max:1) + required enums can't be
      // written out of range via this update path.
      const doc = await Assessment.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'enterprise-risk');
    }
  }
);

module.exports = router;
