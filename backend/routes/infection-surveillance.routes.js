'use strict';

/**
 * infection-surveillance.routes.js — Wave 1042.
 *
 * IPC case-surveillance admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?infection-surveillance.
 *
 * Endpoints:
 *   GET    /active                   — live cases cohort (suspected/confirmed) — the line-list
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary case history
 *   GET    /stats                    — category + status distribution + active/excluded/reported counts
 *   GET    /:id
 *   POST   /                         — open a case
 *   POST   /:id/resolve              — resolve the case (sets resolutionDate)
 *   POST   /:id/report-authority     — mark reported to the health authority (MOH)
 *   PATCH  /:id                      — update (blocked once resolved)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const InfectionSurveillanceCase = require('../models/InfectionSurveillanceCase');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'nurse',
  'infection_control',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'nurse',
  'infection_control',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { CATEGORIES, CASE_STATUSES, PRECAUTION_TYPES } = InfectionSurveillanceCase;
const ACTIVE_STATUSES = ['suspected', 'confirmed'];

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
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

// ── GET /active — line-list of live cases ─────────────────────────────
router.get('/active', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), caseStatus: { $in: ACTIVE_STATUSES } };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    if (req.query.outbreakId) filter.outbreakId = String(req.query.outbreakId);
    const raw = await InfectionSurveillanceCase.find(filter).sort({ date: -1 }).limit(500).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'ipc.active');
  }
});

// ── GET / — list ──────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    if (req.query.caseStatus && CASE_STATUSES.includes(String(req.query.caseStatus))) {
      filter.caseStatus = String(req.query.caseStatus);
    }
    if (req.query.outbreakId) filter.outbreakId = String(req.query.outbreakId);
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      InfectionSurveillanceCase.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      InfectionSurveillanceCase.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'ipc.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await InfectionSurveillanceCase.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    const activeCount = items.filter(r => ACTIVE_STATUSES.includes(r.caseStatus)).length;
    res.json({ success: true, items, count: items.length, activeCount });
  } catch (err) {
    return safeError(res, err, 'ipc.byBeneficiary');
  }
});

// ── GET /stats ────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), date: { $gte: from, $lte: to } };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await InfectionSurveillanceCase.find(filter)
      .select('category caseStatus excludedFromCenter exclusionEnd reportedToAuthority')
      .lean();
    const byCategory = CATEGORIES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    const byStatus = CASE_STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let active = 0;
    let excluded = 0;
    let reported = 0;
    const now = Date.now();
    for (const r of raw) {
      if (r.category) byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      if (r.caseStatus) byStatus[r.caseStatus] = (byStatus[r.caseStatus] || 0) + 1;
      if (ACTIVE_STATUSES.includes(r.caseStatus)) active++;
      if (r.excludedFromCenter && (!r.exclusionEnd || new Date(r.exclusionEnd).getTime() > now))
        excluded++;
      if (r.reportedToAuthority) reported++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      active,
      currentlyExcluded: excluded,
      reportedToAuthority: reported,
      byCategory,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'ipc.stats');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InfectionSurveillanceCase.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'ipc.get');
  }
});

// ── POST / — open a case ──────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!CATEGORIES.includes(String(body.category))) {
      return res
        .status(400)
        .json({ success: false, message: `category يجب أن يكون: ${CATEGORIES.join(' | ')}` });
    }
    const doc = await InfectionSurveillanceCase.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      date: body.date ? new Date(body.date) : new Date(),
      onsetDate: body.onsetDate ? new Date(body.onsetDate) : null,
      category: String(body.category),
      pathogen: String(body.pathogen || '').slice(0, 120),
      symptoms: Array.isArray(body.symptoms)
        ? body.symptoms.slice(0, 30).map(s => String(s).slice(0, 80))
        : [],
      caseStatus: CASE_STATUSES.includes(String(body.caseStatus))
        ? String(body.caseStatus)
        : 'suspected',
      labConfirmed: !!body.labConfirmed,
      labResult: String(body.labResult || '').slice(0, 300),
      isolationRequired: !!body.isolationRequired,
      precautionType: PRECAUTION_TYPES.includes(String(body.precautionType))
        ? String(body.precautionType)
        : 'none',
      excludedFromCenter: !!body.excludedFromCenter,
      exclusionStart: body.exclusionStart ? new Date(body.exclusionStart) : null,
      exclusionEnd: body.exclusionEnd ? new Date(body.exclusionEnd) : null,
      isNotifiable: !!body.isNotifiable,
      reportedToAuthority: !!body.reportedToAuthority,
      authorityReportDate: body.authorityReportDate ? new Date(body.authorityReportDate) : null,
      authorityReference: String(body.authorityReference || '').slice(0, 100),
      outbreakId: String(body.outbreakId || '').slice(0, 60),
      notes: String(body.notes || '').slice(0, 1000),
      enteredBy: req.user?.id || null,
      enteredByName: req.user?.name || String(body.enteredByName || '').slice(0, 100),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'ipc.create');
  }
});

// ── POST /:id/resolve ─────────────────────────────────────────────────
router.post('/:id/resolve', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InfectionSurveillanceCase.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.caseStatus === 'resolved') {
      return res.status(409).json({ success: false, message: 'الحالة محلولة سلفاً' });
    }
    row.caseStatus = 'resolved';
    row.resolutionDate = req.body?.resolutionDate ? new Date(req.body.resolutionDate) : new Date();
    if (req.body?.exclusionEnd) row.exclusionEnd = new Date(req.body.exclusionEnd);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'ipc.resolve');
  }
});

// ── POST /:id/report-authority ────────────────────────────────────────
router.post('/:id/report-authority', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InfectionSurveillanceCase.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    row.reportedToAuthority = true;
    row.authorityReportDate = req.body?.at ? new Date(req.body.at) : new Date();
    if (req.body?.reference) row.authorityReference = String(req.body.reference).slice(0, 100);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'ipc.reportAuthority');
  }
});

// ── PATCH /:id — update (blocked once resolved) ───────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InfectionSurveillanceCase.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.caseStatus === 'resolved') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل حالة محلولة' });
    }
    const editable = [
      'onsetDate',
      'category',
      'pathogen',
      'symptoms',
      'caseStatus',
      'labConfirmed',
      'labResult',
      'isolationRequired',
      'precautionType',
      'excludedFromCenter',
      'exclusionStart',
      'exclusionEnd',
      'isNotifiable',
      'outbreakId',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'ipc.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InfectionSurveillanceCase.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'ipc.delete');
  }
});

module.exports = router;
