'use strict';

/**
 * communication-aid.routes.js — Wave 358.
 *
 * AAC profile admin surface. One profile per beneficiary; routes are
 * mostly singleton (find-or-create). Mounted at /api/(v1/)?communication-aid.
 *
 * Endpoints:
 *   GET    /                         — list profiles (paginated)
 *   GET    /by-beneficiary/:id       — singleton profile for one beneficiary
 *   GET    /due-reassessment         — profiles with nextReassessmentDue in past
 *   GET    /stats                    — counts by tier/vocabulary level
 *   GET    /:id
 *   POST   /                         — create profile (errors if dup beneficiary)
 *   POST   /:id/activate             — draft → active (requires primaryModality)
 *   POST   /:id/snapshot             — add history snapshot
 *   POST   /:id/tools                — add tool to activeTools[]
 *   DELETE /:id/tools/:toolId
 *   PATCH  /:id
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Profile = require('../models/CommunicationAidProfile');
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
  'nurse',
  'parent',
  'guardian',
  'quality',
];
// AAC profiles are assessed primarily by SLP / OT / BCBA — write set is
// narrower than the generic clinical write set.
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'therapist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { MODALITIES, VOCABULARY_LEVELS, LIFECYCLE_STATUSES, MODALITY_TIERS } = Profile;

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

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (
      req.query.lifecycleStatus &&
      LIFECYCLE_STATUSES.includes(String(req.query.lifecycleStatus))
    ) {
      filter.lifecycleStatus = String(req.query.lifecycleStatus);
    }
    if (
      req.query.vocabularyLevel &&
      VOCABULARY_LEVELS.includes(String(req.query.vocabularyLevel))
    ) {
      filter.vocabularyLevel = String(req.query.vocabularyLevel);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Profile.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Profile.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'aac.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({
      beneficiaryId: req.params.id,
      ...branchFilter(req), // W445
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'لا يوجد ملف AAC' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'aac.byBeneficiary');
  }
});

// ── GET /due-reassessment ─────────────────────────────────────────────
router.get('/due-reassessment', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W445
      lifecycleStatus: 'active',
      nextReassessmentDue: { $ne: null, $lt: now },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Profile.find(filter).sort({ nextReassessmentDue: 1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'aac.dueReassessment');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Profile.find(filter)
      .select('lifecycleStatus vocabularyLevel activeTools nextReassessmentDue primaryModality')
      .lean();
    const byLifecycle = LIFECYCLE_STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byVocabularyLevel = VOCABULARY_LEVELS.reduce((acc, v) => ((acc[v] = 0), acc), {});
    const byTier = MODALITY_TIERS.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let withHighTech = 0;
    let overdueReassessment = 0;
    const now = Date.now();
    for (const r of raw) {
      byLifecycle[r.lifecycleStatus] = (byLifecycle[r.lifecycleStatus] || 0) + 1;
      byVocabularyLevel[r.vocabularyLevel] = (byVocabularyLevel[r.vocabularyLevel] || 0) + 1;
      const tiers = new Set((r.activeTools || []).map(t => t.tier));
      for (const t of tiers) byTier[t] = (byTier[t] || 0) + 1;
      if (tiers.has('high_tech_aided')) withHighTech++;
      if (
        r.lifecycleStatus === 'active' &&
        r.nextReassessmentDue &&
        new Date(r.nextReassessmentDue).getTime() < now
      ) {
        overdueReassessment++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      byLifecycle,
      byVocabularyLevel,
      byTier,
      withHighTech,
      overdueReassessment,
    });
  } catch (err) {
    return safeError(res, err, 'aac.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W445 */
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'aac.get');
  }
});

// ── POST / — create (errors on dup beneficiaryId per unique index) ────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const existing = await Profile.findOne({
      beneficiaryId: body.beneficiaryId,
      ...branchFilter(req), // W445
    }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'يوجد ملف AAC لهذا المستفيد بالفعل',
        existingProfileId: String(existing._id),
      });
    }
    const doc = await Profile.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      primaryModality: MODALITIES.includes(String(body.primaryModality))
        ? String(body.primaryModality)
        : null,
      activeModalities: Array.isArray(body.activeModalities)
        ? body.activeModalities.filter(m => MODALITIES.includes(String(m)))
        : [],
      vocabularyLevel: VOCABULARY_LEVELS.includes(String(body.vocabularyLevel))
        ? String(body.vocabularyLevel)
        : 'pre_symbolic',
      estimatedActiveVocabularyCount:
        typeof body.estimatedActiveVocabularyCount === 'number'
          ? Math.min(50000, Math.max(0, body.estimatedActiveVocabularyCount))
          : null,
      receptiveLevelDescription: String(body.receptiveLevelDescription || '').slice(0, 500),
      expressiveLevelDescription: String(body.expressiveLevelDescription || '').slice(0, 500),
      trainedPartners: Array.isArray(body.trainedPartners)
        ? body.trainedPartners.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      partnerTrainingNotes: String(body.partnerTrainingNotes || '').slice(0, 1000),
      nextStepGoals: String(body.nextStepGoals || '').slice(0, 1000),
      barriers: Array.isArray(body.barriers)
        ? body.barriers.slice(0, 20).map(s => String(s).slice(0, 200))
        : [],
      usedAtHome: !!body.usedAtHome,
      homeUseNotes: String(body.homeUseNotes || '').slice(0, 500),
      assessedBy: req.user?.id || null,
      assessedByName: req.user?.name || body.assessedByName || '',
      assessedByDiscipline: String(body.assessedByDiscipline || '').slice(0, 50),
      assessedAt: body.assessedAt ? new Date(body.assessedAt) : null,
      nextReassessmentDue: body.nextReassessmentDue ? new Date(body.nextReassessmentDue) : null,
      notes: String(body.notes || '').slice(0, 2000),
      lifecycleStatus: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'aac.create');
  }
});

// ── POST /:id/activate ────────────────────────────────────────────────
router.post('/:id/activate', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    if (row.lifecycleStatus !== 'draft' && row.lifecycleStatus !== 'paused') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن التفعيل من حالة ' + row.lifecycleStatus });
    }
    if (!row.primaryModality) {
      return res.status(400).json({
        success: false,
        message: 'primaryModality مطلوب للتفعيل',
      });
    }
    if (!Array.isArray(row.activeModalities) || row.activeModalities.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'يجب تحديد modality واحد على الأقل قبل التفعيل' });
    }
    row.lifecycleStatus = 'active';
    if (!row.assessedAt) row.assessedAt = new Date();
    if (!row.assessedBy) row.assessedBy = req.user?.id || null;
    if (!row.assessedByName) row.assessedByName = req.user?.name || '';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'aac.activate');
  }
});

// ── POST /:id/snapshot — append history entry ─────────────────────────
router.post('/:id/snapshot', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    row.history.push({
      snapshotAt: new Date(),
      snapshotByUserId: req.user?.id || null,
      snapshotByName: req.user?.name || '',
      activeModalitiesCount: (row.activeModalities || []).length,
      vocabularyLevel: row.vocabularyLevel,
      summary: String(req.body?.summary || '').slice(0, 500),
    });
    // Keep history capped at 50 entries
    if (row.history.length > 50) row.history = row.history.slice(-50);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'aac.snapshot');
  }
});

// ── POST /:id/tools — add tool to activeTools[] ───────────────────────
router.post('/:id/tools', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    const body = req.body || {};
    if (!String(body.name || '').trim()) {
      return res.status(400).json({ success: false, message: 'name مطلوب' });
    }
    if (!MODALITY_TIERS.includes(String(body.tier))) {
      return res
        .status(400)
        .json({ success: false, message: `tier يجب أن يكون: ${MODALITY_TIERS.join(' | ')}` });
    }
    if (!MODALITIES.includes(String(body.modalityKey))) {
      return res.status(400).json({ success: false, message: 'modalityKey غير صالح' });
    }
    row.activeTools.push({
      name: String(body.name).slice(0, 150),
      tier: String(body.tier),
      modalityKey: String(body.modalityKey),
      symbolSet: String(body.symbolSet || 'none'),
      deviceModel: String(body.deviceModel || '').slice(0, 100),
      appVersion: String(body.appVersion || '').slice(0, 50),
      introducedAt: body.introducedAt ? new Date(body.introducedAt) : new Date(),
      independenceLevel: String(body.independenceLevel || 'verbal_prompt'),
      isActive: body.isActive !== false,
      notes: String(body.notes || '').slice(0, 500),
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'aac.addTool');
  }
});

// ── DELETE /:id/tools/:toolId ─────────────────────────────────────────
router.delete('/:id/tools/:toolId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    const before = row.activeTools.length;
    row.activeTools = row.activeTools.filter(t => String(t._id) !== String(req.params.toolId));
    if (row.activeTools.length === before) {
      return res.status(404).json({ success: false, message: 'الأداة غير موجودة' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'aac.removeTool');
  }
});

// ── PATCH /:id — top-level field edits ────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    const editable = [
      'primaryModality',
      'activeModalities',
      'vocabularyLevel',
      'estimatedActiveVocabularyCount',
      'receptiveLevelDescription',
      'expressiveLevelDescription',
      'trainedPartners',
      'partnerTrainingNotes',
      'nextStepGoals',
      'barriers',
      'usedAtHome',
      'homeUseNotes',
      'assessedAt',
      'assessedByDiscipline',
      'nextReassessmentDue',
      'lifecycleStatus',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    if (req.body.assessedAt || req.body.lifecycleStatus) {
      row.assessedBy = req.user?.id || row.assessedBy;
      if (!row.assessedByName) row.assessedByName = req.user?.name || '';
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'aac.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Profile.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'aac.delete');
  }
});

module.exports = router;
