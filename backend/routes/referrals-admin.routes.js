/**
 * referrals-admin.routes.js — Referral-network analytics admin surface.
 *
 * Mount at /api/admin/referrals.
 *
 * Orthogonal to /api/referrals (FHIR R4 medical referral lifecycle) —
 * this surface powers the business-side network dashboard: who sends us
 * families, conversion funnel, stale outgoing referrals.
 *
 * Endpoints:
 *   GET    /                   paginated list + filters
 *   GET    /overview           summarize(both/incoming/outgoing)
 *   GET    /top-referrers      leaderboard by wins
 *   GET    /close-loop-gaps    outgoing/pending past threshold
 *   GET    /trend              month-by-month summary
 *   POST   /                   add tracking row
 *   PATCH  /:id                update (esp. status transitions)
 *   DELETE /:id                admin only
 *   GET    /export.csv         admin only
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const ReferralTracking = require('../models/ReferralTracking');
const ref = require('../services/referralTrackingService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'marketing',
  'receptionist',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'marketing',
  'receptionist',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr'];

function buildFilter(q) {
  const f = {};
  if (q.direction && ['incoming', 'outgoing'].includes(q.direction)) f.direction = q.direction;
  if (
    q.status &&
    ['pending', 'accepted', 'declined', 'converted', 'withdrawn'].includes(q.status)
  ) {
    f.status = q.status;
  }
  if (q.sourceOrgSlug) f.sourceOrgSlug = String(q.sourceOrgSlug).toLowerCase().trim();
  if (q.branchId && mongoose.isValidObjectId(q.branchId)) f.branchId = q.branchId;
  return f;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      ReferralTracking.find(filter)
        .sort({ receivedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      ReferralTracking.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'referrals.list');
  }
});

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await ReferralTracking.find({}).lean();
    res.json({
      success: true,
      both: ref.summarize(all),
      incoming: ref.summarize(all, 'incoming'),
      outgoing: ref.summarize(all, 'outgoing'),
      staleGapCount: ref.closeLoopGaps(all).length,
    });
  } catch (err) {
    return safeError(res, err, 'referrals.overview');
  }
});

router.get('/top-referrers', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const all = await ReferralTracking.find({ direction: 'incoming' }).lean();
    res.json({ success: true, items: ref.topReferrers(all, n) });
  } catch (err) {
    return safeError(res, err, 'referrals.topReferrers');
  }
});

router.get('/close-loop-gaps', requireRole(READ_ROLES), async (req, res) => {
  try {
    const outgoing = await ReferralTracking.find({
      direction: 'outgoing',
      status: 'pending',
    }).lean();
    res.json({
      success: true,
      items: ref.closeLoopGaps(outgoing),
      thresholdDays: ref.THRESHOLDS.closeLoopDays,
    });
  } catch (err) {
    return safeError(res, err, 'referrals.closeLoopGaps');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await ReferralTracking.find({}).lean();
    res.json({ success: true, months: ref.trendByMonth(all) });
  } catch (err) {
    return safeError(res, err, 'referrals.trend');
  }
});

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { direction } = req.body || {};
    if (!direction || !['incoming', 'outgoing'].includes(direction)) {
      return res
        .status(400)
        .json({ success: false, message: 'direction مطلوب (incoming أو outgoing)' });
    }
    const row = await ReferralTracking.create({
      ...req.body,
      createdBy: req.user?.id,
      receivedAt: req.body.receivedAt ? new Date(req.body.receivedAt) : new Date(),
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'referrals.create');
  }
});

router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const patch = { ...(req.body || {}) };
    if (patch.status && patch.status !== 'pending') patch.settledAt = new Date();
    const row = await ReferralTracking.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'referrals.patch');
  }
});

router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const row = await ReferralTracking.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'referrals.delete');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const total = await ReferralTracking.countDocuments(filter);
    const items = await ReferralTracking.find(filter).sort({ receivedAt: -1 }).limit(10_000).lean();
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
      'receivedAt',
      'direction',
      'status',
      'referralSource',
      'destinationOrg',
      'prospectName',
      'serviceType',
      'notes',
    ];
    const rows = items.map(r =>
      [
        r.receivedAt?.toISOString()?.slice(0, 10),
        r.direction,
        r.status,
        r.referralSource || '',
        r.destinationOrg || '',
        r.prospectName || '',
        r.serviceType || '',
        r.notes || '',
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="referrals-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'referrals.export');
  }
});

module.exports = router;
