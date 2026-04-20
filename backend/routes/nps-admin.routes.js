/**
 * nps-admin.routes.js — Family-satisfaction (NPS) admin surface.
 *
 * Mount at /api/admin/nps. Public guardian-facing submission lives
 * under /api/public/nps (separate file — no auth, signed link).
 *
 * Endpoints (admin):
 *   GET    /                 — paginated responses + filters
 *   GET    /overview         — current-period NPS + bucket breakdown
 *                              + at-risk detractors with comments
 *   GET    /trend            — monthly NPS trend series
 *   GET    /campaigns        — list of distinct surveyKeys with sample/nps
 *   GET    /themes           — top recurring words across comments
 *   POST   /                 — admin-side response entry (in_person)
 *   PATCH  /:id              — correct (admin only)
 *   DELETE /:id              — (admin only)
 *   GET    /export.csv       — UTF-8-BOM CSV
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const NpsResponse = require('../models/NpsResponse');
const Guardian = require('../models/Guardian');
const nps = require('../services/npsService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'hr_manager',
  'clinical_supervisor',
  'cqo',
  'head_office_cqo',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'hr_manager',
  'receptionist',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

function buildFilter(query) {
  const filter = {};
  if (query.surveyKey) filter.surveyKey = String(query.surveyKey);
  if (query.bucket && ['detractor', 'passive', 'promoter'].includes(query.bucket)) {
    filter.bucket = query.bucket;
  }
  if (query.branchId && mongoose.isValidObjectId(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.from || query.to) {
    filter.submittedAt = {};
    if (query.from) filter.submittedAt.$gte = new Date(query.from);
    if (query.to) {
      const d = new Date(query.to);
      d.setHours(23, 59, 59, 999);
      filter.submittedAt.$lte = d;
    }
  }
  return filter;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      NpsResponse.find(filter)
        .sort({ submittedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      NpsResponse.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'nps.list');
  }
});

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    // Default window: last 90 days unless surveyKey scopes it.
    const filter = {};
    if (req.query.surveyKey) {
      filter.surveyKey = String(req.query.surveyKey);
    } else {
      filter.submittedAt = { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
    }
    const items = await NpsResponse.find(filter).lean();
    const summary = nps.summarize(items);
    const detractors = items
      .filter(r => r.bucket === 'detractor' && r.comment)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 20);
    res.json({
      success: true,
      windowDays: req.query.surveyKey ? null : 90,
      summary,
      recentDetractorsWithComments: detractors,
    });
  } catch (err) {
    return safeError(res, err, 'nps.overview');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const items = await NpsResponse.find({}).limit(10_000).lean();
    const series = nps.trendByPeriod(items, r => new Date(r.submittedAt).toISOString().slice(0, 7));
    res.json({ success: true, series });
  } catch (err) {
    return safeError(res, err, 'nps.trend');
  }
});

router.get('/campaigns', requireRole(READ_ROLES), async (req, res) => {
  try {
    const items = await NpsResponse.find({}).limit(20_000).lean();
    const series = nps.trendByPeriod(items, r => r.surveyKey || 'no-key');
    res.json({ success: true, campaigns: series });
  } catch (err) {
    return safeError(res, err, 'nps.campaigns');
  }
});

router.get('/themes', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const items = await NpsResponse.find(filter).select('comment bucket').limit(5_000).lean();
    const all = items.map(r => r.comment).filter(Boolean);
    const detractor = items
      .filter(r => r.bucket === 'detractor')
      .map(r => r.comment)
      .filter(Boolean);
    const promoter = items
      .filter(r => r.bucket === 'promoter')
      .map(r => r.comment)
      .filter(Boolean);
    res.json({
      success: true,
      sample: all.length,
      all: nps.topThemes(all, 15),
      detractor: nps.topThemes(detractor, 15),
      promoter: nps.topThemes(promoter, 15),
    });
  } catch (err) {
    return safeError(res, err, 'nps.themes');
  }
});

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { surveyKey, guardianId, score } = req.body || {};
    if (!surveyKey) return res.status(400).json({ success: false, message: 'surveyKey مطلوب' });
    if (!guardianId || !mongoose.isValidObjectId(guardianId)) {
      return res.status(400).json({ success: false, message: 'guardianId مطلوب' });
    }
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0 || s > 10) {
      return res.status(400).json({ success: false, message: 'score يجب أن يكون 0..10' });
    }
    const row = await NpsResponse.create({
      ...req.body,
      score: s,
      bucket: nps.bucket(s),
      sourceChannel: req.body.sourceChannel || 'in_person',
      submittedAt: req.body.submittedAt ? new Date(req.body.submittedAt) : new Date(),
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'nps.create');
  }
});

router.patch('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    // Re-bucket if score changes.
    if (body.score != null) {
      body.score = Number(body.score);
      body.bucket = nps.bucket(body.score);
    }
    delete body.surveyKey;
    delete body.guardianId;
    const row = await NpsResponse.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'nps.patch');
  }
});

router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await NpsResponse.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'nps.delete');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const EXPORT_LIMIT = 10_000;
    const totalMatching = await NpsResponse.countDocuments(filter);
    const items = await NpsResponse.find(filter)
      .sort({ submittedAt: -1 })
      .limit(EXPORT_LIMIT)
      .lean();
    res.set('X-Total-Count', String(totalMatching));
    if (totalMatching > EXPORT_LIMIT) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', String(EXPORT_LIMIT));
    }

    const ids = [...new Set(items.map(r => String(r.guardianId)).filter(Boolean))];
    const guards = ids.length
      ? await Guardian.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar email')
          .lean()
      : [];
    const gMap = new Map(guards.map(g => [String(g._id), g]));

    const csvEscape = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = [
      'submittedAt',
      'surveyKey',
      'guardianName',
      'guardianEmail',
      'score',
      'bucket',
      'sourceChannel',
      'comment',
    ];
    const rows = items.map(r => {
      const g = gMap.get(String(r.guardianId));
      return [
        r.submittedAt?.toISOString()?.slice(0, 10),
        r.surveyKey,
        g ? [g.firstName_ar, g.lastName_ar].filter(Boolean).join(' ') : '',
        g?.email || '',
        r.score,
        r.bucket,
        r.sourceChannel,
        r.comment || '',
      ]
        .map(csvEscape)
        .join(',');
    });
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="nps-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'nps.export');
  }
});

module.exports = router;
