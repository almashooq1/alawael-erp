'use strict';
/**
 * Email v2 Routes — إدارة البريد الإلكتروني (الإصدار الثاني)
 * ══════════════════════════════════════════════════════════════════════════
 * Full email management: inbox, compose, drafts, sent, templates, preferences.
 *
 *   GET    /inbox                list received emails (paginated)
 *   GET    /inbox/:id            get single email
 *   POST   /compose              send an email
 *   POST   /drafts               save draft
 *   GET    /drafts               list drafts
 *   PUT    /drafts/:id           update draft
 *   DELETE /drafts/:id           delete draft
 *   GET    /sent                 list sent emails
 *   PATCH  /inbox/:id/read       mark as read
 *   PATCH  /inbox/:id/star       toggle star
 *   DELETE /inbox/:id            move to trash
 *   GET    /preferences          get email preferences
 *   PUT    /preferences          update email preferences
 *   GET    /templates            list email templates
 *   POST   /templates            create email template
 *   PUT    /templates/:id        update email template
 *   DELETE /templates/:id        delete email template
 *   GET    /stats                email usage stats
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET /inbox ─────────────────────────────────────────────────────────────
router.get('/inbox', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, isRead, isStarred, search } = req.query;
    const filter = {
      branchId: req.user.branchId,
      channel: 'email',
      direction: 'inbound',
      isDeleted: { $ne: true },
    };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (isStarred === 'true') filter.isStarred = true;
    if (search)
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'sender.email': { $regex: search, $options: 'i' } },
      ];
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Communication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Communication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    safeError(res, err, 'email inbox');
  }
});

// ── GET /inbox/:id ─────────────────────────────────────────────────────────
router.get('/inbox/:id', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const email = await Communication.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    }).lean();
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });
    res.json({ success: true, data: email });
  } catch (err) {
    safeError(res, err, 'get email');
  }
});

// ── POST /compose — send email ─────────────────────────────────────────────
router.post('/compose', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const { to, subject, body, cc, bcc, replyTo, attachments = [] } = req.body;
    if (!to || !subject || !body)
      return res
        .status(400)
        .json({ success: false, message: 'to, subject, and body are required' });
    const doc = await Communication.create({
      channel: 'email',
      direction: 'outbound',
      branchId: req.user.branchId,
      sender: { userId: req.user._id, email: req.user.email, name: req.user.name },
      recipient: { email: to },
      cc,
      bcc,
      replyTo,
      subject,
      body,
      attachments,
      status: 'sent',
      sentAt: new Date(),
      sentBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc, message: 'Email sent successfully' });
  } catch (err) {
    safeError(res, err, 'compose email');
  }
});

// ── POST /drafts — save draft ──────────────────────────────────────────────
router.post('/drafts', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.create({
      ...req.body,
      channel: 'email',
      direction: 'outbound',
      status: 'draft',
      branchId: req.user.branchId,
      sentBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'save draft');
  }
});

// ── GET /drafts ────────────────────────────────────────────────────────────
router.get('/drafts', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const data = await Communication.find({
      branchId: req.user.branchId,
      channel: 'email',
      status: 'draft',
      sentBy: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list drafts');
  }
});

// ── PUT /drafts/:id ────────────────────────────────────────────────────────
router.put('/drafts/:id', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, status: 'draft', sentBy: req.user._id },
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Draft not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update draft');
  }
});

// ── DELETE /drafts/:id ─────────────────────────────────────────────────────
router.delete('/drafts/:id', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndDelete({
      _id: req.params.id,
      status: 'draft',
      sentBy: req.user._id,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Draft not found' });
    res.json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    safeError(res, err, 'delete draft');
  }
});

// ── GET /sent ──────────────────────────────────────────────────────────────
router.get('/sent', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [] });
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {
      branchId: req.user.branchId,
      channel: 'email',
      direction: 'outbound',
      status: 'sent',
      sentBy: req.user._id,
    };
    const [data, total] = await Promise.all([
      Communication.find(filter).sort({ sentAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Communication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'sent emails');
  }
});

// ── PATCH /inbox/:id/read ──────────────────────────────────────────────────
router.patch('/inbox/:id/read', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { isRead: true, readAt: new Date(), readBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Email not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'mark email read');
  }
});

// ── PATCH /inbox/:id/star ──────────────────────────────────────────────────
router.patch('/inbox/:id/star', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const current = await Communication.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!current) return res.status(404).json({ success: false, message: 'Email not found' });
    current.isStarred = !current.isStarred;
    await current.save();
    res.json({ success: true, data: { isStarred: current.isStarred } });
  } catch (err) {
    safeError(res, err, 'toggle star');
  }
});

// ── DELETE /inbox/:id ──────────────────────────────────────────────────────
router.delete('/inbox/:id', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Email not found' });
    res.json({ success: true, message: 'Email moved to trash' });
  } catch (err) {
    safeError(res, err, 'delete email');
  }
});

// ── GET /preferences ───────────────────────────────────────────────────────
router.get('/preferences', async (req, res) => {
  try {
    const EmailPref = safeModel('EmailPreference');
    if (!EmailPref)
      return res.json({
        success: true,
        data: { emailEnabled: true, dailyDigest: false, instantNotifications: true },
      });
    const prefs = await EmailPref.findOne({ userId: req.user._id }).lean();
    res.json({ success: true, data: prefs || { emailEnabled: true } });
  } catch (err) {
    safeError(res, err, 'get email preferences');
  }
});

// ── PUT /preferences ───────────────────────────────────────────────────────
router.put('/preferences', async (req, res) => {
  try {
    const EmailPref = safeModel('EmailPreference');
    if (!EmailPref)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const prefs = await EmailPref.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, userId: req.user._id },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, data: prefs });
  } catch (err) {
    safeError(res, err, 'update email preferences');
  }
});

// ── GET /templates ─────────────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl) return res.json({ success: true, data: [] });
    const data = await NotifTmpl.find({ branchId: req.user.branchId, type: 'email' })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list email templates');
  }
});

// ── POST /templates ────────────────────────────────────────────────────────
router.post('/templates', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.create({
      ...req.body,
      type: 'email',
      branchId: req.user.branchId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create email template');
  }
});

// ── PUT /templates/:id ─────────────────────────────────────────────────────
router.put('/templates/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, type: 'email' },
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update email template');
  }
});

// ── DELETE /templates/:id ──────────────────────────────────────────────────
router.delete('/templates/:id', requireRole('admin'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
      type: 'email',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    safeError(res, err, 'delete email template');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.json({ success: true, data: { sent: 0, received: 0, unread: 0, drafts: 0 } });
    const base = { branchId: req.user.branchId, channel: 'email' };
    const [sent, received, unread, drafts] = await Promise.all([
      Communication.countDocuments({ ...base, direction: 'outbound', status: 'sent' }),
      Communication.countDocuments({ ...base, direction: 'inbound', isDeleted: { $ne: true } }),
      Communication.countDocuments({
        ...base,
        direction: 'inbound',
        isRead: { $ne: true },
        isDeleted: { $ne: true },
      }),
      Communication.countDocuments({ ...base, status: 'draft' }),
    ]);
    res.json({ success: true, data: { sent, received, unread, drafts } });
  } catch (err) {
    safeError(res, err, 'email stats');
  }
});

module.exports = router;
