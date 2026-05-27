'use strict';

/**
 * voice-log.routes.js — Wave 513 (Phase B Rights & Voice — REST surface).
 *
 * REST surface for the W460 BeneficiaryVoiceLog model. Phase B of the
 * v3 Beneficiary Lifecycle Architecture (docs/blueprint/beneficiary-
 * lifecycle-v3.md §2.2) — gives the beneficiary a persistent channel
 * to record preferences / dreams / fears / dislikes / daily ratings /
 * complaints / consent changes / requests per CRPD Article 7 + 12 + 21.
 *
 * Mounted via dualMountAuth at /api/(v1/)?voice-log.
 *
 * Endpoints:
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history (last 100)
 *   GET    /stats                    — CRPD-compliance analytics for a range
 *   GET    /:id
 *   POST   /                         — record voice entry
 *   POST   /:id/action               — log action taken (plan_adjusted / complaint_opened / ...)
 *   POST   /:id/supersede            — mark superseded by a newer entry
 *   PATCH  /:id                      — correct content (only while status=active)
 *   DELETE /:id                      — admin-only
 *
 * Cross-tenant isolation: every endpoint uses branchFilter(req) and
 * mongoose.isValidObjectId guards per W269 doctrine. bodyScopedBeneficiaryGuard
 * (W441) ensures req.body.beneficiaryId belongs to caller's branch.
 *
 * Anti-substitution doctrine enforced at the model layer (pre-save) — proxy
 * + capacityGrade!=absent ⇒ supportArrangement (≥10 chars) required.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const BeneficiaryVoiceLog = require('../models/BeneficiaryVoiceLog');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

// CRPD Article 7 + 12 + 21: voice capture is broad — clinical + family-facing
// + advocacy roles can all record. Cultural officer + independent advocate
// are W464 additions; legacy roles preserved for backward compat.
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
  'case_manager',
  'social_worker',
  'independent_advocate',
  'cultural_officer',
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
  'case_manager',
  'social_worker',
  'independent_advocate',
  'cultural_officer',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

// Enums mirrored from the model schema — kept local to fail-fast on drift.
// Drift guard wave513 asserts these match the schema enums byte-for-byte.
const ENTRY_KINDS = [
  'preference',
  'dream',
  'fear',
  'dislike',
  'daily_rating',
  'session_rating',
  'complaint',
  'consent_change',
  'request',
];
const CAPTURE_MODALITIES = ['verbal', 'aac', 'gesture', 'proxy'];
const CAPACITY_GRADES = ['full', 'supported', 'shared', 'absent'];
const CAPTURED_BY_ROLES = [
  'beneficiary',
  'family',
  'advocate',
  'therapist',
  'case_manager',
  'cultural_officer',
];
const LANGUAGES = ['ar', 'en', 'aac_symbol'];
const ACTION_TAKEN_VALUES = [
  'none',
  'plan_adjusted',
  'complaint_opened',
  'consent_updated',
  'advocate_notified',
];
const RATING_SCALES = ['likert_5', 'face_5', 'thumb', 'star_5'];

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
    if (req.query.entryKind && ENTRY_KINDS.includes(String(req.query.entryKind))) {
      filter.entryKind = String(req.query.entryKind);
    }
    if (
      req.query.captureModality &&
      CAPTURE_MODALITIES.includes(String(req.query.captureModality))
    ) {
      filter.captureModality = String(req.query.captureModality);
    }
    if (req.query.capacityGrade && CAPACITY_GRADES.includes(String(req.query.capacityGrade))) {
      filter.capacityGrade = String(req.query.capacityGrade);
    }
    if (
      req.query.status &&
      ['active', 'archived', 'superseded'].includes(String(req.query.status))
    ) {
      filter.status = String(req.query.status);
    } else {
      filter.status = 'active';
    }
    if (req.query.from || req.query.to) {
      filter.capturedAt = {};
      if (req.query.from) filter.capturedAt.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.capturedAt.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      BeneficiaryVoiceLog.find(filter)
        .sort({ capturedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      BeneficiaryVoiceLog.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'voiceLog.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await BeneficiaryVoiceLog.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ capturedAt: -1 })
      .limit(100)
      .lean();

    // CRPD-compliance summary: % captured directly from beneficiary
    // vs interpreted by proxy. Higher direct % = stronger CRPD posture.
    const byModality = CAPTURE_MODALITIES.reduce((acc, m) => ((acc[m] = 0), acc), {});
    const byKind = ENTRY_KINDS.reduce((acc, k) => ((acc[k] = 0), acc), {});
    for (const r of items) {
      if (r.captureModality)
        byModality[r.captureModality] = (byModality[r.captureModality] || 0) + 1;
      if (r.entryKind) byKind[r.entryKind] = (byKind[r.entryKind] || 0) + 1;
    }
    const directCount =
      (byModality.verbal || 0) + (byModality.aac || 0) + (byModality.gesture || 0);
    const proxyCount = byModality.proxy || 0;
    const directPct = items.length ? Math.round((directCount * 100) / items.length) : null;

    res.json({
      success: true,
      items,
      count: items.length,
      byModality,
      byKind,
      crpdCompliance: { directCount, proxyCount, directPct },
    });
  } catch (err) {
    return safeError(res, err, 'voiceLog.byBeneficiary');
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
      ...branchFilter(req),
      capturedAt: { $gte: from, $lte: to },
      status: 'active',
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await BeneficiaryVoiceLog.find(filter)
      .select('entryKind captureModality capacityGrade actionTaken capturedAt')
      .lean();

    const byKind = ENTRY_KINDS.reduce((acc, k) => ((acc[k] = 0), acc), {});
    const byModality = CAPTURE_MODALITIES.reduce((acc, m) => ((acc[m] = 0), acc), {});
    const byCapacity = CAPACITY_GRADES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    const byAction = ACTION_TAKEN_VALUES.reduce((acc, a) => ((acc[a] = 0), acc), {});
    for (const r of raw) {
      byKind[r.entryKind] = (byKind[r.entryKind] || 0) + 1;
      byModality[r.captureModality] = (byModality[r.captureModality] || 0) + 1;
      if (r.capacityGrade) byCapacity[r.capacityGrade] = (byCapacity[r.capacityGrade] || 0) + 1;
      if (r.actionTaken) byAction[r.actionTaken] = (byAction[r.actionTaken] || 0) + 1;
    }
    const directCount =
      (byModality.verbal || 0) + (byModality.aac || 0) + (byModality.gesture || 0);
    const proxyCount = byModality.proxy || 0;
    const directPct = raw.length ? Math.round((directCount * 100) / raw.length) : null;
    const actionableEntries = raw.length - (byAction.none || 0);
    const actionPct = raw.length ? Math.round((actionableEntries * 100) / raw.length) : null;

    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byKind,
      byModality,
      byCapacity,
      byAction,
      crpdCompliance: { directCount, proxyCount, directPct },
      followThrough: { actionableEntries, actionPct },
    });
  } catch (err) {
    return safeError(res, err, 'voiceLog.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await BeneficiaryVoiceLog.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'voiceLog.get');
  }
});

// ── POST / — record voice entry ────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!ENTRY_KINDS.includes(String(body.entryKind))) {
      return res.status(400).json({
        success: false,
        message: `entryKind يجب أن يكون: ${ENTRY_KINDS.join(' | ')}`,
      });
    }
    if (!CAPTURE_MODALITIES.includes(String(body.captureModality))) {
      return res.status(400).json({
        success: false,
        message: `captureModality يجب أن يكون: ${CAPTURE_MODALITIES.join(' | ')}`,
      });
    }
    if (!CAPACITY_GRADES.includes(String(body.capacityGrade))) {
      return res.status(400).json({
        success: false,
        message: `capacityGrade يجب أن يكون: ${CAPACITY_GRADES.join(' | ')}`,
      });
    }
    if (!CAPTURED_BY_ROLES.includes(String(body.capturedByRole))) {
      return res.status(400).json({
        success: false,
        message: `capturedByRole يجب أن يكون: ${CAPTURED_BY_ROLES.join(' | ')}`,
      });
    }

    const content = body.content && typeof body.content === 'object' ? body.content : {};
    const sanitizedContent = {};
    if (content.text != null) sanitizedContent.text = String(content.text).slice(0, 2000);
    if (content.audioUrl != null)
      sanitizedContent.audioUrl = String(content.audioUrl).slice(0, 500);
    if (Array.isArray(content.aacSymbols)) {
      sanitizedContent.aacSymbols = content.aacSymbols
        .slice(0, 20)
        .map(s => String(s).slice(0, 100));
    }
    if (typeof content.ratingValue === 'number') {
      sanitizedContent.ratingValue = Math.min(5, Math.max(1, content.ratingValue));
    }
    if (content.ratingScale && RATING_SCALES.includes(String(content.ratingScale))) {
      sanitizedContent.ratingScale = String(content.ratingScale);
    }

    const doc = await BeneficiaryVoiceLog.create({
      beneficiaryId: body.beneficiaryId,
      branchId:
        body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : undefined,
      entryKind: body.entryKind,
      captureModality: body.captureModality,
      content: sanitizedContent,
      language: LANGUAGES.includes(String(body.language)) ? String(body.language) : 'ar',
      capacityGrade: body.capacityGrade,
      supportArrangement: String(body.supportArrangement || '').slice(0, 500) || undefined,
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
      capturedBy: req.user?.id || null,
      capturedByRole: body.capturedByRole,
      isSensitive: !!body.isSensitive,
      relatedSessionId:
        body.relatedSessionId && mongoose.isValidObjectId(body.relatedSessionId)
          ? body.relatedSessionId
          : undefined,
      relatedConsentId:
        body.relatedConsentId && mongoose.isValidObjectId(body.relatedConsentId)
          ? body.relatedConsentId
          : undefined,
      relatedComplaintId:
        body.relatedComplaintId && mongoose.isValidObjectId(body.relatedComplaintId)
          ? body.relatedComplaintId
          : undefined,
      status: 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'voiceLog.create');
  }
});

// ── POST /:id/action — log follow-up action ────────────────────────────
router.post('/:id/action', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    if (!ACTION_TAKEN_VALUES.includes(String(req.body?.action))) {
      return res.status(400).json({
        success: false,
        message: `action يجب أن يكون: ${ACTION_TAKEN_VALUES.join(' | ')}`,
      });
    }
    const row = await BeneficiaryVoiceLog.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن تسجيل إجراء على سجل مؤرشف أو مُستبدل',
      });
    }
    row.actionTaken = req.body.action;
    row.actionDetails = String(req.body?.details || '').slice(0, 500);
    row.actionTakenAt = new Date();
    row.actionTakenBy = req.user?.id || null;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'voiceLog.action');
  }
});

// ── POST /:id/supersede — mark superseded by a newer entry ─────────────
router.post('/:id/supersede', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const newerId = req.body?.supersededBy;
    if (!newerId || !mongoose.isValidObjectId(newerId)) {
      return res.status(400).json({ success: false, message: 'supersededBy مطلوب' });
    }
    if (String(newerId) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'لا يمكن إستبدال السجل بنفسه' });
    }
    const row = await BeneficiaryVoiceLog.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'superseded') {
      return res.status(409).json({ success: false, message: 'السجل سبق أن استُبدل' });
    }
    // Confirm the newer entry exists + same branch + same beneficiary
    const newer = await BeneficiaryVoiceLog.findOne({
      _id: newerId,
      ...branchFilter(req),
      beneficiaryId: row.beneficiaryId,
    }).select('_id beneficiaryId');
    if (!newer) {
      return res.status(404).json({
        success: false,
        message: 'السجل البديل غير موجود أو لا ينتمي لنفس المستفيد',
      });
    }
    row.status = 'superseded';
    row.supersededBy = newer._id;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'voiceLog.supersede');
  }
});

// ── PATCH /:id — correct while still 'active' ─────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await BeneficiaryVoiceLog.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن تعديل سجل مؤرشف أو مُستبدل',
      });
    }
    // Editable fields ONLY — beneficiaryId / branchId / captureMetadata immutable
    const body = req.body || {};
    if (body.entryKind != null) {
      if (!ENTRY_KINDS.includes(String(body.entryKind))) {
        return res.status(400).json({ success: false, message: 'entryKind غير صالح' });
      }
      row.entryKind = body.entryKind;
    }
    if (body.captureModality != null) {
      if (!CAPTURE_MODALITIES.includes(String(body.captureModality))) {
        return res.status(400).json({ success: false, message: 'captureModality غير صالح' });
      }
      row.captureModality = body.captureModality;
    }
    if (body.capacityGrade != null) {
      if (!CAPACITY_GRADES.includes(String(body.capacityGrade))) {
        return res.status(400).json({ success: false, message: 'capacityGrade غير صالح' });
      }
      row.capacityGrade = body.capacityGrade;
    }
    if (body.supportArrangement != null) {
      row.supportArrangement = String(body.supportArrangement).slice(0, 500);
    }
    if (body.language != null && LANGUAGES.includes(String(body.language))) {
      row.language = String(body.language);
    }
    if (body.content != null && typeof body.content === 'object') {
      const c = body.content;
      const next = { ...(row.content?.toObject?.() || row.content || {}) };
      if (c.text != null) next.text = String(c.text).slice(0, 2000);
      if (c.audioUrl != null) next.audioUrl = String(c.audioUrl).slice(0, 500);
      if (Array.isArray(c.aacSymbols)) {
        next.aacSymbols = c.aacSymbols.slice(0, 20).map(s => String(s).slice(0, 100));
      }
      if (typeof c.ratingValue === 'number') {
        next.ratingValue = Math.min(5, Math.max(1, c.ratingValue));
      }
      if (c.ratingScale && RATING_SCALES.includes(String(c.ratingScale))) {
        next.ratingScale = String(c.ratingScale);
      }
      row.content = next;
    }
    if (body.isSensitive != null) row.isSensitive = !!body.isSensitive;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'voiceLog.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await BeneficiaryVoiceLog.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'voiceLog.delete');
  }
});

module.exports = router;
