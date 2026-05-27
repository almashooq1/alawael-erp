/**
 * parent-portal-v2-extras.routes.js — operational modules layered on top of
 * parent-portal-v2.routes.js: invoices, appointments, messages, devices,
 * settings, transport. Same access model (guardian → child via Guardian.userId
 * → Beneficiary.guardians[]); mounts on the same /api/parent-v2 prefix so the
 * mobile/web client sees a single namespace.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');
const Invoice = require('../models/Invoice');
const Appointment = require('../models/Appointment');
const { ParentDevice, ParentMessage } = require('../models/ParentPortal');

router.use(authenticateToken);

const ALLOWED_ROLES = ['parent', 'guardian', 'admin', 'superadmin', 'super_admin'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin'];

function gate(req, res, next) {
  const role = req.user?.role || '';
  if (!ALLOWED_ROLES.includes(role))
    return res.status(403).json({ success: false, message: 'الوصول مقتصر على أولياء الأمور' });
  next();
}
router.use(gate);

async function getMyGuardian(req) {
  if (!req.user?.id) return null;
  return Guardian.findOne({ userId: req.user.id }).lean();
}

async function assertChildAccess(req, childId) {
  if (!mongoose.isValidObjectId(childId)) return { ok: false, status: 400, msg: 'معرّف غير صالح' };
  if (ADMIN_ROLES.includes(req.user?.role)) {
    const child = await Beneficiary.findById(childId).lean();
    return child ? { ok: true, child } : { ok: false, status: 404, msg: 'الطفل غير موجود' };
  }
  const guardian = await getMyGuardian(req);
  if (!guardian) return { ok: false, status: 403, msg: 'لا يوجد سجل ولي أمر مرتبط بحسابك' };
  const child = await Beneficiary.findOne({ _id: childId, guardians: guardian._id }).lean();
  if (!child) return { ok: false, status: 403, msg: 'لا تملك صلاحية الوصول لهذا الطفل' };
  return { ok: true, child, guardian };
}

async function myChildIds(req) {
  if (ADMIN_ROLES.includes(req.user?.role)) return null; // null = no scope filter
  const guardian = await getMyGuardian(req);
  if (!guardian) return [];
  const kids = await Beneficiary.find({ guardians: guardian._id }).select('_id').lean();
  return kids.map(k => k._id);
}

// ── INVOICES ─────────────────────────────────────────────────────────────
// GET /children/:id/invoices?status=&limit=
router.get('/children/:id/invoices', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const filter = { beneficiary: check.child._id };
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const items = await Invoice.find(filter)
      .sort({ issueDate: -1, createdAt: -1 })
      .limit(limit)
      .select(
        'invoiceNumber issueDate dueDate subTotal taxAmount discount totalAmount status paymentMethod insurance.patientShare insurance.status'
      )
      .lean();

    const summary = items.reduce(
      (acc, inv) => {
        acc.total += inv.totalAmount || 0;
        if (inv.status === 'PAID') acc.paid += inv.totalAmount || 0;
        else if (['PENDING', 'PARTIAL', 'OVERDUE'].includes(inv.status))
          acc.outstanding += inv.totalAmount || 0;
        return acc;
      },
      { total: 0, paid: 0, outstanding: 0 }
    );

    res.json({ success: true, items, summary });
  } catch (err) {
    return safeError(res, err, 'parent-v2.invoices.list');
  }
});

// GET /invoices/:invoiceId — single invoice (ownership-checked)
router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.invoiceId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const inv = await Invoice.findById(req.params.invoiceId).lean();
    if (!inv) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    const scope = await myChildIds(req);
    if (scope !== null && !scope.some(id => String(id) === String(inv.beneficiary))) {
      return res
        .status(403)
        .json({ success: false, message: 'لا تملك صلاحية الوصول لهذه الفاتورة' });
    }

    res.json({ success: true, data: inv });
  } catch (err) {
    return safeError(res, err, 'parent-v2.invoices.get');
  }
});

// ── APPOINTMENTS ─────────────────────────────────────────────────────────
// GET /children/:id/appointments?from=&to=&status=
router.get('/children/:id/appointments', async (req, res) => {
  try {
    const check = await assertChildAccess(req, req.params.id);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const filter = { beneficiary: check.child._id };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    if (req.query.status) filter.status = String(req.query.status);

    const items = await Appointment.find(filter)
      .sort({ date: 1, startTime: 1 })
      .limit(200)
      .select(
        'appointmentNumber type date startTime endTime duration status priority therapistName department location reason'
      )
      .lean();

    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'parent-v2.appointments.list');
  }
});

// POST /appointments/request — parent submits a request (status=requested)
router.post('/appointments/request', async (req, res) => {
  try {
    const { childId, type, preferredDate, preferredTime, reason, notes } = req.body || {};
    if (!childId || !preferredDate)
      return res.status(400).json({ success: false, message: 'childId وpreferredDate مطلوبان' });

    const check = await assertChildAccess(req, childId);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });

    const guardian = await getMyGuardian(req);
    const date = new Date(preferredDate);
    if (Number.isNaN(date.getTime()))
      return res.status(400).json({ success: false, message: 'تاريخ غير صالح' });

    const appt = await Appointment.create({
      beneficiary: check.child._id,
      beneficiaryName:
        check.child.firstName_ar ||
        `${check.child.firstName || ''} ${check.child.lastName || ''}`.trim(),
      bookedBy: req.user?.id,
      bookedByName: guardian
        ? `${guardian.firstName_ar || guardian.firstName_en || ''} ${guardian.lastName_ar || guardian.lastName_en || ''}`.trim()
        : undefined,
      type: type || 'follow_up',
      date,
      startTime: preferredTime || '09:00',
      status: 'requested',
      priority: 'normal',
      reason: reason || '',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      data: {
        id: appt._id,
        appointmentNumber: appt.appointmentNumber,
        status: appt.status,
        date: appt.date,
        startTime: appt.startTime,
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.appointments.request');
  }
});

// PUT /appointments/:id/cancel — guardian cancels their own request
router.put('/appointments/:id/cancel', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'الموعد غير موجود' });

    const scope = await myChildIds(req);
    if (scope !== null && !scope.some(id => String(id) === String(appt.beneficiary))) {
      return res.status(403).json({ success: false, message: 'لا تملك صلاحية إلغاء هذا الموعد' });
    }

    if (['cancelled', 'completed', 'no_show'].includes(appt.status)) {
      return res
        .status(400)
        .json({ success: false, message: `لا يمكن إلغاء موعد بحالة ${appt.status}` });
    }

    appt.status = 'cancelled';
    appt.notes =
      `${appt.notes || ''}\n[ملغي من ولي الأمر: ${req.body?.reason || 'بدون سبب'}]`.trim();
    await appt.save();

    res.json({ success: true, data: { id: appt._id, status: appt.status } });
  } catch (err) {
    return safeError(res, err, 'parent-v2.appointments.cancel');
  }
});

// ── MESSAGES ─────────────────────────────────────────────────────────────
// GET /messages?direction=inbound|outbound&unreadOnly=&limit=
router.get('/messages', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian) return res.json({ success: true, items: [], unreadCount: 0 });

    const filter = { guardianId: guardian._id, deletedAt: null };
    if (req.query.direction) filter.direction = String(req.query.direction);
    if (req.query.unreadOnly === 'true') {
      filter.isRead = false;
      filter.direction = 'outbound'; // only inbound-to-parent messages can be unread
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const [items, unreadCount] = await Promise.all([
      ParentMessage.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('subject body direction messageType isRead readAt beneficiaryId createdAt')
        .lean(),
      ParentMessage.countDocuments({
        guardianId: guardian._id,
        direction: 'outbound',
        isRead: false,
        deletedAt: null,
      }),
    ]);

    res.json({ success: true, items, unreadCount });
  } catch (err) {
    return safeError(res, err, 'parent-v2.messages.list');
  }
});

// POST /messages — parent → center
router.post('/messages', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const { childId, recipientType, subject, body, messageType = 'general' } = req.body || {};
    if (!body || typeof body !== 'string' || body.trim().length < 2)
      return res.status(400).json({ success: false, message: 'محتوى الرسالة مطلوب' });

    let beneficiaryId = null;
    if (childId) {
      const check = await assertChildAccess(req, childId);
      if (!check.ok) return res.status(check.status).json({ success: false, message: check.msg });
      beneficiaryId = check.child._id;
    }

    const msg = await ParentMessage.create({
      guardianId: guardian._id,
      beneficiaryId,
      recipientType: recipientType || 'administration',
      subject: subject ? String(subject).trim().slice(0, 200) : null,
      body: body.trim().slice(0, 2000),
      direction: 'inbound',
      messageType,
      branchId: guardian.branchId,
    });

    res.status(201).json({ success: true, data: { id: msg._id, createdAt: msg.createdAt } });
  } catch (err) {
    return safeError(res, err, 'parent-v2.messages.create');
  }
});

// PUT /messages/:id/read — mark inbound (center → parent) message read
router.put('/messages/:id/read', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const updated = await ParentMessage.findOneAndUpdate(
      { _id: req.params.id, guardianId: guardian._id },
      { $set: { isRead: true, readAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
    res.json({ success: true, data: { id: updated._id, isRead: true } });
  } catch (err) {
    return safeError(res, err, 'parent-v2.messages.markRead');
  }
});

// ── DEVICES (FCM tokens) ─────────────────────────────────────────────────
// POST /devices — register/refresh a push device
router.post('/devices', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const { deviceToken, deviceType = 'web', deviceName, osVersion, appVersion } = req.body || {};
    if (!deviceToken || typeof deviceToken !== 'string' || deviceToken.length < 10)
      return res.status(400).json({ success: false, message: 'deviceToken مطلوب' });
    if (!['android', 'ios', 'web'].includes(deviceType))
      return res.status(400).json({ success: false, message: 'deviceType غير صالح' });

    const upserted = await ParentDevice.findOneAndUpdate(
      { deviceToken },
      {
        $set: {
          guardianId: guardian._id,
          deviceType,
          deviceName: deviceName || null,
          osVersion: osVersion || null,
          appVersion: appVersion || null,
          isActive: true,
          lastActiveAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(201).json({
      success: true,
      data: { id: upserted._id, deviceType: upserted.deviceType, isActive: upserted.isActive },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.devices.register');
  }
});

// DELETE /devices/:token — deactivate one device (logout from device)
router.delete('/devices/:token', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const result = await ParentDevice.findOneAndUpdate(
      { deviceToken: req.params.token, guardianId: guardian._id },
      { $set: { isActive: false } },
      { returnDocument: 'after' }
    ).lean();

    if (!result) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    res.json({ success: true, data: { id: result._id, isActive: false } });
  } catch (err) {
    return safeError(res, err, 'parent-v2.devices.delete');
  }
});

// GET /devices — my registered devices
router.get('/devices', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian) return res.json({ success: true, items: [] });

    const items = await ParentDevice.find({ guardianId: guardian._id })
      .sort({ lastActiveAt: -1, createdAt: -1 })
      .select('deviceType deviceName osVersion appVersion isActive lastActiveAt createdAt')
      .lean();

    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'parent-v2.devices.list');
  }
});

// ── SETTINGS ─────────────────────────────────────────────────────────────
// GET /settings — language/timezone (Guardian) + notification prefs (last device)
router.get('/settings', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const lastDevice = await ParentDevice.findOne({ guardianId: guardian._id, isActive: true })
      .sort({ lastActiveAt: -1, createdAt: -1 })
      .select('notificationPreferences')
      .lean();

    res.json({
      success: true,
      data: {
        language: guardian.language || 'ar',
        timezone: guardian.timezone || 'Asia/Riyadh',
        notifications: lastDevice?.notificationPreferences || {
          sessionReminders: true,
          sessionReports: true,
          transportUpdates: true,
          financial: true,
          announcements: true,
          quietHours: { start: '22:00', end: '07:00' },
        },
      },
    });
  } catch (err) {
    return safeError(res, err, 'parent-v2.settings.get');
  }
});

// PUT /settings — update language/timezone + propagate notification prefs to all devices
router.put('/settings', async (req, res) => {
  try {
    const guardian = await getMyGuardian(req);
    if (!guardian)
      return res.status(403).json({ success: false, message: 'لا يوجد سجل ولي أمر مرتبط بحسابك' });

    const { language, timezone, notifications } = req.body || {};
    const guardianUpdate = {};
    if (language && ['ar', 'en'].includes(language)) guardianUpdate.language = language;
    if (timezone && typeof timezone === 'string') guardianUpdate.timezone = timezone;

    if (Object.keys(guardianUpdate).length) {
      await Guardian.updateOne({ _id: guardian._id }, { $set: guardianUpdate });
    }

    let devicesUpdated = 0;
    if (notifications && typeof notifications === 'object') {
      const set = {};
      const allowed = [
        'sessionReminders',
        'sessionReports',
        'transportUpdates',
        'financial',
        'announcements',
      ];
      for (const k of allowed) {
        if (typeof notifications[k] === 'boolean')
          set[`notificationPreferences.${k}`] = notifications[k];
      }
      if (notifications.quietHours?.start)
        set['notificationPreferences.quietHours.start'] = String(notifications.quietHours.start);
      if (notifications.quietHours?.end)
        set['notificationPreferences.quietHours.end'] = String(notifications.quietHours.end);

      if (Object.keys(set).length) {
        const r = await ParentDevice.updateMany({ guardianId: guardian._id }, { $set: set });
        devicesUpdated = r.modifiedCount || r.nModified || 0;
      }
    }

    res.json({ success: true, data: { devicesUpdated } });
  } catch (err) {
    return safeError(res, err, 'parent-v2.settings.update');
  }
});

module.exports = router;
