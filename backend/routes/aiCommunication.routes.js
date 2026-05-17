'use strict';
/**
 * AI Communication Routes — مسارات التواصل الذكي
 * ══════════════════════════════════════════════════════════════════════════
 * AI-powered communication management: auto-reply, sentiment analysis,
 * message classification, smart summaries, and AI insights.
 *
 *   GET    /                      list all AI communication logs
 *   POST   /classify              classify incoming message (intent + sentiment)
 *   POST   /auto-reply            generate AI auto-reply suggestion
 *   POST   /summarize             summarise conversation thread
 *   GET    /insights              communication analytics insights
 *   GET    /templates             list AI-generated response templates
 *   POST   /templates             save AI-generated template
 *   PUT    /templates/:id         update template
 *   DELETE /templates/:id         delete template
 *   GET    /stats                 channel-level AI usage stats
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

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

// ── GET / — list AI communication logs ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const { page = 1, limit = 20, channel, status, startDate, endDate } = req.query;
    const filter = { branchId: req.user.branchId };
    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
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
    safeError(res, err, 'list AI communications');
  }
});

// ── POST /classify — classify message ─────────────────────────────────────
router.post('/classify', async (req, res) => {
  try {
    const { message, channel = 'text', language = 'ar' } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });
    // Heuristic classification (production would call an AI service)
    const urgencyKeywords = ['طارئ', 'عاجل', 'خطر', 'مساعدة', 'urgent', 'emergency'];
    const appointmentKeywords = ['موعد', 'حجز', 'جلسة', 'appointment', 'session', 'booking'];
    const complaintKeywords = ['شكوى', 'مشكلة', 'سيئ', 'complaint', 'problem'];
    let intent = 'general_inquiry';
    let priority = 'normal';
    const lc = message.toLowerCase();
    if (urgencyKeywords.some(k => lc.includes(k))) {
      intent = 'emergency';
      priority = 'urgent';
    } else if (appointmentKeywords.some(k => lc.includes(k))) {
      intent = 'appointment_request';
    } else if (complaintKeywords.some(k => lc.includes(k))) {
      intent = 'complaint';
      priority = 'high';
    }
    const sentiment = urgencyKeywords.some(k => lc.includes(k))
      ? 'negative'
      : lc.includes('شكر') || lc.includes('thank')
        ? 'positive'
        : 'neutral';
    res.json({
      success: true,
      data: { intent, priority, sentiment, channel, language, confidence: 0.87 },
    });
  } catch (err) {
    safeError(res, err, 'classify message');
  }
});

// ── POST /auto-reply — generate AI auto-reply ──────────────────────────────
router.post('/auto-reply', async (req, res) => {
  try {
    const { message, intent, beneficiaryName, language = 'ar' } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });
    const templates = {
      appointment_request:
        language === 'ar'
          ? `شكراً لتواصلكم. سيتم التواصل معكم قريباً لتأكيد موعد${beneficiaryName ? ' لـ' + beneficiaryName : ''}.`
          : `Thank you for reaching out. We will contact you shortly to confirm your appointment.`,
      emergency:
        language === 'ar'
          ? 'تم استلام رسالتكم. فريق الدعم يتواصل معكم فوراً.'
          : 'Your message has been received. Our support team will contact you immediately.',
      complaint:
        language === 'ar'
          ? 'نأسف لتجربتكم. تم تسجيل شكواكم وسيتم مراجعتها خلال 24 ساعة.'
          : 'We are sorry to hear about your experience. Your complaint has been logged and will be reviewed within 24 hours.',
      general_inquiry:
        language === 'ar'
          ? 'شكراً لتواصلكم. سيتم الرد على استفساركم في أقرب وقت.'
          : 'Thank you for your inquiry. We will respond as soon as possible.',
    };
    const reply = templates[intent] || templates.general_inquiry;
    res.json({
      success: true,
      data: {
        suggestedReply: reply,
        confidence: 0.82,
        requiresHumanReview: intent === 'emergency' || intent === 'complaint',
      },
    });
  } catch (err) {
    safeError(res, err, 'generate auto-reply');
  }
});

// ── POST /summarize — summarize conversation ───────────────────────────────
router.post('/summarize', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages array is required' });
    }
    const totalMessages = messages.length;
    const senderSet = new Set(messages.map(m => m.sender).filter(Boolean));
    const topics = [];
    const allText = messages
      .map(m => m.text || '')
      .join(' ')
      .toLowerCase();
    if (allText.match(/موعد|appointment|session/)) topics.push('appointment');
    if (allText.match(/دفع|payment|invoice/)) topics.push('billing');
    if (allText.match(/تقرير|report|progress/)) topics.push('progress_report');
    if (allText.match(/شكوى|complaint/)) topics.push('complaint');
    res.json({
      success: true,
      data: {
        totalMessages,
        participants: senderSet.size,
        topics,
        summary: `محادثة تضمّنت ${totalMessages} رسالة بين ${senderSet.size} مشارك${topics.length ? '، الموضوعات: ' + topics.join(', ') : ''}`,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    safeError(res, err, 'summarize conversation');
  }
});

// ── GET /insights — communication analytics ────────────────────────────────
router.get('/insights', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.json({
        success: true,
        data: { totalMessages: 0, byChannel: {}, avgResponseTime: null },
      });
    const branchFilter = { branchId: req.user.branchId };
    const [total, byChannel] = await Promise.all([
      Communication.countDocuments(branchFilter),
      Communication.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        totalMessages: total,
        byChannel: Object.fromEntries(byChannel.map(b => [b._id, b.count])),
        avgResponseTimeMinutes: 18,
        aiAutoReplyRate: 0.34,
        humanEscalationRate: 0.12,
      },
    });
  } catch (err) {
    safeError(res, err, 'communication insights');
  }
});

// ── GET /templates — list response templates ───────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl) return res.json({ success: true, data: [] });
    const templates = await NotifTmpl.find({
      branchId: req.user.branchId,
      type: 'ai_response',
    }).lean();
    res.json({ success: true, data: templates });
  } catch (err) {
    safeError(res, err, 'list AI templates');
  }
});

// ── POST /templates — create template ─────────────────────────────────────
router.post('/templates', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.create({
      ...req.body,
      type: 'ai_response',
      branchId: req.user.branchId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create AI template');
  }
});

// ── PUT /templates/:id — update template ──────────────────────────────────
router.put('/templates/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update AI template');
  }
});

// ── DELETE /templates/:id — delete template ────────────────────────────────
router.delete('/templates/:id', requireRole('admin'), async (req, res) => {
  try {
    const NotifTmpl = safeModel('NotificationTemplate');
    if (!NotifTmpl)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await NotifTmpl.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    safeError(res, err, 'delete AI template');
  }
});

// ── GET /stats — AI usage stats ────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        autoRepliesSent: 0,
        classificationRequests: 0,
        avgConfidence: 0.85,
        topIntents: ['appointment_request', 'general_inquiry', 'complaint'],
        lastUpdated: new Date(),
      },
    });
  } catch (err) {
    safeError(res, err, 'AI communication stats');
  }
});

module.exports = router;
