'use strict';
/**
 * CMS Routes — نظام إدارة المحتوى
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// Pages
router.get('/pages', async (req, res) => {
  try {
    const CMSPage = require('../models/CMS/CMSPage');
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      CMSPage.find(filter).sort({ title: 1 }).skip(skip).limit(+limit).lean(),
      CMSPage.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/pages', authorize('admin', 'content_manager'), async (req, res) => {
  try {
    const CMSPage = require('../models/CMS/CMSPage');
    const cms = await CMSPage.create({ ...req.body, status: 'draft', createdBy: req.user._id });
    res.status(201).json({ success: true, data: cms });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/pages/:id', async (req, res) => {
  try {
    const CMSPage = require('../models/CMS/CMSPage');
    const item = await CMSPage.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/pages/:id', authorize('admin', 'content_manager'), async (req, res) => {
  try {
    const CMSPage = require('../models/CMS/CMSPage');
    const item = await CMSPage.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/pages/:id/publish', authorize('admin', 'content_manager'), async (req, res) => {
  try {
    const CMSPage = require('../models/CMS/CMSPage');
    const item = await CMSPage.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date(), publishedBy: req.user._id },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/pages/:id', authorize('admin'), async (req, res) => {
  try {
    const CMSPage = require('../models/CMS/CMSPage');
    await CMSPage.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Announcements
router.get('/announcements', async (req, res) => {
  try {
    const Announcement = require('../models/CMS/Announcement');
    const { active, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (active === 'true') filter.expiresAt = { $gt: new Date() };
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Announcement.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(+limit).lean(),
      Announcement.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/announcements', authorize('admin', 'content_manager'), async (req, res) => {
  try {
    const Announcement = require('../models/CMS/Announcement');
    const item = await Announcement.create({
      ...req.body,
      publishedAt: new Date(),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
