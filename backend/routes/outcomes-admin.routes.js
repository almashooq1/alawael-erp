/**
 * outcomes-admin.routes.js — Clinical outcome trajectory admin surface.
 *
 * Mount at /api/admin/outcomes.
 *
 * Read-only — clinical assessments themselves are written via the
 * existing /api/admin/assessments routes. This surface computes
 * derived metrics (trajectory, deltas, milestones, per-tool rollup)
 * over those records using the pure outcomeService.
 *
 * Endpoints:
 *   GET  /                                — per-tool rollup over the global window
 *   GET  /beneficiary/:id                 — full trajectory + summary + milestones
 *   GET  /beneficiary/:id/comparison      — baseline-vs-latest delta
 *   GET  /overview                        — trend distribution + at-risk watchlist
 *   GET  /export.csv                      — UTF-8-BOM CSV trajectory export
 *
 * Read by clinical staff; export by admin/HR for CBAHI/insurance audits.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const ClinicalAssessment = require('../models/ClinicalAssessment');
const Beneficiary = require('../models/Beneficiary');
const outcome = require('../services/outcomeService');
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
  'therapist',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

function buildFilter(query) {
  const filter = {};
  if (query.beneficiaryId && mongoose.isValidObjectId(query.beneficiaryId)) {
    filter.beneficiary = query.beneficiaryId;
  }
  if (query.tool) filter.tool = String(query.tool);
  if (query.from || query.to) {
    filter.assessmentDate = {};
    if (query.from) filter.assessmentDate.$gte = new Date(query.from);
    if (query.to) {
      const d = new Date(query.to);
      d.setHours(23, 59, 59, 999);
      filter.assessmentDate.$lte = d;
    }
  }
  return filter;
}

// ── GET / — per-tool rollup ─────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const items = await ClinicalAssessment.find(filter).limit(10_000).lean();
    const summary = outcome.summarizeByTool(items);
    res.json({ success: true, summary, totalAssessments: items.length });
  } catch (err) {
    return safeError(res, err, 'outcomes.byTool');
  }
});

// ── GET /beneficiary/:id — full trajectory ──────────────────────────────
router.get('/beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await ClinicalAssessment.find({ beneficiary: req.params.id })
      .sort({ assessmentDate: 1 })
      .lean();
    const tool = req.query.tool ? String(req.query.tool) : null;
    const series = outcome.trajectory(items, tool);
    res.json({
      success: true,
      count: items.length,
      tool,
      trajectory: series,
      trend: outcome.trendDirection(series),
      comparison: outcome.compareToBaseline(series),
      milestones: outcome.milestones(series),
      perTool: outcome.summarizeByTool(items),
    });
  } catch (err) {
    return safeError(res, err, 'outcomes.byBeneficiary');
  }
});

// ── GET /beneficiary/:id/comparison ─────────────────────────────────────
router.get('/beneficiary/:id/comparison', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await ClinicalAssessment.find({ beneficiary: req.params.id })
      .sort({ assessmentDate: 1 })
      .lean();
    const tool = req.query.tool ? String(req.query.tool) : null;
    const series = outcome.trajectory(items, tool);
    res.json({
      success: true,
      tool,
      comparison: outcome.compareToBaseline(series),
    });
  } catch (err) {
    return safeError(res, err, 'outcomes.comparison');
  }
});

// ── GET /overview — trend distribution + at-risk ────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    // Pull beneficiaries with at least one assessment in the last year.
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const recent = await ClinicalAssessment.find({ assessmentDate: { $gte: oneYearAgo } }).lean();

    // Group assessments by beneficiary in memory (no N+1).
    const byBenef = new Map();
    for (const r of recent) {
      const id = String(r.beneficiary || '');
      if (!byBenef.has(id)) byBenef.set(id, []);
      byBenef.get(id).push(r);
    }

    const trendCounts = { improving: 0, steady: 0, declining: 0, insufficient: 0 };
    const declining = []; // at-risk watchlist
    for (const [beneficiaryId, items] of byBenef) {
      const series = outcome.trajectory(items);
      const trend = outcome.trendDirection(series);
      trendCounts[trend] = (trendCounts[trend] || 0) + 1;
      if (trend === 'declining') {
        const cmp = outcome.compareToBaseline(series);
        declining.push({
          beneficiaryId,
          delta: cmp?.delta,
          latestScore: series[series.length - 1]?.score,
          assessments: series.length,
        });
      }
    }

    // Hydrate names for the at-risk list only.
    const ids = declining.map(d => d.beneficiaryId).filter(id => mongoose.isValidObjectId(id));
    const benefs = ids.length
      ? await Beneficiary.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar beneficiaryNumber')
          .lean()
      : [];
    const benefMap = new Map(benefs.map(b => [String(b._id), b]));
    const declHydrated = declining
      .map(d => ({
        ...d,
        name:
          [benefMap.get(d.beneficiaryId)?.firstName_ar, benefMap.get(d.beneficiaryId)?.lastName_ar]
            .filter(Boolean)
            .join(' ') || '—',
        beneficiaryNumber: benefMap.get(d.beneficiaryId)?.beneficiaryNumber || null,
      }))
      .sort((a, b) => (a.delta || 0) - (b.delta || 0));

    res.json({
      success: true,
      windowDays: 365,
      totalBeneficiaries: byBenef.size,
      trendCounts,
      declining: declHydrated,
    });
  } catch (err) {
    return safeError(res, err, 'outcomes.overview');
  }
});

// ── GET /export.csv ─────────────────────────────────────────────────────
router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const EXPORT_LIMIT = 10_000;
    const totalMatching = await ClinicalAssessment.countDocuments(filter);
    const items = await ClinicalAssessment.find(filter)
      .sort({ assessmentDate: 1 })
      .limit(EXPORT_LIMIT)
      .lean();
    res.set('X-Total-Count', String(totalMatching));
    if (totalMatching > EXPORT_LIMIT) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', String(EXPORT_LIMIT));
    }

    const ids = [...new Set(items.map(r => String(r.beneficiary)).filter(Boolean))];
    const benefs = ids.length
      ? await Beneficiary.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar beneficiaryNumber')
          .lean()
      : [];
    const benefMap = new Map(benefs.map(b => [String(b._id), b]));

    const csvEscape = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = [
      'assessmentDate',
      'beneficiaryNumber',
      'beneficiaryName',
      'tool',
      'toolVersion',
      'score',
      'rawScore',
      'maxRawScore',
      'interpretation',
      'category',
    ];
    const rows = items.map(r => {
      const b = benefMap.get(String(r.beneficiary));
      return [
        r.assessmentDate?.toISOString()?.slice(0, 10),
        b?.beneficiaryNumber || '',
        b ? [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') : '',
        r.tool,
        r.toolVersion || '',
        r.score,
        r.rawScore,
        r.maxRawScore,
        r.interpretation || '',
        r.category || '',
      ]
        .map(csvEscape)
        .join(',');
    });
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    const filename = `outcomes-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'outcomes.export');
  }
});

module.exports = router;
