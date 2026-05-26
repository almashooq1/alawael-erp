'use strict';

/**
 * cbahi.routes.js — Wave 360.
 *
 * CBAHI accreditation registry + attestation surface. Mounted at
 * /api/(v1/)?cbahi.
 *
 * Endpoints (registry — read-only catalog):
 *   GET    /standards                — full catalog of standards
 *   GET    /standards/:key           — single standard detail
 *   GET    /chapters                 — chapter index
 *
 * Endpoints (attestation — per-branch state):
 *   GET    /attestations             — list w/ filters
 *   GET    /attestations/by-branch/:branchId
 *   GET    /attestations/by-standard/:key
 *   GET    /attestations/dashboard   — branch summary score
 *   GET    /attestations/due-reassessment
 *   GET    /attestations/:id
 *   POST   /attestations             — create (errors on dup (branch, standard))
 *   POST   /attestations/:id/attest  — set status + audit fields
 *   POST   /attestations/:id/evidence
 *   DELETE /attestations/:id/evidence/:evidenceId
 *   POST   /attestations/:id/snapshot
 *   PATCH  /attestations/:id
 *   DELETE /attestations/:id         — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Attestation = require('../models/CbahiAttestation');
const registry = require('../intelligence/cbahi-standards.registry');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

router.use(authenticateToken);
// W447: branch-scope every endpoint. Model carries `branchId`; pre-W447
// list filters were optional + instance loads bare findById, opening
// cross-tenant IDOR (read/modify/delete any branch by ObjectId guess).
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'quality',
  'compliance',
];
// CBAHI attestations are quality / compliance work — write set tight
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'quality',
  'compliance',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { STATUSES } = Attestation;

// ─── Registry endpoints (catalog) ────────────────────────────────────

// ── GET /standards ─────────────────────────────────────────────────
router.get('/standards', requireRole(READ_ROLES), async (_req, res) => {
  try {
    res.json({
      success: true,
      total: registry.STANDARDS.length,
      chapters: registry.CHAPTERS,
      standards: registry.STANDARDS,
    });
  } catch (err) {
    return safeError(res, err, 'cbahi.standards');
  }
});

// ── GET /standards/:key ────────────────────────────────────────────
router.get('/standards/:key', requireRole(READ_ROLES), async (req, res) => {
  try {
    const standard = registry.findStandard(String(req.params.key));
    if (!standard) {
      return res.status(404).json({ success: false, message: 'المعيار غير موجود' });
    }
    res.json({ success: true, data: standard });
  } catch (err) {
    return safeError(res, err, 'cbahi.standardGet');
  }
});

// ── GET /chapters ──────────────────────────────────────────────────
router.get('/chapters', requireRole(READ_ROLES), async (_req, res) => {
  try {
    const chapters = registry.CHAPTER_KEYS.map(key => ({
      ...registry.CHAPTERS[key],
      standardCount: registry.listChapter(key).length,
    }));
    res.json({ success: true, chapters });
  } catch (err) {
    return safeError(res, err, 'cbahi.chapters');
  }
});

// ─── Attestation endpoints ───────────────────────────────────────────

// ── GET /attestations ──────────────────────────────────────────────
router.get('/attestations', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W447 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.chapter && registry.CHAPTER_KEYS.includes(String(req.query.chapter))) {
      filter.standardChapter = String(req.query.chapter);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      Attestation.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Attestation.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'cbahi.attestationList');
  }
});

// ── GET /attestations/by-branch/:branchId ──────────────────────────
router.get('/attestations/by-branch/:branchId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.branchId)) {
      return res.status(400).json({ success: false, message: 'معرّف فرع غير صالح' });
    }
    const items = await Attestation.find({
      ...branchFilter(req),
      /* W447 */ branchId: req.params.branchId,
    })
      .sort({ standardChapter: 1, standardCode: 1 })
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'cbahi.byBranch');
  }
});

// ── GET /attestations/by-standard/:key ─────────────────────────────
router.get('/attestations/by-standard/:key', requireRole(READ_ROLES), async (req, res) => {
  try {
    const standard = registry.findStandard(String(req.params.key));
    if (!standard) {
      return res.status(404).json({ success: false, message: 'المعيار غير موجود' });
    }
    const items = await Attestation.find({
      ...branchFilter(req),
      /* W447 */ standardKey: req.params.key,
    })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, standard, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'cbahi.byStandard');
  }
});

// ── GET /attestations/dashboard ────────────────────────────────────
router.get('/attestations/dashboard', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W447 */
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Attestation.find(filter)
      .select('status standardChapter standardKey nextReassessmentDue score')
      .lean();
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byChapter = registry.CHAPTER_KEYS.reduce((acc, c) => {
      acc[c] = { met: 0, partial: 0, not_met: 0, na: 0, draft: 0 };
      return acc;
    }, {});
    let overdueReassessment = 0;
    const coverageDenom = registry.STANDARDS.length;
    const attestedKeys = new Set();
    const now = Date.now();
    for (const a of raw) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      attestedKeys.add(a.standardKey);
      if (a.standardChapter && byChapter[a.standardChapter]) {
        const bucket = byChapter[a.standardChapter];
        if (a.status === 'met') bucket.met++;
        else if (a.status === 'partially_met') bucket.partial++;
        else if (a.status === 'not_met') bucket.not_met++;
        else if (a.status === 'not_applicable') bucket.na++;
        else bucket.draft++;
      }
      if (a.nextReassessmentDue && new Date(a.nextReassessmentDue).getTime() < now) {
        overdueReassessment++;
      }
    }
    const metCount = byStatus.met || 0;
    const partialCount = byStatus.partially_met || 0;
    const naCount = byStatus.not_applicable || 0;
    const applicableDenom = Math.max(1, coverageDenom - naCount);
    const compliancePct = Math.round(((metCount + 0.5 * partialCount) / applicableDenom) * 100);
    res.json({
      success: true,
      totalStandards: coverageDenom,
      totalAttested: raw.length,
      coverageAttestedKeys: attestedKeys.size,
      coveragePct: Math.round((attestedKeys.size / coverageDenom) * 100),
      compliancePct,
      byStatus,
      byChapter,
      overdueReassessment,
    });
  } catch (err) {
    return safeError(res, err, 'cbahi.dashboard');
  }
});

// ── GET /attestations/due-reassessment ─────────────────────────────
router.get('/attestations/due-reassessment', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W447
      nextReassessmentDue: { $ne: null, $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await Attestation.find(filter).sort({ nextReassessmentDue: 1 }).limit(200).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'cbahi.dueReassessment');
  }
});

// ── GET /attestations/:id ──────────────────────────────────────────
router.get('/attestations/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Attestation.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W447 */
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cbahi.attestationGet');
  }
});

// ── POST /attestations ─────────────────────────────────────────────
router.post('/attestations', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.branchId || !mongoose.isValidObjectId(body.branchId)) {
      return res.status(400).json({ success: false, message: 'branchId مطلوب' });
    }
    const standard = registry.findStandard(String(body.standardKey));
    if (!standard) {
      return res.status(400).json({ success: false, message: 'standardKey غير موجود في السجل' });
    }
    const existing = await Attestation.findOne({
      ...branchFilter(req),
      /* W447 */ branchId: body.branchId,
      standardKey: body.standardKey,
    }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'يوجد إقرار لهذا المعيار في هذا الفرع بالفعل',
        existingId: String(existing._id),
      });
    }
    const doc = await Attestation.create({
      branchId: body.branchId,
      standardKey: body.standardKey,
      standardChapter: standard.chapter,
      standardCode: standard.code,
      status: 'draft',
      notes: String(body.notes || '').slice(0, 2000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'cbahi.attestationCreate');
  }
});

// ── POST /attestations/:id/attest ──────────────────────────────────
router.post('/attestations/:id/attest', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Attestation.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W447 */
    if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
    const body = req.body || {};
    if (!STATUSES.includes(String(body.status))) {
      return res
        .status(400)
        .json({ success: false, message: `status يجب أن يكون: ${STATUSES.join(' | ')}` });
    }
    row.status = body.status;
    if (typeof body.score === 'number') row.score = Math.max(0, Math.min(100, body.score));
    if (body.gapNotes != null) row.gapNotes = String(body.gapNotes).slice(0, 2000);
    if (body.naJustification != null)
      row.naJustification = String(body.naJustification).slice(0, 1000);
    if (body.linkedCapaItemId && mongoose.isValidObjectId(body.linkedCapaItemId)) {
      row.linkedCapaItemId = body.linkedCapaItemId;
    }
    row.assessedBy = req.user?.id || row.assessedBy;
    row.assessedByName = req.user?.name || row.assessedByName || '';
    row.assessedByRole = req.user?.role || row.assessedByRole || '';
    row.assessedAt = new Date();
    if (body.nextReassessmentDue) row.nextReassessmentDue = new Date(body.nextReassessmentDue);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cbahi.attest');
  }
});

// ── POST /attestations/:id/evidence ────────────────────────────────
router.post('/attestations/:id/evidence', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Attestation.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W447 */
    if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
    const body = req.body || {};
    if (!registry.EVIDENCE_TYPES.includes(String(body.type))) {
      return res.status(400).json({
        success: false,
        message: `type يجب أن يكون أحد ${registry.EVIDENCE_TYPES.join(' | ')}`,
      });
    }
    if (!String(body.summary || '').trim()) {
      return res.status(400).json({ success: false, message: 'summary مطلوب' });
    }
    row.evidence.push({
      type: body.type,
      summary: String(body.summary).slice(0, 500),
      artifactId: String(body.artifactId || '').slice(0, 100),
      artifactKind: String(body.artifactKind || '').slice(0, 50),
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
      capturedBy: req.user?.id || null,
      capturedByName: req.user?.name || '',
      url: String(body.url || '').slice(0, 500),
    });
    await row.save();
    const created = row.evidence[row.evidence.length - 1];
    res.status(201).json({ success: true, data: created, attestation: row });
  } catch (err) {
    return safeError(res, err, 'cbahi.addEvidence');
  }
});

// ── DELETE /attestations/:id/evidence/:evidenceId ──────────────────
router.delete(
  '/attestations/:id/evidence/:evidenceId',
  requireRole(WRITE_ROLES),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      }
      const row = await Attestation.findOne({
        _id: req.params.id,
        ...branchFilter(req),
      }); /* W447 */
      if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
      const before = row.evidence.length;
      row.evidence = row.evidence.filter(e => String(e._id) !== String(req.params.evidenceId));
      if (row.evidence.length === before) {
        return res.status(404).json({ success: false, message: 'الدليل غير موجود' });
      }
      await row.save();
      res.json({ success: true, data: row });
    } catch (err) {
      return safeError(res, err, 'cbahi.removeEvidence');
    }
  }
);

// ── POST /attestations/:id/snapshot ───────────────────────────────
router.post('/attestations/:id/snapshot', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Attestation.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W447 */
    if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
    row.history.push({
      snapshotAt: new Date(),
      snapshotByUserId: req.user?.id || null,
      snapshotByName: req.user?.name || '',
      status: row.status,
      evidenceCount: (row.evidence || []).length,
      summary: String(req.body?.summary || '').slice(0, 500),
    });
    if (row.history.length > 30) row.history = row.history.slice(-30);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cbahi.snapshot');
  }
});

// ── PATCH /attestations/:id ────────────────────────────────────────
router.patch('/attestations/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Attestation.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W447 */
    if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
    const editable = [
      'gapNotes',
      'naJustification',
      'linkedCapaItemId',
      'nextReassessmentDue',
      'score',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cbahi.attestationPatch');
  }
});

// ── DELETE /attestations/:id ───────────────────────────────────────
router.delete('/attestations/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Attestation.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W447 */
    if (!row) return res.status(404).json({ success: false, message: 'الإقرار غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'cbahi.attestationDelete');
  }
});

module.exports = router;
