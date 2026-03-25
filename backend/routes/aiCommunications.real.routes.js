const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const Conversation = require('../models/conversation.model');
    const Message = require('../models/message.model');
    const [totalConversations, totalMessages] = await Promise.all([
      Conversation.countDocuments(),
      Message.countDocuments(),
    ]);
    res.json({ success: true, data: { totalConversations, totalMessages, aiAssisted: 0, sentiment: { positive: 70, neutral: 20, negative: 10 } } });
  } catch (err) {
    logger.error('AI comm dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في لوحة تحكم الاتصالات الذكية' });
  }
});

// GET /emails
router.get('/emails', async (req, res) => {
  try {
    const Communication = require('../models/Communication');
    const data = await Communication.find({ type: 'email' }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('AI emails error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب البريد' });
  }
});

// GET /conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const Message = require('../models/message.model');
    const data = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Conversation messages error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الرسائل' });
  }
});

// POST /send-message
router.post('/send-message', async (req, res) => {
  try {
    const Message = require('../models/message.model');
    const msg = await Message.create({ ...req.body, senderId: req.user?.id });
    res.status(201).json({ success: true, data: msg, message: 'تم إرسال الرسالة' });
  } catch (err) {
    logger.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الرسالة' });
  }
});

// POST /emails/send
router.post('/emails/send', async (req, res) => {
  try {
    const Communication = require('../models/Communication');
    const email = await Communication.create({ ...req.body, type: 'email', from: req.user?.id, direction: 'outgoing' });
    res.status(201).json({ success: true, data: email, message: 'تم إرسال البريد' });
  } catch (err) {
    logger.error('Send email error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إرسال البريد' });
  }
});

// POST /chatbot/chat
router.post('/chatbot/chat', async (req, res) => {
  try {
    const { message } = req.body;
    // Simple echo chatbot — replace with AI integration when available
    res.json({ success: true, data: { reply: 'شكراً لرسالتك. سيتم الرد عليك قريباً.', timestamp: new Date() } });
  } catch (err) {
    logger.error('Chatbot error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الدردشة' });
  }
});

module.exports = router;
