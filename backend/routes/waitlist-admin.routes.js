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
const Appointment = require('../models/Appointment');
const wl = require('../services/waitingListService');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize'); // W451
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// W451: branch-scope waitlist admin. WaitingListEntry carries branchId.
// Pre-W451 PATCH /:id was a bare findByIdAndUpdate(req.params.id, req.body)
// — mass-assignment + tenant-takeover (set branchId to move waiter to
// another branch).
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

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

function buildFilter(q, req) {
  const f = { ...branchFilter(req) };
  if (q.status && ['waiting', 'offered', 'enrolled', 'withdrawn', 'lapsed'].includes(q.status))
    f.status = q.status;
  // Cross-branch roles get branchFilter(req)={}; honour explicit ?branchId then.
  if (!f.branchId && q.branchId && mongoose.isValidObjectId(q.branchId)) f.branchId = q.branchId;
  if (q.serviceType) f.serviceType = String(q.serviceType);
  if (q.priority) f.priority = Number(q.priority);
  return f;
}

function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function buildCapacityBuckets({
  waiters,
  completedByType,
  upcomingByType,
  noShowByType,
  historyDays,
  horizonDays,
}) {
  const byType = new Map();
  const keys = new Set([
    ...Object.keys(waiters),
    ...Object.keys(completedByType),
    ...Object.keys(upcomingByType),
    ...Object.keys(noShowByType),
  ]);
  for (const serviceType of keys) {
    const waiting = waiters[serviceType] || [];
    const completed = completedByType[serviceType] || 0;
    const upcoming = upcomingByType[serviceType] || 0;
    const noShows = noShowByType[serviceType] || 0;
    const denom = completed + noShows;
    const noShowRate = denom > 0 ? noShows / denom : 0;
    const throughputPerWeek = completed / Math.max(1, historyDays / 7);
    const capacityHorizon = Math.round(throughputPerWeek * (horizonDays / 7));
    const reclaimed = Math.round(noShowRate * upcoming);
    const availableSlots = Math.max(0, capacityHorizon - upcoming + reclaimed);
    const recommendedOffers = Math.min(waiting.length, availableSlots);
    byType.set(serviceType, {
      serviceType,
      waiting: waiting.length,
      throughputPerWeek: Math.round(throughputPerWeek * 10) / 10,
      upcoming,
      noShowRate: Math.round(noShowRate * 100) / 100,
      reclaimedSlots: reclaimed,
      availableSlots,
      recommendedOffers,
    });
  }
  return byType;
}

function queueRecommendations(waitersByType, buckets, now = new Date()) {
  const recommendations = [];
  for (const [serviceType, bucket] of buckets.entries()) {
    if (bucket.recommendedOffers <= 0) continue;
    const ordered = wl.prioritize(waitersByType[serviceType] || []);
    ordered.slice(0, bucket.recommendedOffers).forEach((row, idx) => {
      const queueWeeks = Math.ceil((idx + 1) / Math.max(bucket.throughputPerWeek || 1, 1));
      recommendations.push({
        entryId: row._id,
        serviceType: row.serviceType,
        priority: row.priority,
        requestedAt: row.requestedAt,
        daysWaiting: row.requestedAt ? daysBetween(row.requestedAt, now) : null,
        estimatedWaitDays: queueWeeks * 7,
        reason:
          bucket.availableSlots > 0
            ? 'available_capacity'
            : bucket.reclaimedSlots > 0
              ? 'no_show_recovery'
              : 'queue_order',
      });
    });
  }
  return recommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.requestedAt) - new Date(b.requestedAt);
  });
}

async function computeOptimizerContext(req, horizonDays, historyDays, now = new Date()) {
  const scope = branchFilter(req);
  const futureEnd = new Date(now.getTime() + horizonDays * 86400000);
  const historyStart = new Date(now.getTime() - historyDays * 86400000);

  const [waiters, historicalAppts, upcomingAppts] = await Promise.all([
    WaitingListEntry.find({ status: 'waiting', ...scope })
      .select('_id serviceType priority requestedAt')
      .lean(),
    Appointment.find({
      ...scope,
      date: { $gte: historyStart, $lte: now },
      status: { $in: ['COMPLETED', 'NO_SHOW'] },
    })
      .select('type status')
      .lean(),
    Appointment.find({
      ...scope,
      date: { $gte: now, $lte: futureEnd },
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
    })
      .select('type date startTime')
      .lean(),
  ]);

  const waitersByType = waiters.reduce((acc, row) => {
    const key = row.serviceType || 'أخرى';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
  const completedByType = {};
  const noShowByType = {};
  for (const a of historicalAppts) {
    const key = a.type || 'أخرى';
    if (a.status === 'COMPLETED') completedByType[key] = (completedByType[key] || 0) + 1;
    if (a.status === 'NO_SHOW') noShowByType[key] = (noShowByType[key] || 0) + 1;
  }
  const upcomingByType = upcomingAppts.reduce((acc, a) => {
    const key = a.type || 'أخرى';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const buckets = buildCapacityBuckets({
    waiters: waitersByType,
    completedByType,
    upcomingByType,
    noShowByType,
    historyDays,
    horizonDays,
  });
  const recommendations = queueRecommendations(waitersByType, buckets, now);
  const byServiceType = Array.from(buckets.values()).sort((a, b) =>
    String(a.serviceType).localeCompare(String(b.serviceType))
  );
  return {
    waiters,
    upcomingAppts,
    recommendations,
    byServiceType,
  };
}

const SLOT_START_TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
const WEEKDAY_INDEXES = new Set([0, 1, 2, 3, 4]); // Sunday..Thursday

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function generateServiceTypeSlots(upcomingAppts, horizonDays, now = new Date()) {
  const occupied = {};
  for (const appt of upcomingAppts) {
    const t = appt.type || 'أخرى';
    const key = `${dateKey(appt.date)}#${appt.startTime || ''}`;
    if (!occupied[t]) occupied[t] = new Set();
    occupied[t].add(key);
  }

  const slotsByType = {};
  const services = new Set(Object.keys(occupied));
  services.add('علاج طبيعي');
  services.add('علاج وظيفي');
  services.add('نطق وتخاطب');
  services.add('علاج سلوكي');
  services.add('علاج نفسي');
  services.add('أخرى');

  for (const serviceType of services) {
    const o = occupied[serviceType] || new Set();
    const slots = [];
    for (let i = 1; i <= horizonDays; i++) {
      const day = new Date(now.getTime() + i * 86400000);
      if (!WEEKDAY_INDEXES.has(day.getDay())) continue;
      const keyDay = dateKey(day);
      for (const startTime of SLOT_START_TIMES) {
        if (o.has(`${keyDay}#${startTime}`)) continue;
        slots.push({
          date: keyDay,
          startTime,
          durationMinutes: 60,
        });
      }
    }
    slotsByType[serviceType] = slots;
  }

  return slotsByType;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query, req);
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
    const all = await WaitingListEntry.find(branchFilter(req)).lean();
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
    const waiters = await WaitingListEntry.find({ status: 'waiting', ...branchFilter(req) }).lean();
    res.json({ success: true, items: wl.prioritize(waiters) });
  } catch (err) {
    return safeError(res, err, 'waitlist.prioritized');
  }
});

router.get('/optimizer/recommendations', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const horizonDays = Math.min(60, Math.max(7, parseInt(req.query.days, 10) || 14));
    const historyDays = Math.min(120, Math.max(14, parseInt(req.query.historyDays, 10) || 30));
    const { waiters, upcomingAppts, recommendations, byServiceType } =
      await computeOptimizerContext(req, horizonDays, historyDays, now);

    const summary = {
      horizonDays,
      historyDays,
      waitingCount: waiters.length,
      upcomingAppointments: upcomingAppts.length,
      recommendedOffers: recommendations.length,
    };

    res.json({ success: true, summary, byServiceType, recommendations });
  } catch (err) {
    return safeError(res, err, 'waitlist.optimizer.recommendations');
  }
});

router.post('/optimizer/offer-batch', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const horizonDays = Math.min(60, Math.max(7, parseInt(req.body?.days, 10) || 14));
    const historyDays = Math.min(120, Math.max(14, parseInt(req.body?.historyDays, 10) || 30));
    const limit = Math.min(100, Math.max(1, parseInt(req.body?.limit, 10) || 10));
    const dryRun = req.body?.apply === true ? false : true;

    const { recommendations } = await computeOptimizerContext(req, horizonDays, historyDays, now);
    const selected = recommendations.slice(0, limit);
    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        selectedCount: selected.length,
        selected,
      });
    }

    const offerExpiresAt = new Date(Date.now() + wl.THRESHOLDS.offerWindowDays * 86400000);
    const results = [];
    for (const rec of selected) {
      const updated = await WaitingListEntry.findOneAndUpdate(
        {
          _id: rec.entryId,
          status: 'waiting',
          ...branchFilter(req),
        },
        {
          status: 'offered',
          offeredAt: new Date(),
          offerExpiresAt,
          statusChangedAt: new Date(),
        },
        { returnDocument: 'after' }
      ).lean();
      results.push({
        entryId: rec.entryId,
        offered: !!updated,
      });
    }

    return res.json({
      success: true,
      dryRun: false,
      selectedCount: selected.length,
      offeredCount: results.filter(r => r.offered).length,
      results,
    });
  } catch (err) {
    return safeError(res, err, 'waitlist.optimizer.offerBatch');
  }
});

router.get('/optimizer/schedule-suggestions', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const horizonDays = Math.min(60, Math.max(7, parseInt(req.query.days, 10) || 14));
    const historyDays = Math.min(120, Math.max(14, parseInt(req.query.historyDays, 10) || 30));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const windowsPerEntry = Math.min(5, Math.max(1, parseInt(req.query.windowsPerEntry, 10) || 3));

    const { recommendations, upcomingAppts } = await computeOptimizerContext(
      req,
      horizonDays,
      historyDays,
      now
    );
    const selected = recommendations.slice(0, limit);
    const slotsByType = generateServiceTypeSlots(upcomingAppts, horizonDays, now);

    const data = selected.map((rec, idx) => {
      const serviceSlots = slotsByType[rec.serviceType] || [];
      if (serviceSlots.length === 0) {
        return {
          ...rec,
          suggestedWindows: [],
        };
      }
      const startIdx = idx % serviceSlots.length;
      const suggestedWindows = [];
      for (let i = 0; i < windowsPerEntry && i < serviceSlots.length; i++) {
        suggestedWindows.push(serviceSlots[(startIdx + i) % serviceSlots.length]);
      }
      return {
        ...rec,
        suggestedWindows,
      };
    });

    return res.json({
      success: true,
      summary: {
        horizonDays,
        historyDays,
        selectedCount: data.length,
        windowsPerEntry,
      },
      data,
    });
  } catch (err) {
    return safeError(res, err, 'waitlist.optimizer.scheduleSuggestions');
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
    const body = stripUpdateMeta(req.body || {});
    delete body.branchId;
    const row = await WaitingListEntry.create({
      ...body,
      branchId: req.branchScope?.branchId ?? body.branchId,
      createdBy: req.user?.id,
      requestedAt: body.requestedAt ? new Date(body.requestedAt) : new Date(),
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
    // W451: branch-scoped + sanitized update. Pre-W451: bare
    // findByIdAndUpdate(req.params.id, req.body) — mass-assignment
    // of branchId / _id / __v / __proto__ / etc + tenant-takeover.
    const body = stripUpdateMeta(req.body || {});
    delete body.branchId; // tenant-takeover defense
    const row = await WaitingListEntry.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      body,
      { returnDocument: 'after' }
    );
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'waitlist.patch');
  }
});

async function statusTransition(req, id, patch) {
  return WaitingListEntry.findOneAndUpdate(
    { _id: id, ...branchFilter(req) },
    { ...patch, statusChangedAt: new Date() },
    { returnDocument: 'after' }
  );
}

router.post('/:id/offer', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const offerExpiresAt = new Date(Date.now() + wl.THRESHOLDS.offerWindowDays * 86400000);
    const row = await statusTransition(req, req.params.id, {
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
    const row = await statusTransition(req, req.params.id, {
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
    const row = await statusTransition(req, req.params.id, {
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
    const row = await WaitingListEntry.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'waitlist.delete');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query, req);
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
