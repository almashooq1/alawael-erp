/**
 * telehealth-v2.routes.js — video meeting layer over TherapySession.
 *
 * Mount at /api/telehealth-v2. Distinct from the legacy telehealth.routes.js
 * which has its own model. This route binds directly to TherapySession.telehealth
 * subdoc so it flows naturally with the clinical scheduling already in place.
 *
 * Provider: Jitsi (meet.jit.si) by default — free, no auth, works immediately.
 * Each session gets a unique room derived from its ID so the URL is stable.
 *
 * Access:
 *   • Therapist must own the session
 *   • Guardian must be linked to the beneficiary
 *   • Admin/superadmin bypass
 *
 * Endpoints:
 *   POST /sessions/:id/create-room
 *   POST /sessions/:id/join
 *   POST /sessions/:id/end
 *   GET  /sessions/:id
 *   GET  /my/upcoming
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const TherapySession = require('../models/TherapySession');
const Employee = require('../models/HR/Employee');
const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');

router.use(authenticateToken);

const HQ = ['admin', 'superadmin', 'super_admin'];
const THERAPIST_ROLES = ['therapist', 'specialist', 'clinical_supervisor'];
const GUARDIAN_ROLES = ['parent', 'guardian'];

function jitsiRoomFor(sessionId) {
  return `alawael-${sessionId}-${crypto.randomBytes(4).toString('hex')}`;
}
function jitsiUrl(room) {
  return `https://meet.jit.si/${encodeURIComponent(room)}`;
}

async function resolveRole(req, session) {
  const role = req.user?.role || '';
  if (HQ.includes(role)) return { kind: 'admin', allowed: true };

  if (THERAPIST_ROLES.includes(role)) {
    const email = (req.user.email || '').toLowerCase();
    if (!email) return { kind: 'therapist', allowed: false, reason: 'لا يوجد بريد مرتبط' };
    const me = await Employee.findOne({ email }).lean();
    if (!me) return { kind: 'therapist', allowed: false, reason: 'لا يوجد سجل موظف' };
    if (String(session.therapist) !== String(me._id))
      return { kind: 'therapist', allowed: false, reason: 'الجلسة ليست من جلساتك' };
    return { kind: 'therapist', allowed: true, me };
  }

  if (GUARDIAN_ROLES.includes(role)) {
    const guardian = await Guardian.findOne({ userId: req.user.id }).lean();
    if (!guardian) return { kind: 'guardian', allowed: false, reason: 'لا يوجد سجل ولي أمر' };
    const ben = await Beneficiary.findOne({
      _id: session.beneficiary,
      guardians: guardian._id,
    }).lean();
    if (!ben) return { kind: 'guardian', allowed: false, reason: 'هذا الطفل ليس ضمن قائمتك' };
    return { kind: 'guardian', allowed: true };
  }

  return { kind: 'other', allowed: false, reason: 'دور غير مصرح' };
}

// ── POST /sessions/:id/create-room ───────────────────────────────────────
router.post('/sessions/:id/create-room', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const session = await TherapySession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    const who = await resolveRole(req, session);
    if (who.kind !== 'admin' && who.kind !== 'therapist')
      return res.status(403).json({ success: false, message: 'المعالج أو الإدارة فقط' });
    if (!who.allowed)
      return res.status(403).json({ success: false, message: who.reason || 'غير مصرح' });

    const provider = (req.body?.provider || 'jitsi').toLowerCase();
    let roomName;
    let roomUrl;
    if (provider === 'jitsi') {
      roomName = jitsiRoomFor(session._id.toString());
      roomUrl = jitsiUrl(roomName);
    } else if (provider === 'custom' && req.body?.roomUrl) {
      roomName = req.body.roomName || `custom-${session._id}`;
      roomUrl = req.body.roomUrl;
    } else {
      return res.status(400).json({ success: false, message: 'المزود غير مدعوم' });
    }

    session.telehealth = {
      ...(session.telehealth || {}),
      enabled: true,
      provider,
      roomName,
      roomUrl,
    };
    await session.save();

    logger.info('[telehealth-v2] room created', {
      sessionId: String(session._id),
      provider,
      by: req.user?.id,
    });
    res.json({
      success: true,
      data: session.toObject(),
      message: 'تم إنشاء غرفة الاجتماع',
    });
  } catch (err) {
    return safeError(res, err, 'telehealth-v2.createRoom');
  }
});

// ── POST /sessions/:id/join ──────────────────────────────────────────────
router.post('/sessions/:id/join', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const session = await TherapySession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'غير موجود' });

    const who = await resolveRole(req, session);
    if (!who.allowed)
      return res.status(403).json({ success: false, message: who.reason || 'غير مصرح' });
    if (!session.telehealth?.roomUrl)
      return res.status(400).json({ success: false, message: 'لم يتم إنشاء الغرفة بعد' });

    const now = new Date();
    session.telehealth = session.telehealth || {};
    if (who.kind === 'therapist' || who.kind === 'admin') {
      if (!session.telehealth.hostJoinedAt) session.telehealth.hostJoinedAt = now;
    } else if (who.kind === 'guardian') {
      if (!session.telehealth.guestJoinedAt) session.telehealth.guestJoinedAt = now;
    }
    if (session.status === 'SCHEDULED' || session.status === 'CONFIRMED') {
      session.status = 'IN_PROGRESS';
    }
    await session.save();

    res.json({
      success: true,
      roomUrl: session.telehealth.roomUrl,
      roomName: session.telehealth.roomName,
      provider: session.telehealth.provider,
      joinerRole: who.kind,
      displayName:
        who.kind === 'therapist'
          ? `${who.me?.firstName_ar || who.me?.firstName || 'المعالج'}`
          : 'المشارك',
    });
  } catch (err) {
    return safeError(res, err, 'telehealth-v2.join');
  }
});

// ── POST /sessions/:id/end ───────────────────────────────────────────────
router.post('/sessions/:id/end', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const session = await TherapySession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'غير موجود' });

    const who = await resolveRole(req, session);
    if (who.kind !== 'admin' && who.kind !== 'therapist')
      return res.status(403).json({ success: false, message: 'المعالج أو الإدارة فقط' });
    if (!who.allowed)
      return res.status(403).json({ success: false, message: who.reason || 'غير مصرح' });

    const now = new Date();
    session.telehealth = session.telehealth || {};
    session.telehealth.endedAt = now;
    if (session.telehealth.hostJoinedAt) {
      session.telehealth.durationSeconds = Math.max(
        0,
        Math.round((now - new Date(session.telehealth.hostJoinedAt)) / 1000)
      );
    }

    const from = session.status;
    if (session.status !== 'COMPLETED') {
      session.status = 'COMPLETED';
      session.statusHistory = session.statusHistory || [];
      session.statusHistory.push({
        from,
        to: 'COMPLETED',
        changedBy: req.user?.id,
        changedAt: now,
        reason: 'انتهاء جلسة الفيديو',
      });
    }
    await session.save();
    res.json({ success: true, data: session.toObject(), message: 'انتهت الجلسة' });
  } catch (err) {
    return safeError(res, err, 'telehealth-v2.end');
  }
});

// ── GET /sessions/:id ────────────────────────────────────────────────────
router.get('/sessions/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const session = await TherapySession.findById(req.params.id)
      .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
      .populate('therapist', 'firstName lastName firstName_ar lastName_ar fullName')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'غير موجود' });

    const who = await resolveRole(req, session);
    if (!who.allowed)
      return res.status(403).json({ success: false, message: who.reason || 'غير مصرح' });

    res.json({
      success: true,
      data: {
        _id: session._id,
        title: session.title,
        sessionType: session.sessionType,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        beneficiary: session.beneficiary,
        therapist: session.therapist,
        telehealth: session.telehealth || { enabled: false },
        joinerRole: who.kind,
      },
    });
  } catch (err) {
    return safeError(res, err, 'telehealth-v2.getSession');
  }
});

// ── GET /my/upcoming ─────────────────────────────────────────────────────
router.get('/my/upcoming', async (req, res) => {
  try {
    const role = req.user.role || '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const filter = {
      'telehealth.enabled': true,
      date: { $gte: now },
      status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
    };

    if (THERAPIST_ROLES.includes(role)) {
      const me = await Employee.findOne({ email: (req.user.email || '').toLowerCase() }).lean();
      if (!me) return res.json({ success: true, items: [] });
      filter.therapist = me._id;
    } else if (GUARDIAN_ROLES.includes(role)) {
      const guardian = await Guardian.findOne({ userId: req.user.id }).lean();
      if (!guardian) return res.json({ success: true, items: [] });
      const benIds = await Beneficiary.find({ guardians: guardian._id }).distinct('_id');
      filter.beneficiary = { $in: benIds };
    } else if (!HQ.includes(role)) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const items = await TherapySession.find(filter)
      .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar')
      .populate('therapist', 'firstName lastName firstName_ar lastName_ar')
      .sort({ date: 1, startTime: 1 })
      .limit(50)
      .select('title sessionType date startTime endTime status telehealth beneficiary therapist')
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'telehealth-v2.myUpcoming');
  }
});

module.exports = router;
