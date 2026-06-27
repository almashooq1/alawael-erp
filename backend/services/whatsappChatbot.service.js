/**
 * WhatsApp Chatbot Service — خدمة روبوت واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Handles incoming message processing, auto-replies, template messages,
 * conversation history, analytics, and bot toggling for parent communication.
 *
 * @module services/whatsappChatbot.service
 */

'use strict';

const mongoose = require('mongoose');
const WhatsAppConversation = require('../models/WhatsAppConversation');
const WhatsAppContactGroup = require('../models/WhatsAppContactGroup');
const logger = require('../utils/logger');

// ─── Simple Template Schema (inline for self-containment) ───────────────────
const chatbotTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: ['greeting', 'notification', 'reminder', 'follow_up', 'custom'],
      default: 'custom',
    },
    body: { type: String, required: true, maxlength: 4096 }, // Arabic text with {{variables}}
    variables: { type: [String], default: [] }, // e.g. ['name', 'date', 'time']
    language: { type: String, default: 'ar' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  },
  { timestamps: true, collection: 'whatsapp_chatbot_templates' }
);

const WhatsAppChatbotTemplate = mongoose.model(
  'WhatsAppChatbotTemplate',
  chatbotTemplateSchema
);

// ─── Keyword → Intent Map (Arabic) ──────────────────────────────────────────
const KEYWORD_MAP = [
  {
    keywords: ['موعد', 'جلسة', 'مواعيد', 'المواعيد', 'الجلسة', 'الجلسات'],
    intent: 'session_inquiry',
    reply: 'إليك موعد الجلسة القادمة:\n{{sessionInfo}}\n\nللتعديل أو الاستفسار، يرجى التواصل مع مركز التأهيل.',
  },
  {
    keywords: ['تقييم', 'نتيجة', 'نتائج', 'التقييم', 'التقارير', 'تقرير'],
    intent: 'progress_inquiry',
    reply: 'آخر تقييم ICF:\n{{icfSummary}}\n\nللاطلاع على التفاصيل الكاملة، تفضل بزيارة بوابة ولي الأمر.',
  },
  {
    keywords: ['هدف', 'أهداف', 'تقدم', 'progress', 'الأهداف', 'التقدم'],
    intent: 'goal_inquiry',
    reply: 'تقدم الأهداف الحالية:\n{{goalProgress}}\n\nأحسنت! استمر في العمل الجماعي لتحقيق المزيد.',
  },
  {
    keywords: ['فاتورة', 'دفع', 'فواتير', 'الدفع', 'الفواتير', 'المدفوعات', 'رسوم'],
    intent: 'payment_inquiry',
    reply: 'حالة المدفوعات:\n{{paymentStatus}}\n\nللاستفسارات المالية، يرجى التواصل مع قسم المحاسبة.',
  },
  {
    keywords: ['تواصل', 'كلم', 'موظف', 'إنسان', 'أحبكلم', 'أحب أتواصل', 'مشرف', 'أخصائي'],
    intent: 'human_handoff',
    reply: 'تم إرسال طلبك للتواصل مع موظف. سيتم الرد عليك في أقرب وقت ممكن. شكراً لصبرك.',
  },
  {
    keywords: ['شكرا', 'شكراً', 'تمام', 'تمام الحمدلله', 'ما في مشكلة', 'ok', 'ممتاز'],
    intent: 'gratitude',
    reply: 'على الرحب والسعة! نحن هنا لخدمتكم في أي وقت. دمتم بخير.',
  },
];

// ─── Helper: match intent from Arabic text ──────────────────────────────────
function matchIntent(text = '') {
  const lower = text.toLowerCase().trim();
  for (const rule of KEYWORD_MAP) {
    if (rule.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return { intent: rule.intent, reply: rule.reply };
    }
  }
  return null;
}

// ─── Helper: enrich reply with mock data (production: query real services) ──
function enrichReply(reply, intent, phone, beneficiaryId) {
  // In a real implementation, these would call AppointmentService, ICFService, etc.
  const enrichments = {
    session_inquiry: { sessionInfo: 'الأحد ٩ صباحاً — قسم النطق والتخاطب' },
    progress_inquiry: { icfSummary: 'تحسن ملحوظ في المجالات الحركية والتواصلية (٧٨%)' },
    goal_inquiry: { goalProgress: '٥ أهداف من ٧ تم تحقيقها — هدفان قيد التنفيذ' },
    payment_inquiry: { paymentStatus: 'لا توجد فواتير مستحقة حالياً. آخر دفعة: ١٥/٠٦/٢٠٢٦' },
  };

  let enriched = reply;
  const vars = enrichments[intent] || {};
  Object.entries(vars).forEach(([key, val]) => {
    enriched = enriched.replace(new RegExp(`{{${key}}}`, 'g'), val);
  });
  // Fallback for any unreplaced template vars
  enriched = enriched.replace(/{{\w+}}/g, '—');
  return enriched;
}

// ─── Helper: format phone to E.164 ──────────────────────────────────────────
function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════
//  Service API
// ═══════════════════════════════════════════════════════════════════════════

const whatsappChatbotService = {
  /**
   * 1. processIncomingMessage
   * Process an incoming WhatsApp message and return auto-reply or handoff flag.
   */
  async processIncomingMessage(phone, message, opts = {}) {
    const normalizedPhone = normalizePhone(phone);
    const { organizationId = null, branchId = null } = opts;

    let conversation = await WhatsAppConversation.findOne({ phone: normalizedPhone }).sort({
      createdAt: -1,
    });

    if (!conversation) {
      conversation = new WhatsAppConversation({
        phone: normalizedPhone,
        organizationId,
        branchId,
        status: 'active',
        messages: [],
      });
    }

    // Push incoming message
    conversation.messages.push({
      direction: 'incoming',
      type: 'text',
      text: message,
      timestamp: new Date(),
      deliveryStatus: 'received',
    });

    conversation.lastMessageAt = new Date();
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;

    const intentMatch = matchIntent(message);
    let response = null;
    let handoff = false;

    if (!conversation.autoReplyEnabled) {
      handoff = true;
      conversation.requiresHumanReview = true;
      conversation.escalationReason = 'Bot disabled for this contact';
    } else if (intentMatch) {
      if (intentMatch.intent === 'human_handoff') {
        handoff = true;
        conversation.requiresHumanReview = true;
        conversation.escalationReason = 'User requested human agent';
        response = intentMatch.reply;
      } else {
        response = enrichReply(intentMatch.reply, intentMatch.intent, normalizedPhone);
        // Push auto-reply as outgoing
        conversation.messages.push({
          direction: 'outgoing',
          type: 'text',
          text: response,
          timestamp: new Date(),
          isAutoReply: true,
          intent: intentMatch.intent,
          deliveryStatus: 'sent',
        });
        conversation.lastIntent = intentMatch.intent;
      }
    } else {
      // Unknown intent → polite fallback + handoff
      handoff = true;
      conversation.requiresHumanReview = true;
      conversation.escalationReason = 'Unmatched intent';
      response =
        'عذراً، لم أفهم طلبك. سأحولك الآن للتواصل مع أحد الموظفين للمساعدة. شكراً لصبرك.';
      conversation.messages.push({
        direction: 'outgoing',
        type: 'text',
        text: response,
        timestamp: new Date(),
        isAutoReply: true,
        intent: 'general_question',
        deliveryStatus: 'sent',
      });
    }

    await conversation.save();
    return { response, handoff, intent: intentMatch?.intent || 'unknown' };
  },

  /**
   * 2. sendTemplateMessage
   * Send a templated message to a phone number.
   */
  async sendTemplateMessage(phone, templateId, variables = {}, opts = {}) {
    const normalizedPhone = normalizePhone(phone);
    const template = await WhatsAppChatbotTemplate.findById(templateId).lean();
    if (!template) {
      const err = new Error('Template not found');
      err.statusCode = 404;
      throw err;
    }

    let body = template.body;
    Object.entries(variables).forEach(([key, val]) => {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });
    body = body.replace(/{{\w+}}/g, '—');

    let conversation = await WhatsAppConversation.findOne({ phone: normalizedPhone }).sort({
      createdAt: -1,
    });
    if (!conversation) {
      conversation = new WhatsAppConversation({
        phone: normalizedPhone,
        organizationId: opts.organizationId || null,
        branchId: opts.branchId || null,
        status: 'active',
        messages: [],
      });
    }

    conversation.messages.push({
      direction: 'outgoing',
      type: 'template',
      text: body,
      timestamp: new Date(),
      isTemplate: true,
      templateName: template.name,
      deliveryStatus: 'sent',
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return { phone: normalizedPhone, body, templateName: template.name, sentAt: new Date() };
  },

  /**
   * 3. getConversationHistory
   */
  async getConversationHistory(phone, limit = 50) {
    const normalizedPhone = normalizePhone(phone);
    const conversation = await WhatsAppConversation.findOne({ phone: normalizedPhone })
      .sort({ createdAt: -1 })
      .lean();

    if (!conversation) return { phone: normalizedPhone, messages: [] };

    const messages = (conversation.messages || [])
      .slice(-limit)
      .map((m) => ({
        id: m._id?.toString(),
        direction: m.direction,
        type: m.type,
        text: m.text,
        isAutoReply: m.isAutoReply,
        isTemplate: m.isTemplate,
        templateName: m.templateName,
        intent: m.intent,
        deliveryStatus: m.deliveryStatus,
        timestamp: m.timestamp,
      }));

    return {
      phone: normalizedPhone,
      status: conversation.status,
      autoReplyEnabled: conversation.autoReplyEnabled,
      requiresHumanReview: conversation.requiresHumanReview,
      assignedTo: conversation.assignedTo,
      messages,
    };
  },

  /**
   * 4. getBotAnalytics
   */
  async getBotAnalytics(startDate, endDate, opts = {}) {
    const { organizationId, branchId } = opts;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const match = {
      lastMessageAt: { $gte: start, $lte: end },
      isDeleted: false,
    };
    if (organizationId) match.organizationId = new mongoose.Types.ObjectId(organizationId);
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const conversations = await WhatsAppConversation.find(match).lean();

    let totalMessages = 0;
    let autoReplies = 0;
    let handoffs = 0;
    let totalResponseTimeMs = 0;
    let responseCount = 0;
    const dailyCounts = {};
    const typeCounts = { incoming: 0, outgoing: 0, auto_reply: 0, template: 0 };

    conversations.forEach((conv) => {
      const msgs = conv.messages || [];
      totalMessages += msgs.length;

      msgs.forEach((m, idx) => {
        const day = m.timestamp ? m.timestamp.toISOString().split('T')[0] : null;
        if (day) {
          dailyCounts[day] = dailyCounts[day] || { date: day, incoming: 0, outgoing: 0 };
          dailyCounts[day][m.direction] += 1;
        }

        if (m.direction === 'incoming') typeCounts.incoming += 1;
        if (m.direction === 'outgoing') {
          typeCounts.outgoing += 1;
          if (m.isAutoReply) {
            autoReplies += 1;
            typeCounts.auto_reply += 1;
          }
          if (m.isTemplate) typeCounts.template += 1;
        }

        // Simple response-time: time between this incoming and next outgoing
        if (m.direction === 'incoming' && idx < msgs.length - 1) {
          const nextMsg = msgs[idx + 1];
          if (nextMsg.direction === 'outgoing' && nextMsg.timestamp && m.timestamp) {
            const diff = new Date(nextMsg.timestamp) - new Date(m.timestamp);
            if (diff >= 0 && diff < 10 * 60 * 1000) {
              // cap at 10 min to avoid skew
              totalResponseTimeMs += diff;
              responseCount += 1;
            }
          }
        }
      });

      if (conv.requiresHumanReview) handoffs += 1;
    });

    const totalConversations = conversations.length;
    const autoReplyRate = totalConversations > 0 ? (autoReplies / totalMessages) * 100 : 0;
    const handoffRate = totalConversations > 0 ? (handoffs / totalConversations) * 100 : 0;
    const avgResponseTimeSec =
      responseCount > 0 ? Math.round(totalResponseTimeMs / responseCount / 1000) : 0;

    const dailyTimeline = Object.values(dailyCounts).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMessages,
      totalConversations,
      autoReplyRate: Math.round(autoReplyRate * 10) / 10,
      handoffRate: Math.round(handoffRate * 10) / 10,
      avgResponseTimeSec,
      dailyTimeline,
      typeCounts,
    };
  },

  /**
   * 5. createTemplate
   */
  async createTemplate(templateData) {
    const template = new WhatsAppChatbotTemplate(templateData);
    await template.save();
    return template.toObject();
  },

  /**
   * 6. getTemplates
   */
  async getTemplates(filters = {}) {
    const query = { isActive: true };
    if (filters.organizationId) query.organizationId = filters.organizationId;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.category) query.category = filters.category;

    const templates = await WhatsAppChatbotTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();
    return templates;
  },

  /**
   * 7. toggleBotStatus
   */
  async toggleBotStatus(phone, enabled) {
    const normalizedPhone = normalizePhone(phone);
    const conversation = await WhatsAppConversation.findOneAndUpdate(
      { phone: normalizedPhone },
      { autoReplyEnabled: enabled },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!conversation) {
      const err = new Error('Conversation not found for this phone');
      err.statusCode = 404;
      throw err;
    }

    return {
      phone: normalizedPhone,
      autoReplyEnabled: conversation.autoReplyEnabled,
      status: conversation.status,
    };
  },

  // ─── Admin helpers ─────────────────────────────────────────────────────────
  async deleteTemplate(templateId) {
    await WhatsAppChatbotTemplate.findByIdAndDelete(templateId);
    return { deleted: true };
  },

  async updateTemplate(templateId, data) {
    const template = await WhatsAppChatbotTemplate.findByIdAndUpdate(templateId, data, {
      new: true,
    }).lean();
    return template;
  },
};

module.exports = whatsappChatbotService;
