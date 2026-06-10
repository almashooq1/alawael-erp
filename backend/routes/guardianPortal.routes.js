'use strict';
/**
 * Guardian Portal Routes — بوابة أولياء الأمور
 * ══════════════════════════════════════════════════════════════════════════
 * Self-service portal for guardians: dashboard overview, children profiles,
 * appointments, progress reports, and secure messaging with staff.
 *
 *   GET    /dashboard            guardian home dashboard
 *   GET    /profile              guardian profile
 *   PUT    /profile              update guardian profile
 *   GET    /children             list linked children
 *   GET    /children/:id         child profile overview
 *   GET    /children/:id/appointments  upcoming appointments
 *   POST   /children/:id/appointments  request new appointment
 *   GET    /children/:id/progress      progress reports
 *   GET    /children/:id/sessions      recent sessions
 *   GET    /messages             inbox
 *   POST   /messages             send message to staff
 *   GET    /messages/:id         message detail + thread
 *   POST   /messages/:id/reply   reply to message
 *   GET    /notifications        guardian notifications
 *   PATCH  /notifications/:id/read  mark notification read
 *   GET    /documents            accessible documents for children
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET /dashboard ─────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const Beneficiary = safeModel('Beneficiary');
    const Appointment = safeModel('Appointment');
    if (!Guardian)
      return res.json({
        success: true,
        data: { children: [], upcomingAppointments: [], unreadMessages: 0 },
      });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
    }).lean();
    if (!guardian)
      return res.json({
        success: true,
        data: { children: [], upcomingAppointments: [], unreadMessages: 0 },
      });
    const childrenIds = (guardian.linkedBeneficiaries || []).map(l => l.beneficiaryId);
    const [children, upcomingAppts] = await Promise.all([
      Beneficiary
        ? Beneficiary.find({ _id: { $in: childrenIds } })
            .select('name fileNumber dateOfBirth type status')
            .lean()
        : [],
      Appointment
        ? // W1197 — canonical field is `beneficiary` (phantom beneficiaryId
          // matched nothing → dashboard always showed zero appointments) and
          // the status enum is UPPERCASE.
          Appointment.find({
            beneficiary: { $in: childrenIds },
            date: { $gte: new Date() },
            status: { $nin: ['CANCELLED'] },
          })
            .sort({ date: 1 })
            .limit(5)
            .lean()
        : [],
    ]);
    res.json({
      success: true,
      data: {
        guardian: { name: guardian.name, relationship: guardian.relationship },
        children,
        upcomingAppointments: upcomingAppts,
        unreadMessages: 0,
      },
    });
  } catch (err) {
    safeError(res, err, 'guardian dashboard');
  }
});

// ── GET /profile ───────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    if (!Guardian)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
    }).lean();
    if (!guardian)
      return res.status(404).json({ success: false, message: 'Guardian profile not found' });
    res.json({ success: true, data: guardian });
  } catch (err) {
    safeError(res, err, 'guardian profile');
  }
});

// ── PUT /profile ───────────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    if (!Guardian)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const allowedUpdates = [
      'phone',
      'email',
      'address',
      'emergencyContact',
      'preferredLanguage',
      'notificationPreferences',
    ];
    const updates = {};
    allowedUpdates.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const doc = await Guardian.findOneAndUpdate(
      { userId: req.user._id, branchId: req.user.branchId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after', upsert: false }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Guardian profile not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update guardian profile');
  }
});

// ── GET /children ──────────────────────────────────────────────────────────
router.get('/children', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const Beneficiary = safeModel('Beneficiary');
    if (!Guardian || !Beneficiary) return res.json({ success: true, data: [] });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
    }).lean();
    if (!guardian) return res.json({ success: true, data: [] });
    const childrenIds = (guardian.linkedBeneficiaries || []).map(l => l.beneficiaryId);
    const data = await Beneficiary.find({ _id: { $in: childrenIds } })
      .select('name fileNumber dateOfBirth gender type status enrollmentDate primaryDiagnosis')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list children');
  }
});

// ── GET /children/:id ──────────────────────────────────────────────────────
router.get('/children/:id', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const Beneficiary = safeModel('Beneficiary');
    if (!Guardian || !Beneficiary)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
      'linkedBeneficiaries.beneficiaryId': req.params.id,
    }).lean();
    if (!guardian) return res.status(403).json({ success: false, message: 'Access denied' });
    const child = await Beneficiary.findById(req.params.id)
      .select('-internalNotes -auditLog')
      .lean();
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });
    res.json({ success: true, data: child });
  } catch (err) {
    safeError(res, err, 'child profile');
  }
});

// ── GET /children/:id/appointments ────────────────────────────────────────
router.get('/children/:id/appointments', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const Appointment = safeModel('Appointment');
    if (!Guardian) return res.json({ success: true, data: [] });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
      'linkedBeneficiaries.beneficiaryId': req.params.id,
    }).lean();
    if (!guardian) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!Appointment) return res.json({ success: true, data: [] });
    const { upcoming = 'true' } = req.query;
    // W1197 — Appointment's canonical field is `beneficiary` (ref); the old
    // phantom `beneficiaryId` filter matched nothing → guardians always saw
    // an empty appointment list.
    const filter = { beneficiary: req.params.id, branchId: req.user.branchId };
    if (upcoming === 'true') filter.date = { $gte: new Date() };
    const data = await Appointment.find(filter).sort({ date: 1 }).limit(20).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'child appointments');
  }
});

// ── POST /children/:id/appointments ───────────────────────────────────────
router.post('/children/:id/appointments', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const Appointment = safeModel('Appointment');
    if (!Guardian)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
      'linkedBeneficiaries.beneficiaryId': req.params.id,
    }).lean();
    if (!guardian) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!Appointment)
      return res.status(503).json({ success: false, message: 'Appointment service unavailable' });
    const { requestedDate, serviceType, notes, startTime } = req.body;
    if (!requestedDate || !serviceType)
      return res
        .status(400)
        .json({ success: false, message: 'requestedDate and serviceType are required' });
    // W1197 — realigned to the REAL Appointment vocabulary. The old payload
    // (beneficiaryId / serviceType / status:'pending' / requestedBy*) matched
    // phantom fields, violated the UPPERCASE status enum, and never set the
    // REQUIRED startTime → guardian booking threw ValidationError on every
    // request since it shipped (caught by the W1189 phantom-writes audit).
    const APPOINTMENT_TYPES = [
      'استشارة أولية',
      'متابعة',
      'تقييم',
      'فحص',
      'علاج طبيعي',
      'علاج وظيفي',
      'نطق وتخاطب',
      'علاج سلوكي',
      'علاج نفسي',
      'أخرى',
    ];
    const SERVICE_TYPE_MAP = {
      consultation: 'استشارة أولية',
      follow_up: 'متابعة',
      assessment: 'تقييم',
      examination: 'فحص',
      physical_therapy: 'علاج طبيعي',
      physiotherapy: 'علاج طبيعي',
      occupational_therapy: 'علاج وظيفي',
      speech_therapy: 'نطق وتخاطب',
      behavioral_therapy: 'علاج سلوكي',
      psychology: 'علاج نفسي',
    };
    const when = new Date(requestedDate);
    const hhmm = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    const doc = await Appointment.create({
      beneficiary: req.params.id,
      branchId: req.user.branchId,
      date: when,
      startTime: startTime || hhmm,
      type: APPOINTMENT_TYPES.includes(serviceType)
        ? serviceType
        : SERVICE_TYPE_MAP[serviceType] || 'أخرى',
      reason: serviceType, // preserve the guardian's requested service verbatim
      notes,
      status: 'PENDING',
      bookedBy: req.user._id,
      bookedByName: req.user.name || req.user.fullName || req.user.email,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'request appointment');
  }
});

// ── GET /children/:id/progress ─────────────────────────────────────────────
router.get('/children/:id/progress', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const StudentActivity = safeModel('StudentActivity');
    if (!Guardian) return res.json({ success: true, data: [] });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
      'linkedBeneficiaries.beneficiaryId': req.params.id,
    }).lean();
    if (!guardian) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const data = await StudentActivity.find({
      studentId: req.params.id,
      branchId: req.user.branchId,
      activityType: { $in: ['assessment', 'goal_review', 'milestone'] },
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'child progress');
  }
});

// ── GET /children/:id/sessions ─────────────────────────────────────────────
router.get('/children/:id/sessions', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    if (!Guardian) return res.json({ success: true, data: [] });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
      'linkedBeneficiaries.beneficiaryId': req.params.id,
    }).lean();
    if (!guardian) return res.status(403).json({ success: false, message: 'Access denied' });
    const Appointment = safeModel('Appointment');
    if (!Appointment) return res.json({ success: true, data: [] });
    const data = await Appointment.find({
      beneficiaryId: req.params.id,
      branchId: req.user.branchId,
      status: 'completed',
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'child sessions');
  }
});

// ── GET /messages ──────────────────────────────────────────────────────────
router.get('/messages', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20 } = req.query;
    const filter = {
      branchId: req.user.branchId,
      $or: [{ senderId: req.user._id }, { recipientId: req.user._id }],
      channel: { $in: ['portal', 'message'] },
    };
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Communication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Communication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'guardian messages inbox');
  }
});

// ── POST /messages ─────────────────────────────────────────────────────────
router.post('/messages', async (req, res) => {
  try {
    const { subject, body, recipientId, childId, priority = 'normal' } = req.body;
    if (!body) return res.status(400).json({ success: false, message: 'body is required' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.create({
      channel: 'portal',
      direction: 'inbound',
      status: 'open',
      subject,
      body,
      senderId: req.user._id,
      recipientId,
      metadata: { childId, priority },
      branchId: req.user.branchId,
      createdAt: new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'send guardian message');
  }
});

// ── GET /messages/:id ──────────────────────────────────────────────────────
router.get('/messages/:id', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      $or: [{ senderId: req.user._id }, { recipientId: req.user._id }],
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'message detail');
  }
});

// ── POST /messages/:id/reply ───────────────────────────────────────────────
router.post('/messages/:id/reply', async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ success: false, message: 'body is required' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const original = await Communication.findOneAndUpdate(
      {
        _id: req.params.id,
        branchId: req.user.branchId,
        $or: [{ senderId: req.user._id }, { recipientId: req.user._id }],
      },
      { $push: { thread: { body, senderId: req.user._id, sentAt: new Date() } } },
      { returnDocument: 'after' }
    );
    if (!original) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: original });
  } catch (err) {
    safeError(res, err, 'reply message');
  }
});

// ── GET /notifications ─────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const Notification = safeModel('Notification');
    if (!Notification) return res.json({ success: true, data: [], unreadCount: 0 });
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { userId: req.user._id, branchId: req.user.branchId };
    if (unreadOnly === 'true') filter.isRead = false;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments({
        userId: req.user._id,
        branchId: req.user.branchId,
        isRead: false,
      }),
    ]);
    res.json({
      success: true,
      data,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'guardian notifications');
  }
});

// ── PATCH /notifications/:id/read ─────────────────────────────────────────
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const Notification = safeModel('Notification');
    if (!Notification)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, 'mark notification read');
  }
});

// ── GET /documents ─────────────────────────────────────────────────────────
router.get('/documents', async (req, res) => {
  try {
    const Guardian = safeModel('Guardian');
    const Document = safeModel('Document');
    if (!Guardian || !Document) return res.json({ success: true, data: [] });
    const guardian = await Guardian.findOne({
      userId: req.user._id,
      branchId: req.user.branchId,
    }).lean();
    if (!guardian) return res.json({ success: true, data: [] });
    const childrenIds = (guardian.linkedBeneficiaries || []).map(l => l.beneficiaryId);
    const data = await Document.find({
      branchId: req.user.branchId,
      beneficiaryId: { $in: childrenIds },
      'permissions.guardianVisible': { $ne: false },
      isDeleted: { $ne: true },
    })
      .select('title category createdAt status beneficiaryId')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'guardian documents');
  }
});

module.exports = router;
