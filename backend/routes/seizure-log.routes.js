'use strict';

/**
 * seizure-log.routes.js — Wave 356.
 *
 * Seizure log admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?seizure-log.
 *
 * Endpoints:
 *   GET    /today                    — today's events (w/ branch filter)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-kid history (last 100)
 *   GET    /stats                    — frequency analytics for a range
 *   GET    /:id
 *   POST   /                         — record event
 *   POST   /:id/notify-parent
 *   POST   /:id/notify-supervisor
 *   POST   /:id/review               — mark reviewed (immutable after)
 *   PATCH  /:id                      — correct (only while status=recorded)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SeizureEvent = require('../models/SeizureEvent');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// W445: branch-scope every endpoint. Model carries `branchId`; pre-W445
// list filters were optional + instance loads bare findById, opening
// cross-tenant IDOR (read/modify/delete any branch by ObjectId guess).
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'nurse',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'nurse',
];
const REVIEW_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TYPES, CONSCIOUSNESS_LEVELS, SEVERITY, STATUSES, NOTIFICATION_METHODS } = SeizureEvent;

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

// ── GET /today ────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: startOfDay(d), $lte: endOfDay(d) },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SeizureEvent.find(filter).sort({ startTime: -1 }).lean();
    const items = await hydrate(raw);
    const summary = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let injuries = 0;
    let ambulanceCount = 0;
    let statusEpilepticusCandidates = 0;
    for (const r of raw) {
      summary[r.type] = (summary[r.type] || 0) + 1;
      if (r.injury) injuries++;
      if (r.ambulanceCalled) ambulanceCount++;
      if (typeof r.durationSeconds === 'number' && r.durationSeconds >= 300) {
        statusEpilepticusCandidates++;
      }
    }
    res.json({
      success: true,
      items,
      count: items.length,
      summary,
      injuries,
      ambulanceCount,
      statusEpilepticusCandidates,
      date: startOfDay(d),
    });
  } catch (err) {
    return safeError(res, err, 'seizure.today');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.type && TYPES.includes(String(req.query.type))) {
      filter.type = String(req.query.type);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.severity && SEVERITY.includes(String(req.query.severity))) {
      filter.severity = String(req.query.severity);
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      SeizureEvent.find(filter)
        .sort({ startTime: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SeizureEvent.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'seizure.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SeizureEvent.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ startTime: -1 })
      .limit(100)
      .lean();
    // Compute time-since-last + frequency window
    const lastStart = items[0]?.startTime ? new Date(items[0].startTime) : null;
    const daysSinceLast = lastStart
      ? Math.floor((Date.now() - lastStart.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30dCount = items.filter(r => new Date(r.startTime).getTime() >= cutoff30d).length;
    res.json({
      success: true,
      items,
      count: items.length,
      daysSinceLast,
      last30dCount,
    });
  } catch (err) {
    return safeError(res, err, 'seizure.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: from, $lte: to },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await SeizureEvent.find(filter)
      .select('type severity injury ambulanceCalled durationSeconds startTime')
      .lean();
    const byType = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const bySeverity = SEVERITY.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let totalDurationSeconds = 0;
    let measuredDurations = 0;
    let injuries = 0;
    let ambulanceCount = 0;
    let statusEpilepticusCandidates = 0;
    for (const r of raw) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (r.severity) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
      if (typeof r.durationSeconds === 'number') {
        totalDurationSeconds += r.durationSeconds;
        measuredDurations++;
        if (r.durationSeconds >= 300) statusEpilepticusCandidates++;
      }
      if (r.injury) injuries++;
      if (r.ambulanceCalled) ambulanceCount++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byType,
      bySeverity,
      averageDurationSeconds: measuredDurations
        ? Math.round(totalDurationSeconds / measuredDurations)
        : null,
      injuries,
      ambulanceCount,
      statusEpilepticusCandidates,
    });
  } catch (err) {
    return safeError(res, err, 'seizure.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeizureEvent.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W445 */
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'seizure.get');
  }
});

// ── POST / — record event ─────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TYPES.includes(String(body.type))) {
      return res
        .status(400)
        .json({ success: false, message: `النوع يجب أن يكون: ${TYPES.join(' | ')}` });
    }

    const startTime = body.startTime ? new Date(body.startTime) : new Date();
    const endTime = body.endTime ? new Date(body.endTime) : null;
    if (endTime && endTime < startTime) {
      return res
        .status(400)
        .json({ success: false, message: 'وقت النهاية يجب أن يكون بعد البداية' });
    }
    let durationSeconds = null;
    if (typeof body.durationSeconds === 'number' && body.durationSeconds >= 0) {
      durationSeconds = Math.min(7200, body.durationSeconds);
    } else if (endTime) {
      durationSeconds = Math.round((endTime - startTime) / 1000);
    }

    const doc = await SeizureEvent.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      date: startOfDay(startTime),
      startTime,
      endTime,
      durationSeconds,
      type: body.type,
      severity: SEVERITY.includes(String(body.severity)) ? String(body.severity) : 'mild',
      consciousness: CONSCIOUSNESS_LEVELS.includes(String(body.consciousness))
        ? String(body.consciousness)
        : 'aware',
      triggerSuspected: String(body.triggerSuspected || '').slice(0, 300),
      preIctalSigns: Array.isArray(body.preIctalSigns)
        ? body.preIctalSigns.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      ictalSigns: Array.isArray(body.ictalSigns)
        ? body.ictalSigns.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      postIctalState: String(body.postIctalState || '').slice(0, 500),
      recoveryMinutes:
        typeof body.recoveryMinutes === 'number' && body.recoveryMinutes >= 0
          ? Math.min(1440, body.recoveryMinutes)
          : null,
      injury: !!body.injury,
      injuryNotes: String(body.injuryNotes || '').slice(0, 500),
      rescueMedicationGivenName: String(body.rescueMedicationGivenName || '').slice(0, 100),
      rescueMedicationDose: String(body.rescueMedicationDose || '').slice(0, 50),
      rescueMedicationAt: body.rescueMedicationAt ? new Date(body.rescueMedicationAt) : null,
      rescueMedicationMarId:
        body.rescueMedicationMarId && mongoose.isValidObjectId(body.rescueMedicationMarId)
          ? body.rescueMedicationMarId
          : null,
      ambulanceCalled: !!body.ambulanceCalled,
      ambulanceCalledAt: body.ambulanceCalledAt ? new Date(body.ambulanceCalledAt) : null,
      emergencyTransport: !!body.emergencyTransport,
      witnessedBy: req.user?.id || null,
      witnessedByName: req.user?.name || body.witnessedByName || '',
      staffSupporting: Array.isArray(body.staffSupporting)
        ? body.staffSupporting.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      supervisorNotifiedAt: body.supervisorNotifiedAt ? new Date(body.supervisorNotifiedAt) : null,
      supervisorName: String(body.supervisorName || '').slice(0, 100),
      parentNotifiedAt: body.parentNotifiedAt ? new Date(body.parentNotifiedAt) : null,
      parentNotificationMethod: NOTIFICATION_METHODS.includes(String(body.parentNotificationMethod))
        ? String(body.parentNotificationMethod)
        : null,
      notes: String(body.notes || '').slice(0, 1000),
      status: 'recorded',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'seizure.create');
  }
});

// ── POST /:id/notify-parent ───────────────────────────────────────────
router.post('/:id/notify-parent', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeizureEvent.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reviewed') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل سجل تمت مراجعته' });
    }
    row.parentNotifiedAt = req.body?.at ? new Date(req.body.at) : new Date();
    if (NOTIFICATION_METHODS.includes(String(req.body?.method))) {
      row.parentNotificationMethod = String(req.body.method);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seizure.notifyParent');
  }
});

// ── POST /:id/notify-supervisor ───────────────────────────────────────
router.post('/:id/notify-supervisor', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeizureEvent.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reviewed') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل سجل تمت مراجعته' });
    }
    row.supervisorNotifiedAt = req.body?.at ? new Date(req.body.at) : new Date();
    if (req.body?.supervisorName)
      row.supervisorName = String(req.body.supervisorName).slice(0, 100);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seizure.notifySupervisor');
  }
});

// ── POST /:id/review ──────────────────────────────────────────────────
router.post('/:id/review', requireRole(REVIEW_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeizureEvent.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reviewed') {
      return res.status(409).json({ success: false, message: 'السجل سبق وأن تمت مراجعته' });
    }
    row.reviewedBy = req.user?.id || null;
    row.reviewedByName = req.user?.name || String(req.body?.reviewerName || '').slice(0, 100);
    row.reviewedAt = new Date();
    row.status = 'reviewed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seizure.review');
  }
});

// ── PATCH /:id — correct while still 'recorded' ────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeizureEvent.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reviewed') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل سجل تمت مراجعته' });
    }
    const editable = [
      'type',
      'severity',
      'consciousness',
      'endTime',
      'durationSeconds',
      'triggerSuspected',
      'preIctalSigns',
      'ictalSigns',
      'postIctalState',
      'recoveryMinutes',
      'injury',
      'injuryNotes',
      'rescueMedicationGivenName',
      'rescueMedicationDose',
      'rescueMedicationAt',
      'ambulanceCalled',
      'ambulanceCalledAt',
      'emergencyTransport',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seizure.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeizureEvent.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'seizure.delete');
  }
});

module.exports = router;
