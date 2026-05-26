'use strict';

/**
 * caregiver-support-program.routes.js — Wave 384.
 *
 * Graduates `rehabilitation-services/advanced-family-support-service.js`
 * (in-memory `Map` for counselings/caregiverTrainings/supportGroups) into
 * a Mongoose-backed surface. Mounted at /api/(v1/)?caregiver-support.
 *
 * Endpoints (18):
 *   GET    /                              — list w/ filters
 *   GET    /by-beneficiary/:id            — all programs for one beneficiary
 *   GET    /overdue                       — active programs past target date
 *   GET    /stats                         — counts + outcome aggregates
 *   GET    /:id
 *   POST   /                              — create (default status=enrolled)
 *   POST   /:id/start                     — flip enrolled → in_progress
 *   POST   /:id/pause                     — in_progress → paused
 *   POST   /:id/resume                    — paused → in_progress
 *   POST   /:id/complete                  — in_progress → completed
 *   POST   /:id/discontinue               — any → discontinued (reason required)
 *   POST   /:id/sessions                  — append a session
 *   PATCH  /:id/sessions/:sId             — update a session
 *   DELETE /:id/sessions/:sId
 *   POST   /:id/modules                   — add a training module progress entry
 *   PATCH  /:id/modules/:mId              — update module hours / completion
 *   POST   /:id/outcomes                  — record pre/post Zarit + satisfaction
 *   PATCH  /:id                           — limited field edit
 *   DELETE /:id                           — admin only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Program = require('../models/CaregiverSupportProgram');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'social_worker',
  'psychologist',
  'counselor',
  'family_coordinator',
  'parent',
  'guardian',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'social_worker',
  'psychologist',
  'counselor',
  'family_coordinator',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { PROGRAM_TYPES, STATUSES, SESSION_FORMATS, ATTENDANCE_STATUSES } = Program;

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber dateOfBirth')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

function pushHistory(row, toStatus, req, reason) {
  row.history = row.history || [];
  row.history.push({
    at: new Date(),
    fromStatus: row.status,
    toStatus,
    actorId: req.user?.id || null,
    actorName: req.user?.name || '',
    reason: String(reason || '').slice(0, 500),
  });
}

// ── GET / ──────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.programType && PROGRAM_TYPES.includes(String(req.query.programType))) {
      filter.programType = String(req.query.programType);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.assignedCounselorId && mongoose.isValidObjectId(req.query.assignedCounselorId)) {
      filter.assignedCounselorId = req.query.assignedCounselorId;
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Program.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Program.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Program.find({ beneficiaryId: req.params.id })
      .sort({ enrolledAt: -1 })
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.byBeneficiary');
  }
});

// ── GET /overdue ───────────────────────────────────────────────────
router.get('/overdue', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      status: { $in: ['enrolled', 'in_progress'] },
      targetCompletionDate: { $ne: null, $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Program.find(filter).sort({ targetCompletionDate: 1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.overdue');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Program.find(filter)
      .select('programType status outcomes targetCompletionDate')
      .lean();
    const byType = PROGRAM_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let withOutcomeDelta = 0;
    let deltaSum = 0;
    let satCount = 0;
    let satSum = 0;
    let overdueCount = 0;
    const now = Date.now();
    for (const p of raw) {
      byType[p.programType] = (byType[p.programType] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (
        p.outcomes &&
        typeof p.outcomes.preProgramBurdenScore === 'number' &&
        typeof p.outcomes.postProgramBurdenScore === 'number'
      ) {
        withOutcomeDelta++;
        deltaSum += p.outcomes.postProgramBurdenScore - p.outcomes.preProgramBurdenScore;
      }
      if (p.outcomes && typeof p.outcomes.satisfactionScore === 'number') {
        satCount++;
        satSum += p.outcomes.satisfactionScore;
      }
      if (
        (p.status === 'enrolled' || p.status === 'in_progress') &&
        p.targetCompletionDate &&
        new Date(p.targetCompletionDate).getTime() < now
      ) {
        overdueCount++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      byType,
      byStatus,
      averageBurdenScoreDelta: withOutcomeDelta
        ? Math.round((deltaSum / withOutcomeDelta) * 10) / 10
        : null,
      averageSatisfaction: satCount ? Math.round((satSum / satCount) * 10) / 10 : null,
      overdueCount,
    });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.get');
  }
});

// ── POST / ─────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!PROGRAM_TYPES.includes(String(body.programType))) {
      return res.status(400).json({
        success: false,
        message: `programType يجب أن يكون: ${PROGRAM_TYPES.join(' | ')}`,
      });
    }
    const doc = await Program.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      programType: body.programType,
      caregiverGuardianId:
        body.caregiverGuardianId && mongoose.isValidObjectId(body.caregiverGuardianId)
          ? body.caregiverGuardianId
          : null,
      caregiverName: String(body.caregiverName || '').slice(0, 100),
      caregiverRelationship: String(body.caregiverRelationship || '').slice(0, 50),
      caregiverPhone: String(body.caregiverPhone || '').slice(0, 30),
      targetCompletionDate: body.targetCompletionDate ? new Date(body.targetCompletionDate) : null,
      assignedCounselorId:
        body.assignedCounselorId && mongoose.isValidObjectId(body.assignedCounselorId)
          ? body.assignedCounselorId
          : null,
      assignedCounselorName: String(body.assignedCounselorName || '').slice(0, 100),
      totalModules:
        typeof body.totalModules === 'number' ? Math.max(0, Math.min(50, body.totalModules)) : 0,
      totalTargetHours:
        typeof body.totalTargetHours === 'number'
          ? Math.max(0, Math.min(500, body.totalTargetHours))
          : 0,
      siblingAgeRange:
        body.siblingAgeRange && typeof body.siblingAgeRange === 'object'
          ? {
              min: typeof body.siblingAgeRange.min === 'number' ? body.siblingAgeRange.min : null,
              max: typeof body.siblingAgeRange.max === 'number' ? body.siblingAgeRange.max : null,
            }
          : { min: null, max: null },
      groupName: String(body.groupName || '').slice(0, 100),
      groupFrequency: String(body.groupFrequency || '').slice(0, 50),
      notes: String(body.notes || '').slice(0, 2000),
      status: 'enrolled',
      enrolledAt: new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.create');
  }
});

// ── POST /:id/start ────────────────────────────────────────────────
router.post('/:id/start', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status !== 'enrolled') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن البدء إلا من حالة enrolled، الحالة الحالية ' + row.status,
      });
    }
    pushHistory(row, 'in_progress', req, req.body?.reason);
    row.status = 'in_progress';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.start');
  }
});

// ── POST /:id/pause ────────────────────────────────────────────────
router.post('/:id/pause', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status !== 'in_progress') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إيقاف برنامج بحالة ' + row.status });
    }
    pushHistory(row, 'paused', req, req.body?.reason);
    row.status = 'paused';
    row.pausedAt = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.pause');
  }
});

// ── POST /:id/resume ───────────────────────────────────────────────
router.post('/:id/resume', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status !== 'paused') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن استئناف برنامج بحالة ' + row.status });
    }
    pushHistory(row, 'in_progress', req, req.body?.reason);
    row.status = 'in_progress';
    row.pausedAt = null;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.resume');
  }
});

// ── POST /:id/complete ─────────────────────────────────────────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status !== 'in_progress') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إكمال برنامج ليس in_progress' });
    }
    pushHistory(row, 'completed', req, req.body?.reason);
    row.status = 'completed';
    row.completedAt = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.complete');
  }
});

// ── POST /:id/discontinue ──────────────────────────────────────────
router.post('/:id/discontinue', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status === 'completed' || row.status === 'discontinued') {
      return res
        .status(409)
        .json({ success: false, message: 'البرنامج منتهٍ بالفعل (' + row.status + ')' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: 'reason مطلوب لإيقاف البرنامج نهائياً' });
    }
    pushHistory(row, 'discontinued', req, reason);
    row.status = 'discontinued';
    row.discontinuedAt = new Date();
    row.discontinuationReason = reason.slice(0, 500);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.discontinue');
  }
});

// ── POST /:id/sessions ─────────────────────────────────────────────
router.post('/:id/sessions', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status === 'discontinued') {
      return res.status(409).json({ success: false, message: 'لا يمكن إضافة جلسات لبرنامج موقوف' });
    }
    const body = req.body || {};
    if (!body.sessionDate) {
      return res.status(400).json({ success: false, message: 'sessionDate مطلوب' });
    }
    if (!SESSION_FORMATS.includes(String(body.format))) {
      return res.status(400).json({
        success: false,
        message: `format يجب أن يكون: ${SESSION_FORMATS.join(' | ')}`,
      });
    }
    const attendees = Array.isArray(body.attendees)
      ? body.attendees.slice(0, 50).map(a => ({
          name: String(a.name || '').slice(0, 100),
          relationship: String(a.relationship || '').slice(0, 50),
        }))
      : [];
    row.sessions.push({
      sessionDate: new Date(body.sessionDate),
      durationMinutes:
        typeof body.durationMinutes === 'number'
          ? Math.max(5, Math.min(480, body.durationMinutes))
          : 60,
      format: String(body.format),
      topic: String(body.topic || '').slice(0, 300),
      facilitatorId:
        body.facilitatorId && mongoose.isValidObjectId(body.facilitatorId)
          ? body.facilitatorId
          : req.user?.id || null,
      facilitatorName: String(body.facilitatorName || req.user?.name || '').slice(0, 100),
      attendanceStatus: ATTENDANCE_STATUSES.includes(String(body.attendanceStatus))
        ? String(body.attendanceStatus)
        : 'attended',
      attendees,
      progressNotes: String(body.progressNotes || '').slice(0, 2000),
      nextSessionDate: body.nextSessionDate ? new Date(body.nextSessionDate) : null,
    });
    // Auto-promote enrolled → in_progress on first session
    if (row.status === 'enrolled') {
      pushHistory(row, 'in_progress', req, 'first session recorded');
      row.status = 'in_progress';
    }
    await row.save();
    res.status(201).json({ success: true, data: row.sessions[row.sessions.length - 1] });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.addSession');
  }
});

// ── PATCH /:id/sessions/:sId ───────────────────────────────────────
router.patch('/:id/sessions/:sId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const s = row.sessions.id(req.params.sId);
    if (!s) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (
      req.body?.attendanceStatus &&
      ATTENDANCE_STATUSES.includes(String(req.body.attendanceStatus))
    ) {
      s.attendanceStatus = String(req.body.attendanceStatus);
    }
    if (req.body?.progressNotes != null) {
      s.progressNotes = String(req.body.progressNotes).slice(0, 2000);
    }
    if (req.body?.topic != null) s.topic = String(req.body.topic).slice(0, 300);
    if (req.body?.nextSessionDate) s.nextSessionDate = new Date(req.body.nextSessionDate);
    if (typeof req.body?.durationMinutes === 'number') {
      s.durationMinutes = Math.max(5, Math.min(480, req.body.durationMinutes));
    }
    await row.save();
    res.json({ success: true, data: s });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.updateSession');
  }
});

// ── DELETE /:id/sessions/:sId ──────────────────────────────────────
router.delete('/:id/sessions/:sId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const before = row.sessions.length;
    row.sessions = row.sessions.filter(s => String(s._id) !== String(req.params.sId));
    if (row.sessions.length === before) {
      return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.deleteSession');
  }
});

// ── POST /:id/modules ──────────────────────────────────────────────
router.post('/:id/modules', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.programType !== 'caregiver_training') {
      return res.status(409).json({
        success: false,
        message: 'modules تُستخدم فقط مع programType=caregiver_training',
      });
    }
    const body = req.body || {};
    if (typeof body.moduleNumber !== 'number' || body.moduleNumber < 1) {
      return res.status(400).json({ success: false, message: 'moduleNumber ≥ 1 مطلوب' });
    }
    if (!String(body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'title مطلوب' });
    }
    row.modulesProgress.push({
      moduleNumber: body.moduleNumber,
      title: String(body.title).slice(0, 200),
      targetHours: typeof body.targetHours === 'number' ? Math.max(0, body.targetHours) : 4,
      hoursCompleted:
        typeof body.hoursCompleted === 'number' ? Math.max(0, body.hoursCompleted) : 0,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      notes: String(body.notes || '').slice(0, 500),
    });
    await row.save();
    res.status(201).json({
      success: true,
      data: row.modulesProgress[row.modulesProgress.length - 1],
    });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.addModule');
  }
});

// ── PATCH /:id/modules/:mId ────────────────────────────────────────
router.patch('/:id/modules/:mId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const m = row.modulesProgress.id(req.params.mId);
    if (!m) return res.status(404).json({ success: false, message: 'الوحدة غير موجودة' });
    if (typeof req.body?.hoursCompleted === 'number') {
      m.hoursCompleted = Math.max(0, req.body.hoursCompleted);
    }
    if (req.body?.completedAt) m.completedAt = new Date(req.body.completedAt);
    if (req.body?.notes != null) m.notes = String(req.body.notes).slice(0, 500);
    await row.save();
    res.json({ success: true, data: m });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.updateModule');
  }
});

// ── POST /:id/outcomes ─────────────────────────────────────────────
router.post('/:id/outcomes', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const body = req.body || {};
    row.outcomes = row.outcomes || {};
    if (typeof body.preProgramBurdenScore === 'number') {
      row.outcomes.preProgramBurdenScore = Math.max(0, Math.min(88, body.preProgramBurdenScore));
    }
    if (typeof body.postProgramBurdenScore === 'number') {
      row.outcomes.postProgramBurdenScore = Math.max(0, Math.min(88, body.postProgramBurdenScore));
    }
    if (typeof body.satisfactionScore === 'number') {
      row.outcomes.satisfactionScore = Math.max(1, Math.min(10, body.satisfactionScore));
    }
    if (body.selfReportedImpact != null) {
      row.outcomes.selfReportedImpact = String(body.selfReportedImpact).slice(0, 1500);
    }
    await row.save();
    res.json({ success: true, data: row.outcomes });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.outcomes');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status === 'completed' || row.status === 'discontinued') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعديل برنامج بحالة ' + row.status });
    }
    const editable = [
      'targetCompletionDate',
      'caregiverName',
      'caregiverRelationship',
      'caregiverPhone',
      'assignedCounselorId',
      'assignedCounselorName',
      'totalModules',
      'totalTargetHours',
      'siblingAgeRange',
      'groupName',
      'groupFrequency',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.patch');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'caregiverSupportProgram.delete');
  }
});

module.exports = router;
