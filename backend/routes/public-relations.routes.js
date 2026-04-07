/**
 * Public Relations Routes — مسارات العلاقات العامة والإعلام
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { safeError } = require('../utils/safeError');

const safeModel = n =>
  mongoose.models[n] ? mongoose.model(n) : require(`../models/PublicRelations`)[n];
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (_req, res) => {
  try {
    const Media = safeModel('MediaCoverage');
    const Camp = safeModel('Campaign');
    const Part = safeModel('Partnership');

    const [totalMedia, activeCampaigns, activePartners, positiveMedia] = await Promise.all([
      Media.countDocuments().catch(() => 0),
      Camp.countDocuments({ status: 'active' }).catch(() => 0),
      Part.countDocuments({ status: 'active' }).catch(() => 0),
      Media.countDocuments({ sentiment: 'positive' }).catch(() => 0),
    ]);

    const bySentiment = await Media.aggregate([
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ]).catch(() => []);
    const byType = await Media.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]).catch(
      () => []
    );
    const recentMedia = await Media.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .catch(() => []);

    res.json({
      success: true,
      data: {
        summary: { totalMedia, activeCampaigns, activePartners, positiveMedia },
        mediaBySentiment: bySentiment.map(s => ({ sentiment: s._id, count: s.count })),
        mediaByType: byType.map(t => ({ type: t._id, count: t.count })),
        recentMedia,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── Media Coverage CRUD ──────────────────────────────────────
router.get('/media', authenticate, async (req, res) => {
  try {
    const Media = safeModel('MediaCoverage');
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Media.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/media', authenticate, async (req, res) => {
  try {
    const Media = safeModel('MediaCoverage');
    const doc = await Media.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/media/:id', authenticate, async (req, res) => {
  try {
    const Media = safeModel('MediaCoverage');
    const doc = await Media.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.delete('/media/:id', authenticate, async (req, res) => {
  try {
    const Media = safeModel('MediaCoverage');
    await Media.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── Campaigns CRUD ───────────────────────────────────────────
router.get('/campaigns', authenticate, async (req, res) => {
  try {
    const Camp = safeModel('Campaign');
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Camp.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Camp.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/campaigns', authenticate, async (req, res) => {
  try {
    const Camp = safeModel('Campaign');
    const doc = await Camp.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/campaigns/:id', authenticate, async (req, res) => {
  try {
    const Camp = safeModel('Campaign');
    const doc = await Camp.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── Partnerships CRUD ────────────────────────────────────────
router.get('/partnerships', authenticate, async (req, res) => {
  try {
    const Part = safeModel('Partnership');
    const docs = await Part.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.post('/partnerships', authenticate, async (req, res) => {
  try {
    const Part = safeModel('Partnership');
    const doc = await Part.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

router.put('/partnerships/:id', authenticate, async (req, res) => {
  try {
    const Part = safeModel('Partnership');
    const doc = await Part.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
