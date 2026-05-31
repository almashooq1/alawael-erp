'use strict';

/**
 * arts-therapy.routes.js — Wave 685.
 *
 * Creative-arts therapy session surface (music/art/drama/dance/play).
 * Mounted via dualMountAuth at /api/(v1/)?arts-therapy.
 *
 * Endpoints (9):
 *   GET    /                  — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id
 *   GET    /stats             — by modality/status + engagement + mood-improved rate
 *   GET    /:id
 *   POST   /                  — create session (scheduled or completed)
 *   POST   /:id/complete      — record outcome (→ completed)
 *   POST   /:id/cancel
 *   PATCH  /:id
 *   DELETE /:id               — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const CreativeArtsTherapySession = require('../models/CreativeArtsTherapySession');
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
  'therapist',
  'art_therapist',
  'music_therapist',
  'psychologist',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'art_therapist',
  'music_therapist',
  'psychologist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { MODALITIES, STATUSES, FORMATS, ENGAGEMENT_LEVELS, MOODS } = CreativeArtsTherapySession;

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

function cleanList(v, max, len) {
  return Array.isArray(v) ? v.slice(0, max).map(s => String(s).slice(0, len)) : [];
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.modality && MODALITIES.includes(String(req.query.modality))) {
      filter.modality = String(req.query.modality);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.sessionDate = {};
      if (req.query.from) filter.sessionDate.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.sessionDate.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      CreativeArtsTherapySession.find(filter)
        .sort({ sessionDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      CreativeArtsTherapySession.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'arts.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await CreativeArtsTherapySession.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ sessionDate: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'arts.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), sessionDate: { $gte: from, $lte: to } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await CreativeArtsTherapySession.find(filter)
      .select('modality status engagementLevel moodBefore moodAfter')
      .lean();
    const MOOD_RANK = CreativeArtsTherapySession.MOOD_RANK;
    const byModality = MODALITIES.reduce((acc, m) => ((acc[m] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let completed = 0;
    let moodMeasured = 0;
    let moodImproved = 0;
    let highEngagement = 0;
    for (const r of raw) {
      byModality[r.modality] = (byModality[r.modality] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === 'completed') completed++;
      if (r.engagementLevel === 'high') highEngagement++;
      if (r.moodBefore && r.moodAfter) {
        moodMeasured++;
        if (MOOD_RANK[r.moodAfter] > MOOD_RANK[r.moodBefore]) moodImproved++;
      }
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      completed,
      highEngagement,
      moodMeasured,
      moodImproved,
      moodImprovedRate: moodMeasured ? Math.round((moodImproved / moodMeasured) * 100) : null,
      byModality,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'arts.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await CreativeArtsTherapySession.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'arts.get');
  }
});

// ── POST / — create session ────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!MODALITIES.includes(String(body.modality))) {
      return res
        .status(400)
        .json({ success: false, message: `النمط يجب أن يكون: ${MODALITIES.join(' | ')}` });
    }
    const format = FORMATS.includes(String(body.format)) ? String(body.format) : 'individual';
    const doc = await CreativeArtsTherapySession.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      therapistId: req.user?.id || null,
      therapistName: req.user?.name || String(body.therapistName || '').slice(0, 100),
      modality: body.modality,
      sessionDate: body.sessionDate ? new Date(body.sessionDate) : new Date(),
      durationMinutes:
        typeof body.durationMinutes === 'number'
          ? Math.min(480, Math.max(0, body.durationMinutes))
          : null,
      format,
      groupSize: format === 'group' && typeof body.groupSize === 'number' ? body.groupSize : null,
      materialsUsed: cleanList(body.materialsUsed, 20, 100),
      interventions: cleanList(body.interventions, 20, 150),
      goalsAddressed: cleanList(body.goalsAddressed, 20, 150),
      engagementLevel: ENGAGEMENT_LEVELS.includes(String(body.engagementLevel))
        ? String(body.engagementLevel)
        : null,
      moodBefore: MOODS.includes(String(body.moodBefore)) ? String(body.moodBefore) : null,
      moodAfter: MOODS.includes(String(body.moodAfter)) ? String(body.moodAfter) : null,
      responseNotes: String(body.responseNotes || '').slice(0, 1000),
      artifactType: ['image', 'audio', 'video', 'none'].includes(String(body.artifactType))
        ? String(body.artifactType)
        : 'none',
      artifactRef: String(body.artifactRef || '').slice(0, 300),
      progressNotes: String(body.progressNotes || '').slice(0, 1000),
      nextSessionDate: body.nextSessionDate ? new Date(body.nextSessionDate) : null,
      status: STATUSES.includes(String(body.status)) ? String(body.status) : 'scheduled',
      notes: String(body.notes || '').slice(0, 1000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'arts.create');
  }
});

// ── POST /:id/complete — record outcome ────────────────────────────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await CreativeArtsTherapySession.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['cancelled', 'completed'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'الجلسة منتهية بالفعل' });
    }
    const b = req.body || {};
    if (ENGAGEMENT_LEVELS.includes(String(b.engagementLevel)))
      row.engagementLevel = String(b.engagementLevel);
    if (MOODS.includes(String(b.moodBefore))) row.moodBefore = String(b.moodBefore);
    if (MOODS.includes(String(b.moodAfter))) row.moodAfter = String(b.moodAfter);
    if (Array.isArray(b.materialsUsed)) row.materialsUsed = cleanList(b.materialsUsed, 20, 100);
    if (Array.isArray(b.interventions)) row.interventions = cleanList(b.interventions, 20, 150);
    if (b.responseNotes != null) row.responseNotes = String(b.responseNotes).slice(0, 1000);
    if (b.progressNotes != null) row.progressNotes = String(b.progressNotes).slice(0, 1000);
    if (['image', 'audio', 'video', 'none'].includes(String(b.artifactType)))
      row.artifactType = String(b.artifactType);
    if (b.artifactRef != null) row.artifactRef = String(b.artifactRef).slice(0, 300);
    if (b.nextSessionDate) row.nextSessionDate = new Date(b.nextSessionDate);
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'arts.complete');
  }
});

// ── POST /:id/cancel ───────────────────────────────────────────────────
router.post('/:id/cancel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.cancelReason || '').slice(0, 300);
    if (!reason.trim()) {
      return res.status(400).json({ success: false, message: 'سبب الإلغاء مطلوب' });
    }
    const row = await CreativeArtsTherapySession.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (row.status === 'completed') {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء جلسة مكتملة' });
    }
    row.status = 'cancelled';
    row.cancelReason = reason;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'arts.cancel');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await CreativeArtsTherapySession.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل جلسة منتهية' });
    }
    const editable = [
      'modality',
      'sessionDate',
      'durationMinutes',
      'format',
      'groupSize',
      'materialsUsed',
      'interventions',
      'goalsAddressed',
      'nextSessionDate',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'arts.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await CreativeArtsTherapySession.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'arts.delete');
  }
});

module.exports = router;
