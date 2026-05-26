'use strict';

/**
 * adaptive-sports.routes.js — Wave 362.
 *
 * Graduates the in-memory `rehabilitation-services/adaptive-sports-service.js`
 * scaffold to a Mongoose-backed surface. Mounted at /api/(v1/)?adaptive-sports.
 *
 * Endpoints:
 *   GET    /catalog                — sports/categories/demand enums (read-only)
 *   GET    /                       — list w/ filters
 *   GET    /by-beneficiary/:id
 *   GET    /by-sport/:sport
 *   GET    /stats                  — counts by sport/status + total minutes
 *   GET    /:id
 *   POST   /
 *   POST   /:id/activate           — draft → active (med clearance gated if high)
 *   POST   /:id/complete           — active → completed
 *   POST   /:id/discontinue        — any → discontinued (with reason)
 *   POST   /:id/sessions           — log session
 *   POST   /:id/achievements       — log achievement
 *   POST   /:id/medical-clearance  — record clearance
 *   PATCH  /:id
 *   DELETE /:id/sessions/:sessionId
 *   DELETE /:id/achievements/:achId
 *   DELETE /:id                    — admin
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Program = require('../models/AdaptiveSportsProgram');
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
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'coach',
  'parent',
  'guardian',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'coach',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { SPORTS, CATEGORIES, PHYSICAL_DEMAND, STATUSES, SESSION_TYPES, INDEPENDENCE_LEVELS } =
  Program;

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

// ── GET /catalog ──────────────────────────────────────────────────────
router.get('/catalog', requireRole(READ_ROLES), async (_req, res) => {
  res.json({
    success: true,
    sports: SPORTS,
    categories: CATEGORIES,
    physicalDemand: PHYSICAL_DEMAND,
    statuses: STATUSES,
    sessionTypes: SESSION_TYPES,
    independenceLevels: INDEPENDENCE_LEVELS,
  });
});

// ── GET / ─────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.sport && SPORTS.includes(String(req.query.sport))) {
      filter.sport = String(req.query.sport);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
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
    return safeError(res, err, 'sports.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Program.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ startDate: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'sports.byBeneficiary');
  }
});

// ── GET /by-sport/:sport ──────────────────────────────────────────────
router.get('/by-sport/:sport', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!SPORTS.includes(req.params.sport)) {
      return res.status(404).json({ success: false, message: 'الرياضة غير موجودة في الكتالوج' });
    }
    const filter = { ...branchFilter(req), sport: req.params.sport }; /* W445 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const raw = await Program.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'sports.bySport');
  }
});

// ── GET /stats ────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Program.find(filter).select('sport status sessions achievements').lean();
    const bySport = SPORTS.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let totalSessionMinutes = 0;
    let totalAchievements = 0;
    for (const p of raw) {
      bySport[p.sport] = (bySport[p.sport] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (Array.isArray(p.sessions)) {
        for (const s of p.sessions) {
          if (typeof s.durationMinutes === 'number') totalSessionMinutes += s.durationMinutes;
        }
      }
      if (Array.isArray(p.achievements)) totalAchievements += p.achievements.length;
    }
    res.json({
      success: true,
      total: raw.length,
      bySport,
      byStatus,
      totalSessionMinutes,
      totalAchievements,
    });
  } catch (err) {
    return safeError(res, err, 'sports.stats');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W445 */
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'sports.get');
  }
});

// ── POST / ────────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!SPORTS.includes(String(body.sport))) {
      return res.status(400).json({ success: false, message: 'sport غير صالحة' });
    }
    const doc = await Program.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sport: body.sport,
      sportLabelAr: String(body.sportLabelAr || '').slice(0, 100),
      category: CATEGORIES.includes(String(body.category)) ? String(body.category) : 'individual',
      physicalDemand: PHYSICAL_DEMAND.includes(String(body.physicalDemand))
        ? String(body.physicalDemand)
        : 'moderate',
      targetedDisabilityTypes: Array.isArray(body.targetedDisabilityTypes)
        ? body.targetedDisabilityTypes.slice(0, 10).map(s => String(s).slice(0, 50))
        : [],
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      frequencyPerWeek: typeof body.frequencyPerWeek === 'number' ? body.frequencyPerWeek : null,
      durationMinutesPerSession:
        typeof body.durationMinutesPerSession === 'number' ? body.durationMinutesPerSession : null,
      primaryCoachId:
        body.primaryCoachId && mongoose.isValidObjectId(body.primaryCoachId)
          ? body.primaryCoachId
          : null,
      primaryCoachName: String(body.primaryCoachName || '').slice(0, 100),
      goals: Array.isArray(body.goals)
        ? body.goals.slice(0, 10).map(s => String(s).slice(0, 200))
        : [],
      contraindications: Array.isArray(body.contraindications)
        ? body.contraindications.slice(0, 10).map(s => String(s).slice(0, 200))
        : [],
      equipmentNeeded: Array.isArray(body.equipmentNeeded)
        ? body.equipmentNeeded.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      accommodationsNeeded: Array.isArray(body.accommodationsNeeded)
        ? body.accommodationsNeeded.slice(0, 20).map(s => String(s).slice(0, 200))
        : [],
      familyConsent: !!body.familyConsent,
      medicalClearance: !!body.medicalClearance,
      medicalClearanceBy: String(body.medicalClearanceBy || '').slice(0, 100),
      medicalClearanceAt: body.medicalClearanceAt ? new Date(body.medicalClearanceAt) : null,
      linkedCarePlanVersionId:
        body.linkedCarePlanVersionId && mongoose.isValidObjectId(body.linkedCarePlanVersionId)
          ? body.linkedCarePlanVersionId
          : null,
      status: 'draft',
      notes: String(body.notes || '').slice(0, 2000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'sports.create');
  }
});

// ── POST /:id/activate ────────────────────────────────────────────────
router.post('/:id/activate', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (!['draft', 'paused'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن التفعيل من حالة ' + row.status });
    }
    if (!row.startDate) row.startDate = new Date();
    if (row.physicalDemand === 'high' && !row.medicalClearance) {
      return res.status(400).json({
        success: false,
        message: 'الشهادة الطبية مطلوبة للرياضات عالية الجهد',
      });
    }
    row.status = 'active';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.activate');
  }
});

// ── POST /:id/complete ────────────────────────────────────────────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (row.status !== 'active') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إكمال برنامج بحالة ' + row.status });
    }
    row.endDate = req.body?.endDate ? new Date(req.body.endDate) : new Date();
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.complete');
  }
});

// ── POST /:id/discontinue ─────────────────────────────────────────────
router.post('/:id/discontinue', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'reason مطلوب' });
    }
    row.discontinuationReason = String(req.body.reason).slice(0, 500);
    row.status = 'discontinued';
    if (!row.endDate) row.endDate = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.discontinue');
  }
});

// ── POST /:id/sessions ────────────────────────────────────────────────
router.post('/:id/sessions', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const body = req.body || {};
    if (!body.date) {
      return res.status(400).json({ success: false, message: 'date مطلوب' });
    }
    if (typeof body.durationMinutes !== 'number' || body.durationMinutes < 0) {
      return res.status(400).json({ success: false, message: 'durationMinutes مطلوب' });
    }
    row.sessions.push({
      date: new Date(body.date),
      type: SESSION_TYPES.includes(String(body.type)) ? String(body.type) : 'training',
      durationMinutes: Math.min(480, body.durationMinutes),
      location: String(body.location || '').slice(0, 150),
      coachId: req.user?.id || null,
      coachName: req.user?.name || '',
      participationNotes: String(body.participationNotes || '').slice(0, 500),
      skillsObserved: Array.isArray(body.skillsObserved)
        ? body.skillsObserved.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      independenceLevel: INDEPENDENCE_LEVELS.includes(String(body.independenceLevel))
        ? String(body.independenceLevel)
        : 'moderate_support',
      incidentNotes: String(body.incidentNotes || '').slice(0, 500),
    });
    await row.save();
    const created = row.sessions[row.sessions.length - 1];
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    return safeError(res, err, 'sports.addSession');
  }
});

// ── POST /:id/achievements ────────────────────────────────────────────
router.post('/:id/achievements', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const body = req.body || {};
    if (!String(body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'title مطلوب' });
    }
    row.achievements.push({
      title: String(body.title).slice(0, 200),
      titleAr: String(body.titleAr || '').slice(0, 200),
      earnedAt: body.earnedAt ? new Date(body.earnedAt) : new Date(),
      description: String(body.description || '').slice(0, 500),
      competitionName: String(body.competitionName || '').slice(0, 200),
      placement: String(body.placement || '').slice(0, 50),
    });
    await row.save();
    res.status(201).json({ success: true, data: row.achievements[row.achievements.length - 1] });
  } catch (err) {
    return safeError(res, err, 'sports.addAchievement');
  }
});

// ── POST /:id/medical-clearance ───────────────────────────────────────
router.post('/:id/medical-clearance', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    row.medicalClearance = true;
    row.medicalClearanceBy = String(req.body?.by || req.user?.name || '').slice(0, 100);
    row.medicalClearanceAt = req.body?.at ? new Date(req.body.at) : new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.medicalClearance');
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (['completed', 'discontinued'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعديل برنامج بحالة ' + row.status });
    }
    const editable = [
      'sportLabelAr',
      'category',
      'physicalDemand',
      'targetedDisabilityTypes',
      'startDate',
      'endDate',
      'frequencyPerWeek',
      'durationMinutesPerSession',
      'primaryCoachName',
      'goals',
      'contraindications',
      'equipmentNeeded',
      'accommodationsNeeded',
      'familyConsent',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.patch');
  }
});

// ── DELETE /:id/sessions/:sessionId ───────────────────────────────────
router.delete('/:id/sessions/:sessionId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const before = row.sessions.length;
    row.sessions = row.sessions.filter(s => String(s._id) !== String(req.params.sessionId));
    if (row.sessions.length === before) {
      return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.deleteSession');
  }
});

// ── DELETE /:id/achievements/:achId ───────────────────────────────────
router.delete('/:id/achievements/:achId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    const before = row.achievements.length;
    row.achievements = row.achievements.filter(a => String(a._id) !== String(req.params.achId));
    if (row.achievements.length === before) {
      return res.status(404).json({ success: false, message: 'الإنجاز غير موجود' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sports.deleteAchievement');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Program.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'sports.delete');
  }
});

module.exports = router;
