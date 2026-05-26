'use strict';

/**
 * daily-communication.routes.js — Wave 176.
 *
 * "دفتر التواصل اليومي" admin surface.
 * Mounted via dualMountAuth at /api/(v1/)?daily-communication.
 *
 * Endpoints:
 *   GET    /                      — list (date/beneficiary/section/parentSeen)
 *   GET    /today                 — today's logs (default date)
 *   GET    /by-beneficiary/:id    — history for one beneficiary
 *   GET    /:id                   — single log
 *   POST   /                      — create/upsert (one per beneficiary+day)
 *   PATCH  /:id                   — amend (sets status=amended)
 *   POST   /:id/parent-seen       — mark as seen by parent
 *   POST   /:id/parent-response   — parent (or staff on behalf of) replies
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const DailyCommunicationLog = require('../models/DailyCommunicationLog');
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
  'clinical_supervisor',
  'receptionist',
  'therapist',
  'teacher',
  'parent',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];

const { MOODS, ENGAGEMENTS } = DailyCommunicationLog;

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

// ── GET / ───────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.sectionId && mongoose.isValidObjectId(req.query.sectionId)) {
      filter.sectionId = req.query.sectionId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.parentSeen === 'true' || req.query.parentSeen === 'false') {
      filter.parentSeen = req.query.parentSeen === 'true';
    }
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = { $gte: startOfDay(d), $lte: endOfDay(d) };
    } else if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      DailyCommunicationLog.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      DailyCommunicationLog.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'comm.list');
  }
});

// ── GET /today ─────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    if (req.query.sectionId && mongoose.isValidObjectId(req.query.sectionId)) {
      filter.sectionId = req.query.sectionId;
    }
    const raw = await DailyCommunicationLog.find(filter).sort({ updatedAt: -1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'comm.today');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await DailyCommunicationLog.find({ beneficiaryId: req.params.id })
      .sort({ date: -1 })
      .limit(60)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'comm.byBeneficiary');
  }
});

// ── GET /:id ────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DailyCommunicationLog.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'comm.get');
  }
});

// ── POST / — create/upsert ─────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const date = body.date ? startOfDay(new Date(body.date)) : startOfDay(new Date());
    const update = {
      beneficiaryId: body.beneficiaryId,
      date,
      authorId: req.user?.id || null,
      authorName: body.authorName || req.user?.name || '',
    };
    if (body.sectionId && mongoose.isValidObjectId(body.sectionId))
      update.sectionId = body.sectionId;
    if (body.branchId && mongoose.isValidObjectId(body.branchId)) update.branchId = body.branchId;
    if (body.mood && MOODS.includes(body.mood)) update.mood = body.mood;
    if (typeof body.moodNote === 'string') update.moodNote = body.moodNote.slice(0, 500);
    if (Array.isArray(body.achievements)) update.achievements = body.achievements.slice(0, 50);
    if (Array.isArray(body.activities)) update.activities = body.activities.slice(0, 50);
    if (body.behavior && typeof body.behavior === 'object') update.behavior = body.behavior;
    if (typeof body.behaviorNote === 'string')
      update.behaviorNote = body.behaviorNote.slice(0, 1000);
    if (body.meals && typeof body.meals === 'object') update.meals = body.meals;
    if (body.engagement && ENGAGEMENTS.includes(body.engagement))
      update.engagement = body.engagement;
    if (typeof body.homeRecommendations === 'string')
      update.homeRecommendations = body.homeRecommendations.slice(0, 2000);
    if (typeof body.privateNoteForParent === 'string')
      update.privateNoteForParent = body.privateNoteForParent.slice(0, 2000);
    if (Array.isArray(body.photos)) update.photos = body.photos.slice(0, 20);
    if (Array.isArray(body.attachments)) update.attachments = body.attachments.slice(0, 20);

    const row = await DailyCommunicationLog.findOneAndUpdate(
      { beneficiaryId: body.beneficiaryId, date },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'يوجد دفتر تواصل بهذا التاريخ — استخدم PATCH للتعديل' });
    }
    return safeError(res, err, 'comm.create');
  }
});

// ── PATCH /:id — amend (status=amended) ────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.date;
    delete body.parentSeen;
    delete body.parentSeenAt;
    delete body.parentResponse;
    delete body.parentRespondedAt;
    body.status = 'amended';
    const row = await DailyCommunicationLog.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'comm.patch');
  }
});

// ── POST /:id/parent-seen ──────────────────────────────────────────────
router.post('/:id/parent-seen', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DailyCommunicationLog.findByIdAndUpdate(
      req.params.id,
      { parentSeen: true, parentSeenAt: new Date() },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'comm.parentSeen');
  }
});

// ── POST /:id/parent-response ──────────────────────────────────────────
router.post('/:id/parent-response', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const response = String(req.body?.response || '').slice(0, 2000);
    if (!response.trim()) {
      return res.status(400).json({ success: false, message: 'الرد مطلوب' });
    }
    const row = await DailyCommunicationLog.findByIdAndUpdate(
      req.params.id,
      {
        parentResponse: response,
        parentRespondedAt: new Date(),
        parentSeen: true,
        parentSeenAt: new Date(),
      },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'comm.parentResponse');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DailyCommunicationLog.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'comm.delete');
  }
});

module.exports = router;
