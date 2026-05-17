/**
 * rehab.routes.js
 * ══════════════════════════════════════════════════════════════════
 * Rehabilitation Disciplines & Goal Suggestions API
 * تخصصات التأهيل ومقترحات الأهداف
 *
 * Covers:
 *   rehabDisciplines.service.js   → /rehab/disciplines/*
 *   rehabGoalSuggestions.service.js → /rehab/goal-suggestions/*
 *
 * Mounted at: /api/v1/rehab
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Models ────────────────────────────────────────────────────────────────────
function Discipline() {
  try {
    return mongoose.model('RehabDiscipline');
  } catch (_e) {
    return mongoose.model(
      'RehabDiscipline',
      new mongoose.Schema(
        {
          code: { type: String, required: true, unique: true },
          name: { type: String, required: true },
          nameAr: String,
          description: String,
          programs: [{ code: String, name: String, duration: Number, goals: [String] }],
          interventions: [{ code: String, name: String, category: String }],
          measures: [{ code: String, name: String, type: String }],
          goalTemplates: [
            { code: String, title: String, domain: String, frequency: String, duration: Number },
          ],
          isActive: { type: Boolean, default: true },
        },
        { timestamps: true }
      )
    );
  }
}

// ══════════════════════ DISCIPLINES ══════════════════════════════════════════

router.get(
  '/disciplines/taxonomy',
  asyncHandler(async (_req, res) => {
    const M = Discipline();
    const data = await M.find({ isActive: true }).select('code name nameAr').lean();
    res.json({ success: true, data });
  })
);

router.get(
  '/disciplines/health',
  asyncHandler(async (_req, res) => {
    const M = Discipline();
    const count = await M.countDocuments({ isActive: true });
    res.json({ success: true, status: 'ok', count });
  })
);

router.get(
  '/disciplines/suggest',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const { q = '', limit = 10 } = req.query;
    const data = await M.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { nameAr: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data });
  })
);

router.get(
  '/disciplines',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const { limit = 50, skip = 0 } = req.query;
    const data = await M.find({ isActive: true }).skip(Number(skip)).limit(Number(limit)).lean();
    res.json({ success: true, data, total: data.length });
  })
);

router.get(
  '/disciplines/:id',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const doc = await M.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Discipline not found' });
    res.json({ success: true, data: doc });
  })
);

router.get(
  '/disciplines/:id/programs',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const doc = await M.findById(req.params.id).select('programs').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Discipline not found' });
    res.json({ success: true, data: doc.programs || [] });
  })
);

router.get(
  '/disciplines/:id/interventions',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const doc = await M.findById(req.params.id).select('interventions').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Discipline not found' });
    res.json({ success: true, data: doc.interventions || [] });
  })
);

router.get(
  '/disciplines/:id/measures',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const doc = await M.findById(req.params.id).select('measures').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Discipline not found' });
    res.json({ success: true, data: doc.measures || [] });
  })
);

router.get(
  '/disciplines/:id/goal-templates',
  asyncHandler(async (req, res) => {
    const M = Discipline();
    const doc = await M.findById(req.params.id).select('goalTemplates').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Discipline not found' });
    res.json({ success: true, data: doc.goalTemplates || [] });
  })
);

// ══════════════════════ GOAL SUGGESTIONS ═════════════════════════════════════

// Sample SMART goal templates catalog
const GOAL_CATALOG = [
  {
    code: 'MOB-001',
    domain: 'mobility',
    title: 'Improve walking distance',
    frequency: 'daily',
    duration: 4,
    score: 0.9,
  },
  {
    code: 'COG-001',
    domain: 'cognition',
    title: 'Improve attention span',
    frequency: '3x/week',
    duration: 6,
    score: 0.85,
  },
  {
    code: 'ADL-001',
    domain: 'adl',
    title: 'Independent dressing',
    frequency: 'daily',
    duration: 8,
    score: 0.8,
  },
  {
    code: 'COM-001',
    domain: 'communication',
    title: 'Improve verbal expression',
    frequency: '2x/week',
    duration: 6,
    score: 0.75,
  },
  {
    code: 'SOC-001',
    domain: 'social',
    title: 'Peer interaction in group',
    frequency: 'weekly',
    duration: 12,
    score: 0.7,
  },
];

const INTERVENTION_CATALOG = [
  { code: 'INT-MOB-001', domain: 'mobility', name: 'Gait training', type: 'physical' },
  { code: 'INT-COG-001', domain: 'cognition', name: 'Cognitive exercises', type: 'cognitive' },
  { code: 'INT-ADL-001', domain: 'adl', name: 'ADL practice sessions', type: 'occupational' },
];

router.get(
  '/goal-suggestions/goals',
  asyncHandler(async (req, res) => {
    const { domain, q = '' } = req.query;
    let goals = GOAL_CATALOG;
    if (domain) goals = goals.filter(g => g.domain === domain);
    if (q) goals = goals.filter(g => g.title.toLowerCase().includes(q.toLowerCase()));
    res.json({ success: true, data: goals });
  })
);

router.post(
  '/goal-suggestions/goals',
  asyncHandler(async (req, res) => {
    // Score goals based on beneficiary profile
    const { beneficiaryId, domains = [] } = req.body || {};
    let goals = GOAL_CATALOG;
    if (domains.length) goals = goals.filter(g => domains.includes(g.domain));
    // Sort by score descending
    goals = goals.slice().sort((a, b) => b.score - a.score);
    res.json({ success: true, data: goals, beneficiaryId });
  })
);

router.get(
  '/goal-suggestions/interventions',
  asyncHandler(async (req, res) => {
    const { domain, goalCode } = req.query;
    let interventions = INTERVENTION_CATALOG;
    if (domain) interventions = interventions.filter(i => i.domain === domain);
    if (goalCode)
      interventions = interventions.filter(i => i.code.includes(goalCode.split('-')[1] || ''));
    res.json({ success: true, data: interventions });
  })
);

router.get(
  '/goal-suggestions/draft',
  asyncHandler(async (req, res) => {
    const { templateCode, beneficiaryId } = req.query;
    const template = GOAL_CATALOG.find(g => g.code === templateCode) || GOAL_CATALOG[0];
    const draft = {
      ...template,
      beneficiaryId,
      status: 'draft',
      targetDate: new Date(Date.now() + (template.duration || 8) * 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    res.json({ success: true, data: draft });
  })
);

module.exports = router;
