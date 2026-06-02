'use strict';

/**
 * safeguarding.routes.js — Wave 357.
 *
 * Safeguarding concern intake-to-closure admin surface. Mounted via
 * dualMountAuth at /api/(v1/)?safeguarding.
 *
 * Role restrictions are tighter than other clinical-event routes:
 *   • READ: safeguarding_lead + clinical_supervisor + branch_manager + admin
 *     (NOT therapist/teacher/nurse — concerns are restricted by default).
 *   • INTAKE write: any staff (any role) — encouraging reporting.
 *   • TRIAGE/INVESTIGATE/CLOSE: safeguarding_lead + clinical_supervisor + branch_manager + admin.
 *
 * Endpoints:
 *   GET    /open                     — active concerns
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-subject/:id           — concerns about a beneficiary
 *   GET    /stats                    — counts by category/severity/status
 *   GET    /:id
 *   POST   /                         — intake
 *   POST   /:id/triage
 *   POST   /:id/investigate          — start investigation
 *   POST   /:id/substantiate         — outcome (substantiated/unsubstantiated)
 *   POST   /:id/notify-authority     — record external referral
 *   POST   /:id/close
 *   PATCH  /:id                      — corrections (blocked once closed)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Concern = require('../models/SafeguardingConcern');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

router.use(authenticateToken);
// W444: branch-scope every safeguarding endpoint. Pre-W444 the model
// carried `branchId` but routes filtered only optionally and instance
// loads had zero branch check. Cross-tenant safeguarding leakage is
// especially severe — concern records contain child-protection
// allegations + alleged-perpetrator names + witness lists. A
// safeguarding_lead in branch A could read or modify branch B's
// active investigations by guessing IDs.
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'safeguarding_lead',
  'quality',
];
// Intake is intentionally permissive — encouraging staff to report.
const INTAKE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'safeguarding_lead',
  'therapist',
  'teacher',
  'nurse',
  'quality',
];
const INVESTIGATE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'safeguarding_lead',
];
const CLOSE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'safeguarding_lead',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  CATEGORIES,
  SEVERITY,
  STATUSES,
  OUTCOMES,
  SUBJECT_KINDS,
  NOTIFICATION_METHODS: _NOTIFICATION_METHODS,
} = Concern;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.subjectBeneficiaryId)).filter(Boolean))].filter(
    id => mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({
    ...r,
    subjectBeneficiary: map.get(String(r.subjectBeneficiaryId)) || null,
  }));
}

// ── GET /open ─────────────────────────────────────────────────────────
router.get('/open', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req), // W444
      status: { $nin: ['closed', 'unsubstantiated'] },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Concern.find(filter).sort({ reportedAt: -1 }).lean();
    const items = await hydrate(raw);
    // Count critical-awaiting-supervisor breaches for ops dashboard
    let criticalAwaitingSupervisor = 0;
    for (const r of raw) {
      if (r.severity === 'critical' && !r.supervisorNotifiedAt) {
        criticalAwaitingSupervisor++;
      }
    }
    res.json({ success: true, items, count: items.length, criticalAwaitingSupervisor });
  } catch (err) {
    return safeError(res, err, 'safeguarding.open');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; // W444
    if (
      req.query.subjectBeneficiaryId &&
      mongoose.isValidObjectId(req.query.subjectBeneficiaryId)
    ) {
      filter.subjectBeneficiaryId = req.query.subjectBeneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    if (req.query.severity && SEVERITY.includes(String(req.query.severity))) {
      filter.severity = String(req.query.severity);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.reportedAt = {};
      if (req.query.from) filter.reportedAt.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.reportedAt.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Concern.find(filter)
        .sort({ reportedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Concern.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'safeguarding.list');
  }
});

// ── GET /by-subject/:id ────────────────────────────────────────────────
router.get('/by-subject/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Concern.find({
      subjectBeneficiaryId: req.params.id,
      ...branchFilter(req), // W444
    })
      .sort({ reportedAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'safeguarding.bySubject');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W444
      reportedAt: { $gte: from, $lte: to },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Concern.find(filter)
      .select('category severity status authorityReported reportedAt supervisorNotifiedAt')
      .lean();
    const byCategory = CATEGORIES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    const bySeverity = SEVERITY.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let authorityReportedCount = 0;
    let criticalSlaBreaches = 0;
    for (const r of raw) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.authorityReported) authorityReportedCount++;
      if (r.severity === 'critical') {
        if (!r.supervisorNotifiedAt) criticalSlaBreaches++;
        else if (new Date(r.supervisorNotifiedAt) - new Date(r.reportedAt) > 60 * 60 * 1000) {
          criticalSlaBreaches++;
        }
      }
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byCategory,
      bySeverity,
      byStatus,
      authorityReportedCount,
      criticalSlaBreaches,
    });
  } catch (err) {
    return safeError(res, err, 'safeguarding.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }).lean(); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'safeguarding.get');
  }
});

// ── POST / — intake ───────────────────────────────────────────────────
router.post('/', requireRole(INTAKE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!SUBJECT_KINDS.includes(String(body.subjectKind))) {
      return res.status(400).json({
        success: false,
        message: `subjectKind يجب أن يكون: ${SUBJECT_KINDS.join(' | ')}`,
      });
    }
    if (
      body.subjectKind === 'beneficiary' &&
      (!body.subjectBeneficiaryId || !mongoose.isValidObjectId(body.subjectBeneficiaryId))
    ) {
      return res.status(400).json({
        success: false,
        message: 'subjectBeneficiaryId مطلوب عند subjectKind=beneficiary',
      });
    }
    if (!CATEGORIES.includes(String(body.category))) {
      return res.status(400).json({
        success: false,
        message: `الفئة يجب أن تكون: ${CATEGORIES.join(' | ')}`,
      });
    }
    if (!String(body.description || '').trim()) {
      return res.status(400).json({ success: false, message: 'وصف البلاغ مطلوب' });
    }

    const doc = await Concern.create({
      subjectKind: body.subjectKind,
      subjectBeneficiaryId:
        body.subjectBeneficiaryId && mongoose.isValidObjectId(body.subjectBeneficiaryId)
          ? body.subjectBeneficiaryId
          : null,
      subjectName: String(body.subjectName || '').slice(0, 200),
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      reportedBy: req.user?.id || null,
      reportedByName: req.user?.name || body.reportedByName || '',
      reportedByRole: req.user?.role || body.reportedByRole || '',
      reportedAt: new Date(),
      category: body.category,
      severity: SEVERITY.includes(String(body.severity)) ? String(body.severity) : 'medium',
      incidentDate: body.incidentDate ? new Date(body.incidentDate) : null,
      incidentLocation: String(body.incidentLocation || '').slice(0, 200),
      description: String(body.description).slice(0, 3000),
      witnesses: Array.isArray(body.witnesses)
        ? body.witnesses.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      physicalSigns: Array.isArray(body.physicalSigns)
        ? body.physicalSigns.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      behavioralSigns: Array.isArray(body.behavioralSigns)
        ? body.behavioralSigns.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      allegedAgainstName: String(body.allegedAgainstName || '').slice(0, 200),
      allegedAgainstRelationship: String(body.allegedAgainstRelationship || '').slice(0, 100),
      linkedIncidentId:
        body.linkedIncidentId && mongoose.isValidObjectId(body.linkedIncidentId)
          ? body.linkedIncidentId
          : null,
      // Critical severity sets supervisorNotifiedAt at intake if caller already notified
      supervisorNotifiedAt: body.supervisorNotifiedAt ? new Date(body.supervisorNotifiedAt) : null,
      supervisorName: String(body.supervisorName || '').slice(0, 100),
      confidentiality: body.confidentiality === 'standard' ? 'standard' : 'restricted',
      status: 'reported',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'safeguarding.create');
  }
});

// ── POST /:id/triage ──────────────────────────────────────────────────
router.post('/:id/triage', requireRole(INVESTIGATE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    if (row.status !== 'reported') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن فرز بلاغ بحالة ' + row.status });
    }
    row.triagedAt = new Date();
    row.triagedBy = req.user?.id || null;
    row.triagedByName = req.user?.name || '';
    if (req.body?.triageNotes) row.triageNotes = String(req.body.triageNotes).slice(0, 1000);
    if (req.body?.severity && SEVERITY.includes(String(req.body.severity))) {
      row.severity = String(req.body.severity);
    }
    if (req.body?.supervisorNotifiedAt) {
      row.supervisorNotifiedAt = new Date(req.body.supervisorNotifiedAt);
    } else if (!row.supervisorNotifiedAt) {
      row.supervisorNotifiedAt = new Date();
    }
    if (req.body?.supervisorName)
      row.supervisorName = String(req.body.supervisorName).slice(0, 100);
    row.status = 'triaged';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'safeguarding.triage');
  }
});

// ── POST /:id/investigate ─────────────────────────────────────────────
router.post('/:id/investigate', requireRole(INVESTIGATE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    if (!['reported', 'triaged'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن بدء التحقيق من حالة ' + row.status });
    }
    row.investigatorId =
      req.body?.investigatorId && mongoose.isValidObjectId(req.body.investigatorId)
        ? req.body.investigatorId
        : req.user?.id || null;
    row.investigatorName = req.body?.investigatorName
      ? String(req.body.investigatorName).slice(0, 100)
      : req.user?.name || '';
    row.investigationStartedAt = new Date();
    if (req.body?.investigationNotes) {
      row.investigationNotes = String(req.body.investigationNotes).slice(0, 5000);
    }
    row.status = 'investigating';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'safeguarding.investigate');
  }
});

// ── POST /:id/substantiate ────────────────────────────────────────────
router.post('/:id/substantiate', requireRole(INVESTIGATE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    if (row.status !== 'investigating') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إعلان النتيجة قبل بدء التحقيق' });
    }
    const outcome = String(req.body?.outcome || '');
    if (!OUTCOMES.includes(outcome)) {
      return res
        .status(400)
        .json({ success: false, message: `outcome يجب أن يكون: ${OUTCOMES.join(' | ')}` });
    }
    row.outcome = outcome;
    row.outcomeAt = new Date();
    if (req.body?.outcomeSummary) {
      row.outcomeSummary = String(req.body.outcomeSummary).slice(0, 2000);
    }
    if (outcome === 'substantiated') {
      if (!String(req.body?.actionPlan || '').trim()) {
        return res
          .status(400)
          .json({ success: false, message: 'خطة الإجراء (actionPlan) مطلوبة عند الإثبات' });
      }
      row.actionPlan = String(req.body.actionPlan).slice(0, 2000);
      row.status = 'substantiated';
    } else {
      row.status = 'unsubstantiated';
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'safeguarding.substantiate');
  }
});

// ── POST /:id/notify-authority ────────────────────────────────────────
router.post('/:id/notify-authority', requireRole(INVESTIGATE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    if (!String(req.body?.authorityName || '').trim()) {
      return res.status(400).json({ success: false, message: 'authorityName مطلوب' });
    }
    row.authorityReported = true;
    row.authorityName = String(req.body.authorityName).slice(0, 200);
    row.authorityReportedAt = req.body?.at ? new Date(req.body.at) : new Date();
    if (req.body?.authorityReferenceNumber) {
      row.authorityReferenceNumber = String(req.body.authorityReferenceNumber).slice(0, 100);
    }
    row.status = 'escalated_to_authority';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'safeguarding.notifyAuthority');
  }
});

// ── POST /:id/close ───────────────────────────────────────────────────
router.post('/:id/close', requireRole(CLOSE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    if (row.status === 'closed') {
      return res.status(409).json({ success: false, message: 'البلاغ مغلق بالفعل' });
    }
    if (!String(req.body?.outcomeSummary || '').trim()) {
      return res.status(400).json({ success: false, message: 'ملخص النتيجة مطلوب' });
    }
    row.outcomeSummary = String(req.body.outcomeSummary).slice(0, 2000);
    row.closedBy = req.user?.id || null;
    row.closedByName = req.user?.name || String(req.body?.closedByName || '').slice(0, 100);
    row.closedAt = new Date();
    row.status = 'closed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'safeguarding.close');
  }
});

// ── PATCH /:id — corrections while not closed ─────────────────────────
router.patch('/:id', requireRole(INVESTIGATE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Concern.findOne({ _id: req.params.id, ...branchFilter(req) }); // W444
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    if (row.status === 'closed') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل بلاغ مغلق' });
    }
    const editable = [
      'severity',
      'incidentDate',
      'incidentLocation',
      'description',
      'witnesses',
      'physicalSigns',
      'behavioralSigns',
      'allegedAgainstName',
      'allegedAgainstRelationship',
      'investigationNotes',
      'evidenceRefs',
      'familyNotifiedAt',
      'familyNotificationMethod',
      'supervisorNotifiedAt',
      'supervisorName',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'safeguarding.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    // W444: branch-scoped delete — cross-tenant ID 404s instead of removing wrong row
    const row = await Concern.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'البلاغ غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'safeguarding.delete');
  }
});

module.exports = router;
