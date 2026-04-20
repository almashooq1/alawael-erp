/**
 * waitlist-admin.routes.js — Waiting-list admin.
 *
 * Mount at /api/admin/waitlist.
 *
 * Endpoints:
 *   GET    /              paginated list + filters
 *   GET    /overview      counts + avg wait + estimate + stale watchlist
 *   GET    /prioritized   sorted-by-urgency list for front desk
 *   POST   /              add waiter
 *   PATCH  /:id           update (incl. status transitions)
 *   POST   /:id/offer     set status=offered + offerExpiresAt
 *   POST   /:id/enroll    set status=enrolled + resolvedAt
 *   POST   /:id/withdraw  set status=withdrawn + resolvedAt
 *   DELETE /:id           admin only
 *   GET    /export.csv    admin only
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const WaitingListEntry = require('../models/WaitingListEntry');
const wl = require('../services/waitingListService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'receptionist',
  'clinical_supervisor',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'receptionist'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr'];

function buildFilter(q) {
  const f = {};
  if (q.status && ['waiting', 'offered', 'enrolled', 'withdrawn', 'lapsed'].includes(q.status))
    f.status = q.status;
  if (q.branchId && mongoose.isValidObjectId(q.branchId)) f.branchId = q.branchId;
  if (q.serviceType) f.serviceType = String(q.serviceType);
  if (q.priority) f.priority = Number(q.priority);
  return f;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      WaitingListEntry.find(filter)
        .sort({ priority: 1, requestedAt: 1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      WaitingListEntry.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'waitlist.list');
  }
});

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await WaitingListEntry.find({}).lean();
    const summary = wl.summarize(all);
    const waiters = all.filter(e => e.status === 'waiting');
    const stale = wl.detectStale(waiters);
    const byType = wl.groupByServiceType(all);
    const estimateDays = wl.estimateWaitDays(all);
    res.json({ success: true, summary, stale, byServiceType: byType, estimateDays });
  } catch (err) {
    return safeError(res, err, 'waitlist.overview');
  }
});

router.get('/prioritized', requireRole(READ_ROLES), async (req, res) => {
  try {
    const waiters = await WaitingListEntry.find({ status: 'waiting' }).lean();
    res.json({ success: true, items: wl.prioritize(waiters) });
  } catch (err) {
    return safeError(res, err, 'waitlist.prioritized');
  }
});

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { serviceType, beneficiaryId, guardianId, prospectName } = req.body || {};
    if (!serviceType) return res.status(400).json({ success: false, message: 'serviceType مطلوب' });
    if (!beneficiaryId && !guardianId && !prospectName) {
      return res
        .status(400)
        .json({ success: false, message: 'يجب توفير beneficiaryId أو guardianId أو prospectName' });
    }
    const row = await WaitingListEntry.create({
      ...req.body,
      createdBy: req.user?.id,
      requestedAt: req.body.requestedAt ? new Date(req.body.requestedAt) : new Date(),
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'waitlist.create');
  }
});

router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const row = await WaitingListEntry.findByIdAndUpdate(req.params.id, req.body || {}, {
      new: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'waitlist.patch');
  }
});

async function statusTransition(id, patch) {
  return WaitingListEntry.findByIdAndUpdate(
    id,
    { ...patch, statusChangedAt: new Date() },
    { new: true }
  );
}

router.post('/:id/offer', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const offerExpiresAt = new Date(Date.now() + wl.THRESHOLDS.offerWindowDays * 86400000);
    const row = await statusTransition(req.params.id, {
      status: 'offered',
      offeredAt: new Date(),
      offerExpiresAt,
    });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'waitlist.offer');
  }
});

router.post('/:id/enroll', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const row = await statusTransition(req.params.id, {
      status: 'enrolled',
      resolvedAt: new Date(),
    });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'waitlist.enroll');
  }
});

router.post('/:id/withdraw', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const row = await statusTransition(req.params.id, {
      status: 'withdrawn',
      resolvedAt: new Date(),
    });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'waitlist.withdraw');
  }
});

router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const row = await WaitingListEntry.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'waitlist.delete');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const total = await WaitingListEntry.countDocuments(filter);
    const items = await WaitingListEntry.find(filter)
      .sort({ priority: 1, requestedAt: 1 })
      .limit(10_000)
      .lean();
    res.set('X-Total-Count', String(total));
    if (total > 10_000) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', '10000');
    }
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'requestedAt',
      'status',
      'priority',
      'serviceType',
      'prospectName',
      'prospectPhone',
      'referredBy',
      'notes',
    ];
    const rows = items.map(r =>
      [
        r.requestedAt?.toISOString()?.slice(0, 10),
        r.status,
        r.priority,
        r.serviceType,
        r.prospectName || '',
        r.prospectPhone || '',
        r.referredBy || '',
        r.notes || '',
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'waitlist.export');
  }
});

module.exports = router;
