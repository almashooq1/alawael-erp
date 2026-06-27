/**
 * WhatsApp Chatbot Routes — مسارات روبوت واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Mount: /api/v1/whatsapp-chatbot
 *
 * @module routes/whatsapp-chatbot.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const chatbotService = require('../services/whatsappChatbot.service');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Auth middleware stack ─────────────────────────────────────────────────
router.use(authenticate);
router.use(authorize(['admin', 'super_admin', 'manager']));

// ═══════════════════════════════════════════════════════════════════════════
//  Webhook — incoming messages (public webhook, but we gate it differently)
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'phone and message are required' });
    }

    const result = await chatbotService.processIncomingMessage(phone, message, {
      organizationId: req.user?.organizationId,
      branchId: req.user?.branchId,
    });

    res.json({ success: true, data: result });
  })
);

// ─── Send outgoing message ─────────────────────────────────────────────────
router.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { phone, message, templateId, variables } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone is required' });
    }

    let result;
    if (templateId) {
      result = await chatbotService.sendTemplateMessage(phone, templateId, variables || {}, {
        organizationId: req.user?.organizationId,
        branchId: req.user?.branchId,
      });
    } else if (message) {
      // Simple outgoing text (stored in conversation)
      const conv = await chatbotService.getConversationHistory(phone, 1);
      // We use the processIncomingMessage pattern but for outgoing manual messages
      // For simplicity, we push a manual outgoing message via the service helper
      const WhatsAppConversation = require('../models/WhatsAppConversation');
      const normalizedPhone = phone.replace(/\D/g, '');
      let conversation = await WhatsAppConversation.findOne({ phone: normalizedPhone }).sort({
        createdAt: -1,
      });
      if (!conversation) {
        conversation = new WhatsAppConversation({
          phone: normalizedPhone,
          organizationId: req.user?.organizationId,
          branchId: req.user?.branchId,
          status: 'active',
          messages: [],
        });
      }
      conversation.messages.push({
        direction: 'outgoing',
        type: 'text',
        text: message,
        timestamp: new Date(),
        deliveryStatus: 'sent',
        staffId: req.user?._id,
      });
      conversation.lastMessageAt = new Date();
      await conversation.save();
      result = { phone: normalizedPhone, body: message, sentAt: new Date() };
    } else {
      return res.status(400).json({ success: false, message: 'message or templateId is required' });
    }

    res.json({ success: true, data: result });
  })
);

// ─── Conversation history ────────────────────────────────────────────────────
router.get(
  '/conversations/:phone',
  asyncHandler(async (req, res) => {
    const { phone } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = await chatbotService.getConversationHistory(phone, limit);
    res.json({ success: true, data: history });
  })
);

// ─── Analytics ─────────────────────────────────────────────────────────────
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }
    const analytics = await chatbotService.getBotAnalytics(startDate, endDate, {
      organizationId: req.user?.organizationId,
      branchId: req.user?.branchId,
    });
    res.json({ success: true, data: analytics });
  })
);

// ─── Templates ─────────────────────────────────────────────────────────────
router.post(
  '/templates',
  asyncHandler(async (req, res) => {
    const data = {
      ...req.body,
      createdBy: req.user?._id,
      organizationId: req.user?.organizationId,
      branchId: req.user?.branchId,
    };
    const template = await chatbotService.createTemplate(data);
    res.status(201).json({ success: true, data: template });
  })
);

router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const templates = await chatbotService.getTemplates({
      organizationId: req.user?.organizationId,
      branchId: req.user?.branchId,
      category: req.query.category,
    });
    res.json({ success: true, data: templates });
  })
);

router.patch(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const template = await chatbotService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  })
);

router.delete(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    await chatbotService.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  })
);

// ─── Settings: toggle bot per contact ──────────────────────────────────────
router.patch(
  '/settings/:phone',
  asyncHandler(async (req, res) => {
    const { phone } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
    }
    const result = await chatbotService.toggleBotStatus(phone, enabled);
    res.json({ success: true, data: result });
  })
);

module.exports = router;
