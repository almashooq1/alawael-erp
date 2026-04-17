/**
 * chat-v2.routes.js — slim chat API on top of the existing
 * Conversation + Message models, usable by parent and therapist
 * portals shipped in this sprint.
 *
 * Mount at /api/chat-v2.
 *
 * Endpoints:
 *   GET  /conversations                      — my conversations (with unread counts)
 *   POST /conversations                      — find-or-create private chat { withUserId }
 *   GET  /conversations/:id/messages         — paginated messages
 *   POST /conversations/:id/messages         — send message { text, replyTo? }
 *   POST /conversations/:id/read             — mark read (updates lastReadAt)
 *   GET  /contacts                           — directory of people I can message
 *                                              (parents see their children's therapists + admins,
 *                                               therapists see their caseload guardians + admins,
 *                                               admins see everyone)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const User = require('../models/User');
const Employee = require('../models/HR/Employee');
const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');
const TherapySession = require('../models/TherapySession');

router.use(authenticateToken);

function asId(x) {
  return x && mongoose.isValidObjectId(x) ? String(x) : null;
}

// ── GET /conversations ───────────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const uid = req.user.id;
    const convs = await Conversation.find({
      'participants.user': uid,
      isDeleted: { $ne: true },
    })
      .populate('participants.user', 'name firstName lastName email avatar role')
      .sort({ lastActivityAt: -1 })
      .limit(100)
      .lean();

    // Compute unread per conversation
    const withCounts = await Promise.all(
      convs.map(async c => {
        const me = c.participants.find(p => String(p.user?._id || p.user) === String(uid));
        const cutoff = me?.lastReadAt || new Date(0);
        const unread = await Message.countDocuments({
          conversationId: c._id,
          sender: { $ne: uid },
          createdAt: { $gt: cutoff },
          isDeleted: { $ne: true },
        });
        // Pick the "other" participant for display
        const other = c.participants.find(p => String(p.user?._id || p.user) !== String(uid))?.user;
        return {
          _id: c._id,
          type: c.type,
          other,
          participants: c.participants.map(p => p.user),
          lastMessage: c.lastMessage,
          lastActivityAt: c.lastActivityAt,
          unread,
          groupInfo: c.groupInfo,
        };
      })
    );

    res.json({ success: true, items: withCounts });
  } catch (err) {
    return safeError(res, err, 'chat-v2.conversations');
  }
});

// ── POST /conversations ──────────────────────────────────────────────────
router.post('/conversations', async (req, res) => {
  try {
    const { withUserId } = req.body || {};
    const otherId = asId(withUserId);
    if (!otherId) return res.status(400).json({ success: false, message: 'withUserId مطلوب' });
    if (otherId === String(req.user.id))
      return res.status(400).json({ success: false, message: 'لا يمكن التحادث مع نفسك' });

    // Find-or-create private conversation between the two users
    let conv = await Conversation.findOne({
      type: 'private',
      'participants.user': { $all: [req.user.id, otherId] },
      isDeleted: { $ne: true },
    });
    if (!conv) {
      conv = await Conversation.create({
        type: 'private',
        participants: [
          { user: req.user.id, role: 'member' },
          { user: otherId, role: 'member' },
        ],
        stats: { totalParticipants: 2 },
        lastActivityAt: new Date(),
      });
    }
    const populated = await Conversation.findById(conv._id)
      .populate('participants.user', 'name firstName lastName email avatar role')
      .lean();
    res.status(201).json({ success: true, data: populated, message: 'جاهز' });
  } catch (err) {
    return safeError(res, err, 'chat-v2.createConversation');
  }
});

async function assertMember(req, conversationId) {
  if (!mongoose.isValidObjectId(conversationId))
    return { ok: false, status: 400, msg: 'معرّف غير صالح' };
  const c = await Conversation.findById(conversationId).lean();
  if (!c) return { ok: false, status: 404, msg: 'المحادثة غير موجودة' };
  const mine = c.participants.find(p => String(p.user) === String(req.user.id));
  if (!mine) return { ok: false, status: 403, msg: 'لست من المشاركين' };
  return { ok: true, conv: c };
}

// ── GET /conversations/:id/messages ──────────────────────────────────────
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const chk = await assertMember(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });

    const { before, limit = 50 } = req.query;
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const filter = { conversationId: req.params.id, isDeleted: { $ne: true } };
    if (before) {
      const d = new Date(before);
      if (!isNaN(d)) filter.createdAt = { $lt: d };
    }
    const messages = await Message.find(filter)
      .populate('sender', 'name firstName lastName email avatar role')
      .sort({ createdAt: -1 })
      .limit(l)
      .lean();

    res.json({
      success: true,
      items: messages.reverse(), // oldest → newest for rendering
      hasMore: messages.length === l,
    });
  } catch (err) {
    return safeError(res, err, 'chat-v2.messages');
  }
});

// ── POST /conversations/:id/messages ─────────────────────────────────────
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const chk = await assertMember(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });
    const { text, replyTo } = req.body || {};
    if (!text || !String(text).trim())
      return res.status(400).json({ success: false, message: 'نص الرسالة مطلوب' });

    const msg = await Message.create({
      conversationId: req.params.id,
      sender: req.user.id,
      content: { text: String(text).slice(0, 5000), type: 'text' },
      replyTo: asId(replyTo) || undefined,
      readBy: [{ user: req.user.id, readAt: new Date() }],
    });

    // Bump conversation activity + lastMessage
    await Conversation.findByIdAndUpdate(req.params.id, {
      lastActivityAt: new Date(),
      lastMessage: {
        content: msg.content.text,
        sender: req.user.id,
        sentAt: msg.createdAt,
        messageType: 'text',
      },
      $inc: { 'stats.totalMessages': 1 },
    });

    const populated = await Message.findById(msg._id)
      .populate('sender', 'name firstName lastName email avatar role')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return safeError(res, err, 'chat-v2.send');
  }
});

// ── POST /conversations/:id/read ─────────────────────────────────────────
router.post('/conversations/:id/read', async (req, res) => {
  try {
    const chk = await assertMember(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });
    await Conversation.updateOne(
      { _id: req.params.id, 'participants.user': req.user.id },
      { $set: { 'participants.$.lastReadAt': new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    return safeError(res, err, 'chat-v2.read');
  }
});

// ── GET /contacts — directory ────────────────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const role = req.user.role || '';
    const HQ = ['admin', 'superadmin', 'super_admin'];
    const contacts = [];
    const seen = new Set();
    const addUser = u => {
      if (!u?._id) return;
      const id = String(u._id);
      if (id === String(req.user.id) || seen.has(id)) return;
      seen.add(id);
      contacts.push({
        _id: u._id,
        name:
          u.firstName_ar || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        role: u.role,
        category: u._category || 'other',
      });
    };

    if (HQ.includes(role)) {
      const users = await User.find({ _id: { $ne: req.user.id } })
        .select('name firstName lastName email role avatar')
        .limit(200)
        .lean();
      users.forEach(u => addUser({ ...u, _category: u.role || 'user' }));
    } else if (['therapist', 'specialist', 'clinical_supervisor'].includes(role)) {
      // Find my employee record → beneficiaries I see → their guardians
      const me = await Employee.findOne({ email: (req.user.email || '').toLowerCase() }).lean();
      if (me) {
        const benIds = await TherapySession.distinct('beneficiary', { therapist: me._id });
        const bens = await Beneficiary.find({ _id: { $in: benIds } })
          .select('guardians firstName_ar lastName_ar')
          .populate({
            path: 'guardians',
            select: 'firstName_ar lastName_ar email userId',
          })
          .lean();
        for (const b of bens) {
          for (const g of b.guardians || []) {
            if (g?.userId) {
              addUser({
                _id: g.userId,
                firstName_ar: `${g.firstName_ar || ''} ${g.lastName_ar || ''}`.trim(),
                email: g.email,
                role: 'guardian',
                _category: `ولي أمر (${b.firstName_ar || ''})`,
              });
            }
          }
        }
      }
      // Always include admins for escalation
      const admins = await User.find({ role: { $in: HQ } })
        .select('name firstName lastName email role')
        .limit(20)
        .lean();
      admins.forEach(u => addUser({ ...u, _category: 'إدارة' }));
    } else if (['parent', 'guardian'].includes(role)) {
      // Find my guardian record → my children → their therapists
      const guardian = await Guardian.findOne({ userId: req.user.id }).lean();
      if (guardian) {
        const bens = await Beneficiary.find({ guardians: guardian._id })
          .select('_id firstName_ar')
          .lean();
        const benIds = bens.map(b => b._id);
        const therapistIds = await TherapySession.distinct('therapist', {
          beneficiary: { $in: benIds },
        });
        const therapists = await Employee.find({ _id: { $in: therapistIds } })
          .select('email firstName lastName firstName_ar lastName_ar')
          .lean();
        for (const t of therapists) {
          if (t.email) {
            const u = await User.findOne({ email: t.email.toLowerCase() })
              .select('_id name firstName lastName email role')
              .lean();
            if (u) addUser({ ...u, _category: 'المعالج' });
          }
        }
      }
      const admins = await User.find({ role: { $in: HQ } })
        .select('name firstName lastName email role')
        .limit(20)
        .lean();
      admins.forEach(u => addUser({ ...u, _category: 'إدارة' }));
    }

    res.json({ success: true, items: contacts });
  } catch (err) {
    return safeError(res, err, 'chat-v2.contacts');
  }
});

module.exports = router;
