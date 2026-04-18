/**
 * adapter-audit.routes.js — PDPL-compliant audit trail viewer.
 *
 * Mount at /api/admin/adapter-audit.
 *
 * The audit rows NEVER contain raw PII — targetHash is a one-way SHA-256
 * so operators can confirm "was this ID accessed?" by hashing a candidate
 * ID client-side and filtering, but they cannot enumerate the IDs from
 * the log itself.
 *
 * Endpoints:
 *   GET /            — paginated list + filters (provider, actor, from/to)
 *   GET /stats       — per-provider counts + success rate + avg latency
 *   GET /by-entity   — trail for a specific Employee/Beneficiary/Branch
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AdapterAudit = require('../models/AdapterAudit');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'compliance_officer',
  'dpo', // data protection officer
];

// ── GET / — paginated list ───────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const {
      provider,
      actorEmail,
      success,
      status,
      from,
      to,
      entityKind,
      entityId,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (provider) filter.provider = provider;
    if (actorEmail) {
      const rx = new RegExp(
        String(actorEmail)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      filter.actorEmail = rx;
    }
    if (success != null) filter.success = success === 'true' || success === true;
    if (status) filter.status = status;
    if (entityKind) filter['entityRef.kind'] = entityKind;
    if (entityId && mongoose.isValidObjectId(entityId)) filter['entityRef.id'] = entityId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      AdapterAudit.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      AdapterAudit.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'adapter-audit.list');
  }
});

// ── GET /stats — rollup ──────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [total, last30, byProvider, successRate, topActors] = await Promise.all([
      AdapterAudit.countDocuments({}),
      AdapterAudit.countDocuments({ createdAt: { $gte: since } }),
      AdapterAudit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$provider',
            count: { $sum: 1 },
            successCount: { $sum: { $cond: ['$success', 1, 0] } },
            avgLatency: { $avg: '$latencyMs' },
          },
        },
        { $sort: { count: -1 } },
      ]),
      AdapterAudit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: { $sum: { $cond: ['$success', 1, 0] } },
          },
        },
      ]),
      AdapterAudit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$actorEmail', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const sr = successRate[0] || { total: 0, successful: 0 };
    res.json({
      success: true,
      total,
      last30days: last30,
      overallSuccessRate: sr.total ? Math.round((sr.successful / sr.total) * 100) : null,
      byProvider: byProvider.map(p => ({
        provider: p._id,
        count: p.count,
        successCount: p.successCount,
        successRate: p.count ? Math.round((p.successCount / p.count) * 100) : null,
        avgLatencyMs: p.avgLatency ? Math.round(p.avgLatency) : null,
      })),
      topActors: topActors.map(a => ({ actorEmail: a._id || '(system)', count: a.count })),
    });
  } catch (err) {
    return safeError(res, err, 'adapter-audit.stats');
  }
});

// ── GET /by-correlation/:id — all adapter calls within one HTTP request ─
// Example: HR onboarding POST fires GOSI + SCFHS + Qiwa + Muqeem in one
// request. Querying by correlationId surfaces all four rows together —
// useful for PDPL DSAR, debugging cascade failures, or replaying flows.
router.get('/by-correlation/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    const id = String(req.params.id).slice(0, 128);
    const items = await AdapterAudit.find({ correlationId: id })
      .sort({ createdAt: 1 }) // chronological — order of calls matters
      .limit(200)
      .lean();
    res.json({ success: true, correlationId: id, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'adapter-audit.byCorrelation');
  }
});

// ── GET /by-entity — trail for a specific local record ──────────────────
router.get('/by-entity', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { entityKind, entityId, limit = 100 } = req.query;
    if (!entityKind || !entityId || !mongoose.isValidObjectId(entityId)) {
      return res.status(400).json({ success: false, message: 'entityKind + entityId مطلوبان' });
    }
    const items = await AdapterAudit.find({
      'entityRef.kind': entityKind,
      'entityRef.id': entityId,
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(500, parseInt(limit, 10) || 100))
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'adapter-audit.byEntity');
  }
});

// ── GET /export.csv — compliance export ──────────────────────────────────
// CSV with the same filters as GET /. Capped at 10k rows to avoid OOM;
// if you need more, narrow the date range or export a month at a time.
router.get('/export.csv', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { provider, actorEmail, success, status, from, to, entityKind } = req.query;
    const filter = {};
    if (provider) filter.provider = provider;
    if (actorEmail) {
      const rx = new RegExp(
        String(actorEmail)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      filter.actorEmail = rx;
    }
    if (success != null) filter.success = success === 'true' || success === true;
    if (status) filter.status = status;
    if (entityKind) filter['entityRef.kind'] = entityKind;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const items = await AdapterAudit.find(filter).sort({ createdAt: -1 }).limit(10_000).lean();

    const csvEscape = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const header = [
      'createdAt',
      'provider',
      'operation',
      'mode',
      'status',
      'success',
      'latencyMs',
      'actorEmail',
      'actorRole',
      'targetKind',
      'targetHash',
      'entityKind',
      'entityId',
      'ipHash',
      'errorMessage',
    ];
    const rows = items.map(r =>
      [
        r.createdAt?.toISOString(),
        r.provider,
        r.operation,
        r.mode,
        r.status,
        r.success,
        r.latencyMs,
        r.actorEmail,
        r.actorRole,
        r.targetKind,
        r.targetHash,
        r.entityRef?.kind,
        r.entityRef?.id,
        r.ipHash,
        r.errorMessage,
      ]
        .map(csvEscape)
        .join(',')
    );

    // UTF-8 BOM so Excel on Windows renders Arabic correctly
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    const filename = `adapter-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'adapter-audit.export');
  }
});

module.exports = router;
