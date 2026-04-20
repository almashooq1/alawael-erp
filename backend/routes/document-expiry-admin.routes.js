/**
 * document-expiry-admin.routes.js — consolidated expiry radar.
 *
 * Mount at /api/admin/document-expiry.
 *
 * Endpoints:
 *   GET /overview      summarize + surge alarm
 *   GET /radar         watchlist (expired + critical + warning)
 *   GET /by-category   per-category breakdown (Document only)
 *   GET /upcoming      renewals in next N days
 *   GET /export.csv    watchlist dump (admin only)
 *
 * Merges three sources into a unified shape for the radar service:
 *   • Document.expiryDate       → source='document'
 *   • EmploymentContract.endDate → source='employment'
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Document = require('../models/Document');
const EmploymentContract = require('../models/EmploymentContract');
const rad = require('../services/documentExpiryRadarService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'legal',
  'quality',
  'ceo',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'legal'];

/**
 * Pull both sources and normalise into the shape the service expects.
 * Kept small — only fields needed for classification + display.
 */
async function loadUnified() {
  const [docs, contracts] = await Promise.all([
    Document.find({ expiryDate: { $ne: null } })
      .select('_id title category expiryDate uploadedBy')
      .lean(),
    EmploymentContract.find({ endDate: { $ne: null }, status: { $in: ['active', 'renewed'] } })
      .select('_id employee endDate contractType status')
      .lean(),
  ]);
  const items = [];
  for (const d of docs) {
    items.push({
      _id: d._id,
      source: 'document',
      category: d.category || 'أخرى',
      title: d.title || '',
      expiryDate: d.expiryDate,
      status: null,
      owner: d.uploadedBy ? String(d.uploadedBy) : null,
    });
  }
  for (const c of contracts) {
    items.push({
      _id: c._id,
      source: 'employment',
      category: `عقد ${c.contractType || 'عمل'}`,
      title: `عقد موظف`,
      expiryDate: c.endDate,
      status: c.status,
      owner: c.employee ? String(c.employee) : null,
    });
  }
  return items;
}

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const items = await loadUnified();
    const summary = rad.summarize(items);
    const surge = rad.detectSurge(items);
    res.json({
      success: true,
      summary,
      surge,
      thresholds: {
        criticalDays: rad.THRESHOLDS.criticalDays,
        warningDays: rad.THRESHOLDS.warningDays,
        surgePct: rad.THRESHOLDS.surgePct,
      },
    });
  } catch (err) {
    return safeError(res, err, 'docExpiry.overview');
  }
});

router.get('/radar', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const items = await loadUnified();
    res.json({ success: true, items: rad.radarList(items, new Date(), n) });
  } catch (err) {
    return safeError(res, err, 'docExpiry.radar');
  }
});

router.get('/by-category', requireRole(READ_ROLES), async (req, res) => {
  try {
    const items = await loadUnified();
    res.json({ success: true, items: rad.byCategory(items) });
  } catch (err) {
    return safeError(res, err, 'docExpiry.byCategory');
  }
});

router.get('/upcoming', requireRole(READ_ROLES), async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const items = await loadUnified();
    res.json({ success: true, days, items: rad.upcomingRenewals(items, days) });
  } catch (err) {
    return safeError(res, err, 'docExpiry.upcoming');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const items = await loadUnified();
    const list = rad.radarList(items, new Date(), 10_000);
    res.set('X-Total-Count', String(list.length));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'source',
      'category',
      'title',
      'expiryDate',
      'daysUntilExpiry',
      'window',
      'status',
    ];
    const rows = list.map(r =>
      [
        r.source,
        r.category || '',
        r.title || '',
        r.expiryDate?.slice(0, 10) || '',
        r.daysUntilExpiry,
        r.window,
        r.status || '',
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="document-expiry-radar-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'docExpiry.export');
  }
});

module.exports = router;
