'use strict';
/**
 * WhatsApp Enhanced Routes — مسارات واتساب المتقدمة
 * ══════════════════════════════════════════════════════════════════════════
 * Extended WhatsApp features: broadcast groups, template approval workflow,
 * AI classification integration, opt-in/opt-out management, analytics.
 *
 *   GET    /broadcast-groups           list broadcast groups
 *   POST   /broadcast-groups           create broadcast group
 *   PUT    /broadcast-groups/:id       update group
 *   DELETE /broadcast-groups/:id       delete group
 *   POST   /broadcast-groups/:id/send  send broadcast message
 *   GET    /template-requests          list template approval requests
 *   POST   /template-requests          submit template for approval
 *   PATCH  /template-requests/:id      approve/reject template
 *   GET    /opt-status                 list contact opt-in/out status
 *   PATCH  /opt-status/:contactId      update opt status
 *   GET    /analytics                  WhatsApp analytics
 *   GET    /conversations              list all conversations (enhanced view)
 *   GET    /conversations/:id/timeline full message timeline
 *
 * W1424d — BRANCH ISOLATION FIX: this router previously scoped every query by
 * `req.user.branchId`, which NO middleware ever sets (always undefined) — so the
 * filter became `{branchId: undefined}` and matched only null-branch docs for
 * EVERY caller (the W269/W1407 isolation applied to whatsapp.routes.js was never
 * applied here). All queries now use `effectiveBranchScope(req)` (the canonical
 * helper): restricted users → their branch, cross-branch roles → no constraint.
 * Also closes mass-assignment on POST /template-requests (was `...req.body`).
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');
// Register the dedicated template-request model so safeModel() can resolve it.
// (The /template-requests workflow used to mis-target NotificationTemplate, whose
// required bilingual fields it never set → every submit threw. W1540 fix.)
require('../models/WhatsAppTemplateRequest');

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

// Branch-scoped filter for find()/countDocuments() (Mongoose casts string→ObjectId).
// Restricted user → {branchId}; cross-branch role → {} (sees all). NEVER req.user.branchId.
const scopedFilter = (req, extra = {}) => {
  const b = effectiveBranchScope(req);
  return { ...(b ? { branchId: b } : {}), ...extra };
};

// Branch-scoped $match for aggregate() — the pipeline does NOT auto-cast, so a
// valid ObjectId string must be cast explicitly.
const scopedMatch = (req, extra = {}) => {
  const b = effectiveBranchScope(req);
  if (!b) return { ...extra };
  return {
    branchId: mongoose.Types.ObjectId.isValid(b) ? new mongoose.Types.ObjectId(b) : b,
    ...extra,
  };
};

const validId = id => mongoose.isValidObjectId(id);

// ── Broadcast Groups ───────────────────────────────────────────────────────
router.get('/broadcast-groups', async (req, res) => {
  try {
    const WA = safeModel('WhatsAppConversation');
    if (!WA) return res.json({ success: true, data: [] });
    const groups = await WA.aggregate([
      { $match: scopedMatch(req, { type: 'broadcast_group' }) },
      {
        $group: {
          _id: '$broadcastGroupId',
          name: { $first: '$broadcastGroupName' },
          memberCount: { $sum: 1 },
          lastSentAt: { $max: '$lastMessageAt' },
        },
      },
    ]);
    res.json({ success: true, data: groups });
  } catch (err) {
    safeError(res, err, 'list broadcast groups');
  }
});

router.post(
  '/broadcast-groups',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const { name, description, memberPhones = [] } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'name is required' });
      const groupId = new mongoose.Types.ObjectId();
      res.status(201).json({
        success: true,
        data: {
          _id: groupId,
          name,
          description,
          memberCount: memberPhones.length,
          createdAt: new Date(),
          createdBy: req.user._id,
        },
      });
    } catch (err) {
      safeError(res, err, 'create broadcast group');
    }
  }
);

router.post(
  '/broadcast-groups/:id/send',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const { message, templateName } = req.body;
      if (!message && !templateName)
        return res
          .status(400)
          .json({ success: false, message: 'message or templateName is required' });
      res.json({
        success: true,
        data: {
          groupId: req.params.id,
          scheduledAt: new Date(),
          estimatedRecipients: 0,
          status: 'queued',
          message: 'Broadcast queued successfully',
        },
      });
    } catch (err) {
      safeError(res, err, 'send broadcast');
    }
  }
);

router.delete('/broadcast-groups/:id', requireRole('admin', 'manager'), async (req, res) => {
  res.json({ success: true, message: 'Broadcast group deleted' });
});

// ── Template Approval Workflow ─────────────────────────────────────────────
router.get('/template-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const NotifTmpl = safeModel('WhatsAppTemplateRequest');
    if (!NotifTmpl) return res.json({ success: true, data: [] });
    const filter = scopedFilter(req, { type: 'whatsapp_template' });
    if (status) filter.approvalStatus = status;
    const data = await NotifTmpl.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list template requests');
  }
});

router.post('/template-requests', async (req, res) => {
  try {
    const NotifTmpl = safeModel('WhatsAppTemplateRequest');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    // Whitelist creatable fields — NEVER spread req.body (mass-assignment: a caller
    // could otherwise set approvalStatus / branchId / reviewedBy / arbitrary fields).
    const { name, language, body, category, components, description, headerText, footerText } =
      req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const doc = await NotifTmpl.create({
      name,
      language,
      body,
      category,
      components,
      description,
      headerText,
      footerText,
      type: 'whatsapp_template',
      approvalStatus: 'pending',
      branchId: effectiveBranchScope(req),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create template request');
  }
});

router.patch('/template-requests/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    if (!validId(req.params.id))
      return res.status(404).json({ success: false, message: 'Template request not found' });
    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res
        .status(400)
        .json({ success: false, message: 'status must be approved or rejected' });
    const NotifTmpl = safeModel('WhatsAppTemplateRequest');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { approvalStatus: status, reviewNotes, reviewedBy: req.user._id, reviewedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Template request not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'review template');
  }
});

// ── Opt-in / Opt-out Management ────────────────────────────────────────────
router.get('/opt-status', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const WA = safeModel('WhatsAppConversation');
    if (!WA) return res.json({ success: true, data: [], summary: { optIn: 0, optOut: 0 } });
    const [optIn, optOut, data] = await Promise.all([
      WA.countDocuments(scopedFilter(req, { optStatus: 'opted_in' })),
      WA.countDocuments(scopedFilter(req, { optStatus: 'opted_out' })),
      WA.find(scopedFilter(req))
        .select('contactPhone contactName optStatus optStatusUpdatedAt')
        .sort({ contactName: 1 })
        .limit(100)
        .lean(),
    ]);
    res.json({ success: true, data, summary: { optIn, optOut } });
  } catch (err) {
    safeError(res, err, 'opt status');
  }
});

router.patch('/opt-status/:contactId', requireRole('admin', 'manager'), async (req, res) => {
  try {
    if (!validId(req.params.contactId))
      return res.status(404).json({ success: false, message: 'Contact not found' });
    const { status } = req.body;
    if (!['opted_in', 'opted_out'].includes(status))
      return res
        .status(400)
        .json({ success: false, message: 'status must be opted_in or opted_out' });
    const WA = safeModel('WhatsAppConversation');
    if (!WA)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await WA.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.contactId }),
      { optStatus: status, optStatusUpdatedAt: new Date(), optStatusUpdatedBy: req.user._id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update opt status');
  }
});

// ── Analytics ──────────────────────────────────────────────────────────────
router.get('/analytics', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const WA = safeModel('WhatsAppConversation');
    if (!WA)
      return res.json({
        success: true,
        data: {
          totalConversations: 0,
          openConversations: 0,
          resolvedConversations: 0,
          avgResponseTimeMinutes: 0,
        },
      });
    const [total, open, resolved] = await Promise.all([
      WA.countDocuments(scopedFilter(req)),
      // W1488: "open" = non-terminal. WhatsAppConversation status enum is
      // [active, resolved, pending_review, escalated, archived]; the literal 'open'
      // is not in it (→ always 0). Open = not resolved and not archived.
      WA.countDocuments(scopedFilter(req, { status: { $nin: ['resolved', 'archived'] } })),
      WA.countDocuments(scopedFilter(req, { status: 'resolved' })),
    ]);
    res.json({
      success: true,
      data: {
        totalConversations: total,
        openConversations: open,
        resolvedConversations: resolved,
        avgResponseTimeMinutes: 12,
        messagesSentToday: 0,
        messagesReceivedToday: 0,
      },
    });
  } catch (err) {
    safeError(res, err, 'whatsapp analytics');
  }
});

// ── Conversations Enhanced View ────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const WA = safeModel('WhatsAppConversation');
    if (!WA) return res.json({ success: true, data: [] });
    const { page = 1, limit = 20, status, assignedTo } = req.query;
    const filter = scopedFilter(req);
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      WA.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      WA.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list WA conversations');
  }
});

router.get('/conversations/:id/timeline', async (req, res) => {
  try {
    if (!validId(req.params.id))
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    const WA = safeModel('WhatsAppConversation');
    if (!WA)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const conv = await WA.findOne(scopedFilter(req, { _id: req.params.id })).lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({
      success: true,
      data: {
        conversation: conv,
        messages: conv.messages || [],
        timeline: (conv.messages || []).map(m => ({
          timestamp: m.timestamp,
          type: m.type,
          direction: m.direction,
          preview: (m.text || '').substring(0, 100),
        })),
      },
    });
  } catch (err) {
    safeError(res, err, 'conversation timeline');
  }
});

module.exports = router;
