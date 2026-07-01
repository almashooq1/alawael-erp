const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const { validate } = require('../middleware/validate');
const { schemas } = require('../middleware/validationSchemas');
const { SafetyIncident, SafetyInspection } = require('../models/HSE');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// W1604 — SafetyIncident carries `branchId` (pre-save derives it from the reporter's
// User.branchId) but NO query scoped it → cross-branch IDOR read/write of workplace-safety
// incidents (reporter, injury, investigation), and create/update let the caller spoof
// branchId (mis-file into another branch) / forge status / closure. requireBranchAccess does
// NOT auto-filter. These helpers strip the server-controlled fields; branchFilter(req) scopes
// every query. NOTE: SafetyInspection has NO branch field → its routes stay org-wide until a
// schema wave adds one (documented follow-up).
const HSE_IMMUTABLE = ['branchId', 'incidentNumber', 'reportedBy'];
// On create: also block lifecycle/closure fields (a new report starts at the schema default).
const stripIncidentCreate = body => {
  const b = { ...(body || {}) };
  for (const k of [...HSE_IMMUTABLE, 'status', 'closedAt', 'closedBy', 'assignedInvestigator'])
    delete b[k];
  return b;
};
// On update: keep the existing status/closure edit path (no dedicated transition endpoint),
// but never allow re-homing the incident to another branch or rewriting identity fields.
const stripIncidentUpdate = body => {
  const b = stripUpdateMeta(body || {});
  for (const k of HSE_IMMUTABLE) delete b[k];
  return b;
};

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, requireBranchAccess, async (req, res) => {
  try {
    // W1604 — scope SafetyIncident counts/aggregates to the caller's branch. `bf` uses find-
    // shape ({branchId} or {}); `aggBf` casts to ObjectId for aggregate $match (which, unlike
    // find, does NOT auto-cast). SafetyInspection has no branch field → its counts stay global.
    const bf = branchFilter(req);
    const scope = effectiveBranchScope(req);
    const aggBf = scope ? { branchId: new mongoose.Types.ObjectId(String(scope)) } : {};
    const [
      totalIncidents,
      openIncidents,
      investigating,
      closed,
      totalInspections,
      scheduledInspections,
    ] = await Promise.all([
      SafetyIncident.countDocuments({ ...bf }),
      SafetyIncident.countDocuments({ status: 'reported', ...bf }),
      SafetyIncident.countDocuments({ status: 'under_investigation', ...bf }),
      SafetyIncident.countDocuments({ status: 'closed', ...bf }),
      SafetyInspection.countDocuments(),
      SafetyInspection.countDocuments({ status: 'scheduled' }),
    ]);

    const bySeverity = await SafetyIncident.aggregate([
      { $match: aggBf },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const byType = await SafetyIncident.aggregate([
      { $match: aggBf },
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentIncidents = await SafetyIncident.find({ ...bf })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('incidentNumber titleAr incidentType severity status incidentDate')
      .lean();

    res.json({
      success: true,
      data: {
        totalIncidents,
        openIncidents,
        investigating,
        closed,
        totalInspections,
        scheduledInspections,
        bySeverity: bySeverity.map(s => ({ severity: s._id, count: s.count })),
        byType: byType.map(t => ({ type: t._id, count: t.count })),
        recentIncidents,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب بيانات لوحة التحكم', error: safeError(error) });
  }
});

// ── Incidents CRUD ───────────────────────────────────────────────────
router.get('/incidents', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, severity } = req.query;
    const filter = { ...branchFilter(req) }; // W1604 — restricted → own branch only
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const docs = await SafetyIncident.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await SafetyIncident.countDocuments(filter);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    safeError(res, error, 'hse');
  }
});

router.get('/incidents/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    // W1604 — scoped lookup: a foreign-branch incident reads as not-found (no cross-branch IDOR).
    const doc = await SafetyIncident.findOne({ _id: req.params.id, ...branchFilter(req) }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (error) {
    safeError(res, error, 'hse');
  }
});

router.post(
  '/incidents',
  authenticate,
  requireBranchAccess,
  validate(schemas.hse.reportIncident),
  async (req, res) => {
    try {
      // W1604 — strip caller-spoofable branchId/status/closure; branchId derives from the
      // reporter's User.branchId in the model pre-save hook.
      const doc = new SafetyIncident({
        ...stripIncidentCreate(req.body),
        reportedBy: req.user._id || req.user.id,
      });
      await doc.save();
      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إنشاء الحادثة', error: safeError(error) });
    }
  }
);

router.put('/incidents/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    // W1604 — scoped update (foreign branch → not-found) + strip branchId/identity fields so
    // the incident can't be re-homed to another branch.
    const doc = await SafetyIncident.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripIncidentUpdate(req.body),
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث الحادثة', error: safeError(error) });
  }
});

router.delete(
  '/incidents/:id',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'hse_manager'),
  async (req, res) => {
    try {
      // W1604 — scoped delete: a branch-restricted hse_manager can't delete another branch's incident.
      const doc = await SafetyIncident.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!doc) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
      res.json({ success: true, message: 'تم حذف الحادثة بنجاح' });
    } catch (error) {
      safeError(res, error, 'hse');
    }
  }
);

// ── Inspections CRUD ─────────────────────────────────────────────────
router.get('/inspections', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const docs = await SafetyInspection.find(filter)
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await SafetyInspection.countDocuments(filter);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    safeError(res, error, 'hse');
  }
});

router.post('/inspections', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const doc = new SafetyInspection({ ...req.body, inspector: req.user._id || req.user.id });
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء التفتيش', error: safeError(error) });
  }
});

router.put('/inspections/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const doc = await SafetyInspection.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'التفتيش غير موجود' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث التفتيش', error: safeError(error) });
  }
});

router.delete(
  '/inspections/:id',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'hse_manager'),
  async (req, res) => {
    try {
      const doc = await SafetyInspection.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'التفتيش غير موجود' });
      res.json({ success: true, message: 'تم حذف التفتيش بنجاح' });
    } catch (error) {
      safeError(res, error, 'hse');
    }
  }
);

module.exports = router;
