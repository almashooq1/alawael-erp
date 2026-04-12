'use strict';
/**
 * CollaborationHub Routes
 * Auto-extracted from services/dddCollaborationHub.js
 * 11 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getCollaborationDashboard, createChannel, getChannelMessages, sendMessage, markAsRead, addReaction, getOnlineUsers, updatePresence, searchMessages, seedChannels } = require('../services/dddCollaborationHub');
const { DDDChannel } = require('../models/DddCollaborationHub');
const { validate } = require('../middleware/validate');
const v = require('../validations/collaboration-hub.validation');

  router.get('/collaboration', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getCollaborationDashboard() });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.get('/collaboration/channels', authenticate, async (req, res) => {
    try {
    const query = { isActive: true };
    if (req.query.type) query.type = req.query.type;
    const channels = await DDDChannel.find(query).lean();
    res.json({ success: true, data: channels });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.post('/collaboration/channels', authenticate, validate(v.createChannel), async (req, res) => {
    try {
    res.json({ success: true, data: await createChannel(req.body) });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.get('/collaboration/channels/:channelId/messages', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getChannelMessages(req.params.channelId, req.query) });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.post('/collaboration/channels/:channelId/messages', authenticate, validate(v.createMessage), async (req, res) => {
    try {
    const { senderId, content, ...opts } = req.body;
    res.json({
    success: true,
    data: await sendMessage(req.params.channelId, senderId, content, opts),
    });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.post('/collaboration/channels/:channelId/read', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await markAsRead(req.params.channelId, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.post('/collaboration/messages/:messageId/reactions', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await addReaction(req.params.messageId, req.body.userId, req.body.emoji),
    });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.get('/collaboration/presence', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getOnlineUsers(req.query.channelId) });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.post('/collaboration/presence', authenticate, validate(v.createPresence), async (req, res) => {
    try {
    const { userId, status, ...opts } = req.body;
    res.json({ success: true, data: await updatePresence(userId, status, opts) });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.get('/collaboration/search', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await searchMessages(req.query.q, req.query) });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

  router.post('/collaboration/seed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await seedChannels() });
    } catch (e) {
      safeError(res, e, 'collaboration-hub');
    }
  });

module.exports = router;
