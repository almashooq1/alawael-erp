'use strict';

/**
 * pressure-injury.routes.js — Wave 1011.
 *
 * Pressure-injury / skin-integrity register admin surface. Mounted via
 * dualMountAuth at /api/(v1/)?pressure-injury.
 *
 * Endpoints:
 *   GET    /active                   — open injuries cohort (active/monitoring/healing)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history + open count
 *   GET    /stats                    — staging + origin (HAPI) distribution
 *   GET    /due                      — overdue + upcoming reassessments
 *   GET    /:id
 *   POST   /                         — register an injury (server derives Braden risk)
 *   POST   /:id/reassessment         — append a reassessment (stage/measurement/status update)
 *   POST   /:id/resolve              — mark healed/closed (sets healedAt)
 *   PATCH  /:id                      — correct (only while not closed)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const PressureInjuryRecord = require('../models/PressureInjuryRecord');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// Branch-scope every endpoint (W269/W445). Model carries `branchId`; all
// list filters + instance loads flow through branchFilter so cross-tenant
// IDOR is closed by construction.
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
  'therapist',
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
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  STAGES,
  ORIGINS,
  BODY_SITES,
  EXUDATE_LEVELS,
  EXUDATE_TYPES,
  STATUSES,
  OFFLOADING_ORDERS,
  computeBradenRisk,
} = PressureInjuryRecord;

const OPEN_STATUSES = ['active', 'monitoring', 'healing'];

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

function sanitizeStrings(arr, max, len) {
  return Array.isArray(arr) ? arr.slice(0, max).map(s => String(s).slice(0, len)) : [];
}

// ── GET /active — open injuries cohort ────────────────────────────────
router.get('/active', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), status: { $in: OPEN_STATUSES } };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await PressureInjuryRecord.find(filter).sort({ stage: -1, date: 1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.active');
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
    if (req.query.stage && STAGES.includes(String(req.query.stage))) {
      filter.stage = String(req.query.stage);
    }
    if (req.query.origin && ORIGINS.includes(String(req.query.origin))) {
      filter.origin = String(req.query.origin);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      PressureInjuryRecord.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      PressureInjuryRecord.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await PressureInjuryRecord.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    const openCount = items.filter(r => OPEN_STATUSES.includes(r.status)).length;
    res.json({ success: true, items, count: items.length, openCount });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.byBeneficiary');
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
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await PressureInjuryRecord.find(filter).select('stage origin status').lean();
    const byStage = STAGES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byOrigin = ORIGINS.reduce((acc, o) => ((acc[o] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let facilityAcquired = 0;
    let open = 0;
    for (const r of raw) {
      if (r.stage) byStage[r.stage] = (byStage[r.stage] || 0) + 1;
      if (r.origin) byOrigin[r.origin] = (byOrigin[r.origin] || 0) + 1;
      if (r.status) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.origin === 'facility_acquired') facilityAcquired++;
      if (OPEN_STATUSES.includes(r.status)) open++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      open,
      facilityAcquired, // HAPI count — accreditation quality metric
      hapiRate: raw.length ? Math.round((facilityAcquired / raw.length) * 1000) / 10 : 0,
      byStage,
      byOrigin,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.stats');
  }
});

// ── GET /due — overdue + upcoming reassessments ───────────────────────
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const windowDays = Math.min(180, Math.max(1, parseInt(req.query.days, 10) || 7));
    const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const base = {
      ...branchFilter(req),
      status: { $in: OPEN_STATUSES },
      nextReviewDue: { $ne: null, $lte: horizon },
    };
    const raw = await PressureInjuryRecord.find(base).sort({ nextReviewDue: 1 }).limit(300).lean();
    const overdue = [];
    const upcoming = [];
    for (const r of raw) {
      (new Date(r.nextReviewDue) < now ? overdue : upcoming).push(r);
    }
    const [hydOverdue, hydUpcoming] = await Promise.all([hydrate(overdue), hydrate(upcoming)]);
    res.json({
      success: true,
      overdue: hydOverdue,
      upcoming: hydUpcoming,
      overdueCount: hydOverdue.length,
      upcomingCount: hydUpcoming.length,
      windowDays,
    });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.due');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PressureInjuryRecord.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.get');
  }
});

// ── POST / — register an injury ───────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!BODY_SITES.includes(String(body.bodySite))) {
      return res
        .status(400)
        .json({ success: false, message: `bodySite يجب أن يكون: ${BODY_SITES.join(' | ')}` });
    }
    if (!STAGES.includes(String(body.stage))) {
      return res
        .status(400)
        .json({ success: false, message: `stage يجب أن يكون: ${STAGES.join(' | ')}` });
    }
    const bradenScore =
      typeof body.bradenScore === 'number' && body.bradenScore >= 6 && body.bradenScore <= 23
        ? Math.round(body.bradenScore)
        : null;

    const doc = await PressureInjuryRecord.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      date: body.date ? new Date(body.date) : new Date(),
      bodySite: String(body.bodySite),
      bodySiteOther: String(body.bodySiteOther || '').slice(0, 100),
      stage: String(body.stage),
      medicalDeviceRelated: !!body.medicalDeviceRelated,
      origin: ORIGINS.includes(String(body.origin)) ? String(body.origin) : 'facility_acquired',
      bradenScore,
      bradenRiskLevel: computeBradenRisk(bradenScore),
      lengthCm: typeof body.lengthCm === 'number' ? body.lengthCm : null,
      widthCm: typeof body.widthCm === 'number' ? body.widthCm : null,
      depthCm: typeof body.depthCm === 'number' ? body.depthCm : null,
      woundBed: sanitizeStrings(body.woundBed, 10, 50),
      exudateLevel: EXUDATE_LEVELS.includes(String(body.exudateLevel))
        ? String(body.exudateLevel)
        : 'none',
      exudateType: EXUDATE_TYPES.includes(String(body.exudateType))
        ? String(body.exudateType)
        : 'none',
      infectionSigns: !!body.infectionSigns,
      infectionAction: String(body.infectionAction || '').slice(0, 300),
      painLevel:
        typeof body.painLevel === 'number' && body.painLevel >= 0 && body.painLevel <= 10
          ? body.painLevel
          : null,
      offloadingOrders: Array.isArray(body.offloadingOrders)
        ? body.offloadingOrders.map(s => String(s)).filter(s => OFFLOADING_ORDERS.includes(s))
        : [],
      dressingType: String(body.dressingType || '').slice(0, 120),
      repositioningFrequencyHours:
        typeof body.repositioningFrequencyHours === 'number'
          ? Math.min(24, Math.max(0, body.repositioningFrequencyHours))
          : null,
      status: STATUSES.includes(String(body.status)) ? String(body.status) : 'active',
      nextReviewDue: body.nextReviewDue ? new Date(body.nextReviewDue) : null,
      healedAt: body.healedAt ? new Date(body.healedAt) : null,
      notes: String(body.notes || '').slice(0, 1000),
      identifiedBy: req.user?.id || null,
      identifiedByName: req.user?.name || String(body.identifiedByName || '').slice(0, 100),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.create');
  }
});

// ── POST /:id/reassessment — append a reassessment ────────────────────
router.post('/:id/reassessment', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PressureInjuryRecord.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'closed') {
      return res.status(409).json({ success: false, message: 'السجل مغلق' });
    }
    const b = req.body || {};
    const entry = {
      date: b.date ? new Date(b.date) : new Date(),
      stage: STAGES.includes(String(b.stage)) ? String(b.stage) : row.stage,
      lengthCm: typeof b.lengthCm === 'number' ? b.lengthCm : null,
      widthCm: typeof b.widthCm === 'number' ? b.widthCm : null,
      depthCm: typeof b.depthCm === 'number' ? b.depthCm : null,
      status: STATUSES.includes(String(b.status)) ? String(b.status) : null,
      note: String(b.note || '').slice(0, 500),
      byName: req.user?.name || String(b.byName || '').slice(0, 100),
    };
    row.reassessments.push(entry);
    // Roll the current snapshot forward from this reassessment.
    if (STAGES.includes(String(b.stage))) row.stage = String(b.stage);
    if (typeof b.lengthCm === 'number') row.lengthCm = b.lengthCm;
    if (typeof b.widthCm === 'number') row.widthCm = b.widthCm;
    if (typeof b.depthCm === 'number') row.depthCm = b.depthCm;
    if (STATUSES.includes(String(b.status))) {
      row.status = String(b.status);
      if ((row.status === 'healed' || row.status === 'closed') && !row.healedAt) {
        row.healedAt = entry.date;
      }
    }
    if (b.nextReviewDue) row.nextReviewDue = new Date(b.nextReviewDue);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.reassessment');
  }
});

// ── POST /:id/resolve — mark healed/closed ────────────────────────────
router.post('/:id/resolve', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PressureInjuryRecord.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'closed') {
      return res.status(409).json({ success: false, message: 'السجل مغلق سلفًا' });
    }
    const target = req.body?.status === 'closed' ? 'closed' : 'healed';
    row.status = target;
    row.healedAt = req.body?.healedAt ? new Date(req.body.healedAt) : new Date();
    if (req.body?.note) {
      row.reassessments.push({
        date: row.healedAt,
        status: target,
        note: String(req.body.note).slice(0, 500),
        byName: req.user?.name || '',
      });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.resolve');
  }
});

// ── PATCH /:id — correct while not closed ─────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PressureInjuryRecord.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'closed') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل سجل مغلق' });
    }
    const editable = [
      'bodySite',
      'bodySiteOther',
      'stage',
      'medicalDeviceRelated',
      'origin',
      'lengthCm',
      'widthCm',
      'depthCm',
      'woundBed',
      'exudateLevel',
      'exudateType',
      'infectionSigns',
      'infectionAction',
      'painLevel',
      'offloadingOrders',
      'dressingType',
      'repositioningFrequencyHours',
      'status',
      'nextReviewDue',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    if ('bradenScore' in req.body) {
      const bs =
        typeof req.body.bradenScore === 'number' &&
        req.body.bradenScore >= 6 &&
        req.body.bradenScore <= 23
          ? Math.round(req.body.bradenScore)
          : null;
      row.bradenScore = bs;
      row.bradenRiskLevel = computeBradenRisk(bs);
    }
    if ((row.status === 'healed' || row.status === 'closed') && !row.healedAt) {
      row.healedAt = new Date();
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PressureInjuryRecord.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'pressureInjury.delete');
  }
});

module.exports = router;
