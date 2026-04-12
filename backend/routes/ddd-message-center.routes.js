'use strict';
/**
 * MessageCenter Routes
 * Auto-extracted from services/dddMessageCenter.js
 * 19 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddMessageCenter');
const { validate } = require('../middleware/validate');
const v = require('../validations/message-center.validation');


  // Service imported as singleton above;

  /* Conversations */
  router.get('/messaging/conversations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listConversations(req.query.userId, req.query) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.get('/messaging/conversations/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getConversation(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/conversations', authenticate, validate(v.createConversation), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createConversation(req.body) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/conversations/:id/archive', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.archiveConversation(req.params.id) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/conversations/:id/close', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.closeConversation(req.params.id) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });

  /* Messages */
  router.get('/messaging/conversations/:conversationId/messages', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.listMessages(req.params.conversationId, req.query),
      });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/messages', authenticate, validate(v.createMessage), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.sendMessage(req.body) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.put('/messaging/messages/:id', authenticate, validate(v.updateMessage), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.editMessage(req.params.id, req.body.content) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.delete('/messaging/messages/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.deleteMessage(req.params.id) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/messages/:id/read', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.markAsRead(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });

  /* Templates */
  router.get('/messaging/templates', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates(req.query) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/templates', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.put('/messaging/templates/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTemplate(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });

  /* Drafts */
  router.get('/messaging/drafts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDrafts(req.query.userId) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.post('/messaging/drafts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.saveDraft(req.body) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.put('/messaging/drafts/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDraft(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.delete('/messaging/drafts/:id', authenticate, async (req, res) => {
    try {
      await svc.deleteDraft(req.params.id);
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });

  /* Analytics & Health */
  router.get('/messaging/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getMessagingAnalytics() });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });
  router.get('/messaging/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'message-center');
    }
  });


module.exports = router;
