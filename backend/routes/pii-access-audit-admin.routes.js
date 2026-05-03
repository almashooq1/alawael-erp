/**
 * pii-access-audit-admin.routes.js — admin query interface for the
 * PII access audit log produced by `middleware/piiAccess.middleware.js`.
 *
 * Mount at /api/admin/pii-access-audit (via _registry.js dualMount).
 *
 * What this exposes:
 *   GET /             — list with filters (targetType, targetId,
 *                       userId, fromDate, toDate, limit, skip)
 *   GET /by-target    — quick "who viewed user X" lookup
 *
 * Reads ONLY — there's no write endpoint here. PII access entries are
 * authored by the middleware on every successful 2xx read of a
 * sensitive resource.
 *
 * RBAC:
 *   • dpo / compliance_officer / admin / superadmin can read
 *   • Other roles get 403 — the access log itself is sensitive (it
 *     reveals who is interested in whom)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const { AuditLog } = require('../models/auditLog.model');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'dpo', 'compliance_officer'];

const PII_EVENT_TYPE = 'pii.access.read';

// ── GET / — list with filters ────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { targetType, targetId, userId, fromDate, toDate, page = 1, limit = 50 } = req.query;

    const filter = { eventType: PII_EVENT_TYPE };
    if (targetType) filter['metadata.targetType'] = String(targetType);
    if (targetId) filter['metadata.targetId'] = String(targetId);
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter.userId = userId;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));

    const [rows, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({ success: true, page: p, limit: l, total, data: rows });
  } catch (err) {
    return safeError(res, err, 'pii-access.list');
  }
});

// ── GET /by-target — "who viewed X" quick lookup ────────────────────────
router.get('/by-target', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { targetType, targetId, days = 90 } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, message: 'targetType و targetId مطلوبان' });
    }

    const since = new Date(Date.now() - Math.min(365, Number(days) || 90) * 24 * 60 * 60 * 1000);

    const rows = await AuditLog.find({
      eventType: PII_EVENT_TYPE,
      'metadata.targetType': String(targetType),
      'metadata.targetId': String(targetId),
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Aggregate distinct viewers
    const viewers = new Map();
    for (const r of rows) {
      const uid = String(r.userId);
      if (!viewers.has(uid)) {
        viewers.set(uid, { userId: uid, count: 0, firstSeen: r.createdAt, lastSeen: r.createdAt });
      }
      const v = viewers.get(uid);
      v.count++;
      if (r.createdAt < v.firstSeen) v.firstSeen = r.createdAt;
      if (r.createdAt > v.lastSeen) v.lastSeen = r.createdAt;
    }

    return res.json({
      success: true,
      target: { type: targetType, id: targetId },
      windowDays: Number(days),
      totalAccesses: rows.length,
      uniqueViewers: viewers.size,
      viewers: Array.from(viewers.values()).sort((a, b) => b.count - a.count),
      recent: rows.slice(0, 50),
    });
  } catch (err) {
    return safeError(res, err, 'pii-access.byTarget');
  }
});

module.exports = router;
