/**
 * Activity Library Routes — Phase 27.
 * REST API for the rehab activity catalogue.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { Activity, DISCIPLINES, DOMAINS, DIFFICULTY } = require('../models/ActivityLibrary');
const { BUILT_IN_ACTIVITIES } = require('./activity-library-seed');
const safeError = require('../utils/safeError');

// ── GET /activities — list with filters + pagination ──
router.get('/activities', async (req, res) => {
  try {
    const { discipline, domain, difficulty, age_months, q } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = { is_active: true };
    if (discipline && DISCIPLINES.includes(discipline)) filter.discipline = discipline;
    if (domain && DOMAINS.includes(domain)) filter.target_domains = domain;
    if (difficulty && DIFFICULTY.includes(difficulty)) filter.difficulty = difficulty;

    const ageNum = parseInt(age_months, 10);
    if (Number.isFinite(ageNum) && ageNum > 0) {
      filter['age_range.min_months'] = { $lte: ageNum };
      filter['age_range.max_months'] = { $gte: ageNum };
    }

    if (q && q.trim()) {
      const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name_ar: { $regex: safe, $options: 'i' } },
        { description_ar: { $regex: safe, $options: 'i' } },
        { tags: { $regex: safe, $options: 'i' } },
        { activity_code: { $regex: safe, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Activity.find(filter)
        .sort({ usage_count: -1, name_ar: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);

    res.json({ success: true, total, page, limit, count: items.length, data: items });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

// ── GET /activities/disciplines — listing helpers for UI dropdowns ──
router.get('/activities/disciplines', (_req, res) => {
  const labels = {
    speech: 'علاج النطق واللغة',
    ot: 'علاج وظيفي',
    pt: 'علاج طبيعي',
    behavior: 'تحليل سلوكي / ABA',
    special_ed: 'تربية خاصة',
    psychology: 'نفسي',
    aac: 'تواصل بديل',
    feeding: 'علاج البلع',
    play: 'علاج باللعب',
    social_skills: 'مهارات اجتماعية',
  };
  res.json({
    success: true,
    data: DISCIPLINES.map(d => ({ value: d, label: labels[d] || d })),
  });
});

// ── GET /activities/stats — quick aggregate for dashboards ──
router.get('/activities/stats', async (_req, res) => {
  try {
    const [byDiscipline, byDifficulty, total] = await Promise.all([
      Activity.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$discipline', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Activity.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      Activity.countDocuments({ is_active: true }),
    ]);
    res.json({ success: true, data: { total, byDiscipline, byDifficulty } });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

// ── POST /activities/seed — load built-in activities (idempotent) ──
router.post('/activities/seed', async (_req, res) => {
  try {
    let inserted = 0;
    let skipped = 0;
    for (const a of BUILT_IN_ACTIVITIES) {
      const existing = await Activity.findOne({ activity_code: a.activity_code });
      if (existing) {
        skipped += 1;
        continue;
      }
      await Activity.create({ ...a, is_built_in: true, is_active: true });
      inserted += 1;
    }
    res.json({
      success: true,
      message: `تمت تهيئة المكتبة (${inserted} جديد، ${skipped} موجود مسبقاً)`,
      data: { inserted, skipped, total_built_in: BUILT_IN_ACTIVITIES.length },
    });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

// ── GET /activities/:id ──
router.get('/activities/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { activity_code: id };
    const activity = await Activity.findOne(filter).lean();
    if (!activity) return res.status(404).json({ success: false, error: 'النشاط غير موجود' });
    res.json({ success: true, data: activity });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

// ── POST /activities — create custom activity ──
router.post('/activities', async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.name_ar || !data.discipline) {
      return res.status(400).json({ success: false, error: 'name_ar و discipline مطلوبان' });
    }
    if (!DISCIPLINES.includes(data.discipline)) {
      return res.status(400).json({ success: false, error: 'discipline غير صالح' });
    }
    // Auto-generate code if missing
    if (!data.activity_code) {
      const prefix = data.discipline.toUpperCase().slice(0, 4);
      const count = await Activity.countDocuments({ discipline: data.discipline });
      data.activity_code = `${prefix}-CUSTOM-${String(count + 1).padStart(3, '0')}`;
    }
    if (req.user?._id) data.created_by = req.user._id;
    const activity = await Activity.create({ ...data, is_built_in: false });
    res.status(201).json({ success: true, message: 'تم إنشاء النشاط', data: activity });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

// ── PATCH /activities/:id ──
router.patch('/activities/:id', async (req, res) => {
  try {
    const allowed = [
      'name_ar',
      'name_en',
      'description_ar',
      'target_domains',
      'difficulty',
      'age_range',
      'duration_minutes',
      'materials',
      'instructions_steps',
      'mastery_indicators',
      'family_carryover_ar',
      'adaptations',
      'media',
      'progression_to',
      'evidence_reference',
      'tags',
      'is_active',
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const activity = await Activity.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
    });
    if (!activity) return res.status(404).json({ success: false, error: 'النشاط غير موجود' });
    res.json({ success: true, message: 'تم تحديث النشاط', data: activity });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

// ── POST /activities/:id/use — increment usage counter ──
router.post('/activities/:id/use', async (req, res) => {
  try {
    const inc = { usage_count: 1 };
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { $inc: inc },
      { returnDocument: 'after', projection: { usage_count: 1, name_ar: 1 } }
    );
    if (!activity) return res.status(404).json({ success: false, error: 'النشاط غير موجود' });
    res.json({ success: true, data: activity });
  } catch (err) {
    safeError(res, err, 'activity-library');
  }
});

module.exports = router;
