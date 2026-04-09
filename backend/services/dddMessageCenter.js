/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Message Center — Phase 21 · Communication & Messaging
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In-app messaging, conversation threads, group chats, message templates,
 * and secure clinical communication between staff & families.
 *
 * Aggregates
 *   DDDConversation     — chat thread / conversation
 *   DDDMessage          — individual message within a conversation
 *   DDDMessageTemplate  — reusable message template
 *   DDDMessageDraft     — saved draft messages
 *
 * Canonical links
 *   senderId     → User
 *   recipientId  → User
 *   staffId      → DDDStaffProfile (dddStaffManager)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const CONVERSATION_TYPES = [
  'direct',
  'group',
  'clinical_team',
  'family_communication',
  'case_discussion',
  'broadcast',
  'support_ticket',
  'referral',
  'consultation',
  'emergency',
  'department_channel',
  'announcement',
];

const CONVERSATION_STATUSES = [
  'active',
  'archived',
  'closed',
  'muted',
  'blocked',
  'pending',
  'locked',
  'flagged',
  'resolved',
  'deleted',
];

const MESSAGE_TYPES = [
  'text',
  'image',
  'file',
  'audio',
  'video',
  'location',
  'clinical_note',
  'assessment_link',
  'appointment_request',
  'system',
  'template',
  'rich_text',
];

const MESSAGE_STATUSES = [
  'draft',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'recalled',
  'expired',
  'flagged',
  'deleted',
];

const TEMPLATE_CATEGORIES = [
  'appointment_reminder',
  'session_summary',
  'progress_update',
  'billing_notice',
  'welcome_message',
  'discharge_summary',
  'follow_up',
  'consent_request',
  'feedback_request',
  'emergency_alert',
  'general',
  'clinical',
];

const MESSAGE_PRIORITIES = ['low', 'normal', 'high', 'urgent', 'critical', 'emergency'];

/* ── Built-in message templates ─────────────────────────────────────────── */
const BUILTIN_TEMPLATES = [
  {
    code: 'TPL-APPT-REM',
    name: 'Appointment Reminder',
    category: 'appointment_reminder',
    subject: 'Upcoming Appointment',
    bodyTemplate: 'Dear {{name}}, your appointment is on {{date}} at {{time}}.',
  },
  {
    code: 'TPL-SESS-SUM',
    name: 'Session Summary',
    category: 'session_summary',
    subject: 'Session Summary',
    bodyTemplate: 'Session on {{date}}: Goals addressed: {{goals}}. Progress: {{progress}}.',
  },
  {
    code: 'TPL-PROG-UPD',
    name: 'Progress Update',
    category: 'progress_update',
    subject: 'Progress Report',
    bodyTemplate: 'Dear {{familyName}}, here is the latest progress for {{beneficiaryName}}.',
  },
  {
    code: 'TPL-BILL-NOT',
    name: 'Billing Notice',
    category: 'billing_notice',
    subject: 'Invoice Available',
    bodyTemplate: 'Invoice #{{invoiceNumber}} for {{amount}} is now available.',
  },
  {
    code: 'TPL-WELCOME',
    name: 'Welcome Message',
    category: 'welcome_message',
    subject: 'Welcome to Our Center',
    bodyTemplate: 'Welcome {{name}}! We are glad to have you join our rehabilitation program.',
  },
  {
    code: 'TPL-DISCHARGE',
    name: 'Discharge Summary',
    category: 'discharge_summary',
    subject: 'Discharge Summary',
    bodyTemplate: 'Discharge summary for {{beneficiaryName}}, discharged on {{date}}.',
  },
  {
    code: 'TPL-FOLLOWUP',
    name: 'Follow Up',
    category: 'follow_up',
    subject: 'Follow-Up Reminder',
    bodyTemplate: 'Dear {{name}}, this is a follow-up regarding your recent visit on {{date}}.',
  },
  {
    code: 'TPL-CONSENT',
    name: 'Consent Request',
    category: 'consent_request',
    subject: 'Consent Required',
    bodyTemplate: 'Dear {{name}}, please review and sign the consent form for {{procedure}}.',
  },
  {
    code: 'TPL-FEEDBACK',
    name: 'Feedback Request',
    category: 'feedback_request',
    subject: 'Your Feedback Matters',
    bodyTemplate: 'Dear {{name}}, please share your experience with us.',
  },
  {
    code: 'TPL-EMERGENCY',
    name: 'Emergency Alert',
    category: 'emergency_alert',
    subject: 'Emergency Alert',
    bodyTemplate: 'URGENT: {{message}}. Please respond immediately.',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Conversation ──────────────────────────────────────────────────────── */
const conversationSchema = new Schema(
  {
    conversationCode: { type: String, required: true, unique: true },
    type: { type: String, enum: CONVERSATION_TYPES, required: true },
    status: { type: String, enum: CONVERSATION_STATUSES, default: 'active' },
    title: { type: String },
    participants: [
      {
        userId: Schema.Types.ObjectId,
        role: String,
        joinedAt: { type: Date, default: Date.now },
        lastReadAt: Date,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },
    messageCount: { type: Number, default: 0 },
    isEncrypted: { type: Boolean, default: false },
    tags: [{ type: String }],
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

conversationSchema.index({ 'participants.userId': 1, status: 1 });
conversationSchema.index({ type: 1, status: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const DDDConversation =
  mongoose.models.DDDConversation || mongoose.model('DDDConversation', conversationSchema);

/* ── Message ───────────────────────────────────────────────────────────── */
const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'DDDConversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'sent' },
    priority: { type: String, enum: MESSAGE_PRIORITIES, default: 'normal' },
    content: { type: String, required: true },
    subject: { type: String },
    attachments: [{ name: String, url: String, mimeType: String, size: Number }],
    replyTo: { type: Schema.Types.ObjectId, ref: 'DDDMessage' },
    readBy: [{ userId: Schema.Types.ObjectId, readAt: Date }],
    reactions: [{ userId: Schema.Types.ObjectId, emoji: String }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    deletedAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

const DDDMessage = mongoose.models.DDDMessage || mongoose.model('DDDMessage', messageSchema);

/* ── Message Template ──────────────────────────────────────────────────── */
const messageTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: TEMPLATE_CATEGORIES, required: true },
    subject: { type: String },
    bodyTemplate: { type: String, required: true },
    bodyTemplateAr: { type: String },
    variables: [{ name: String, description: String, required: Boolean }],
    channels: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageTemplateSchema.index({ category: 1, isActive: 1 });

const DDDMessageTemplate =
  mongoose.models.DDDMessageTemplate || mongoose.model('DDDMessageTemplate', messageTemplateSchema);

/* ── Message Draft ─────────────────────────────────────────────────────── */
const messageDraftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'DDDConversation' },
    recipientIds: [{ type: Schema.Types.ObjectId }],
    subject: { type: String },
    content: { type: String },
    attachments: [{ name: String, url: String, mimeType: String }],
    templateId: { type: Schema.Types.ObjectId, ref: 'DDDMessageTemplate' },
    scheduledAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageDraftSchema.index({ userId: 1, updatedAt: -1 });

const DDDMessageDraft =
  mongoose.models.DDDMessageDraft || mongoose.model('DDDMessageDraft', messageDraftSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class MessageCenter extends BaseDomainModule {
  constructor() {
    super('MessageCenter', {
      description: 'In-app messaging, conversations & message templates',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedTemplates();
    this.log('Message Center initialised ✓');
    return true;
  }

  async _seedTemplates() {
    for (const t of BUILTIN_TEMPLATES) {
      const exists = await DDDMessageTemplate.findOne({ code: t.code }).lean();
      if (!exists) await DDDMessageTemplate.create({ ...t, isActive: true });
    }
  }

  /* ── Conversations ── */
  async listConversations(userId, filters = {}) {
    const q = { 'participants.userId': userId };
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDConversation.find(q).sort({ lastMessageAt: -1 }).lean();
  }
  async getConversation(id) {
    return DDDConversation.findById(id).lean();
  }
  async createConversation(data) {
    if (!data.conversationCode) data.conversationCode = `CONV-${Date.now()}`;
    return DDDConversation.create(data);
  }
  async archiveConversation(id) {
    return DDDConversation.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
  }
  async closeConversation(id) {
    return DDDConversation.findByIdAndUpdate(id, { status: 'closed' }, { new: true });
  }

  /* ── Messages ── */
  async listMessages(conversationId, opts = {}) {
    const q = { conversationId };
    if (opts.before) q.createdAt = { $lt: new Date(opts.before) };
    const limit = opts.limit || 50;
    return DDDMessage.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  }
  async sendMessage(data) {
    const msg = await DDDMessage.create(data);
    await DDDConversation.findByIdAndUpdate(data.conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: data.content?.substring(0, 100),
      $inc: { messageCount: 1 },
    });
    return msg;
  }
  async editMessage(id, content) {
    return DDDMessage.findByIdAndUpdate(
      id,
      { content, isEdited: true, editedAt: new Date() },
      { new: true }
    );
  }
  async deleteMessage(id) {
    return DDDMessage.findByIdAndUpdate(
      id,
      { status: 'deleted', deletedAt: new Date() },
      { new: true }
    );
  }
  async markAsRead(messageId, userId) {
    return DDDMessage.findByIdAndUpdate(
      messageId,
      {
        $addToSet: { readBy: { userId, readAt: new Date() } },
        status: 'read',
      },
      { new: true }
    );
  }

  /* ── Templates ── */
  async listTemplates(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDMessageTemplate.find(q).sort({ category: 1 }).lean();
  }
  async createTemplate(data) {
    return DDDMessageTemplate.create(data);
  }
  async updateTemplate(id, data) {
    return DDDMessageTemplate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Drafts ── */
  async listDrafts(userId) {
    return DDDMessageDraft.find({ userId }).sort({ updatedAt: -1 }).lean();
  }
  async saveDraft(data) {
    return DDDMessageDraft.create(data);
  }
  async updateDraft(id, data) {
    return DDDMessageDraft.findByIdAndUpdate(id, data, { new: true });
  }
  async deleteDraft(id) {
    return DDDMessageDraft.findByIdAndDelete(id);
  }

  /* ── Search ── */
  async searchMessages(query, filters = {}) {
    const q = {};
    if (query) q.$text = { $search: query };
    if (filters.conversationId) q.conversationId = filters.conversationId;
    if (filters.senderId) q.senderId = filters.senderId;
    return DDDMessage.find(q).sort({ createdAt: -1 }).limit(50).lean();
  }

  /* ── Analytics ── */
  async getMessagingAnalytics() {
    const [conversations, messages, templates, drafts] = await Promise.all([
      DDDConversation.countDocuments(),
      DDDMessage.countDocuments(),
      DDDMessageTemplate.countDocuments(),
      DDDMessageDraft.countDocuments(),
    ]);
    const activeConversations = await DDDConversation.countDocuments({ status: 'active' });
    return { conversations, activeConversations, messages, templates, drafts };
  }

  async healthCheck() {
    const [conversations, messages, templates, drafts] = await Promise.all([
      DDDConversation.countDocuments(),
      DDDMessage.countDocuments(),
      DDDMessageTemplate.countDocuments(),
      DDDMessageDraft.countDocuments(),
    ]);
    return { status: 'healthy', conversations, messages, templates, drafts };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createMessageCenterRouter() {
  const router = Router();
  const svc = new MessageCenter();

  /* Conversations */
  router.get('/messaging/conversations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listConversations(req.query.userId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/messaging/conversations/:id', async (req, res) => {
    try {
      const d = await svc.getConversation(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/conversations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createConversation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/conversations/:id/archive', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.archiveConversation(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/conversations/:id/close', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.closeConversation(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Messages */
  router.get('/messaging/conversations/:conversationId/messages', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.listMessages(req.params.conversationId, req.query),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/messages', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.sendMessage(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/messaging/messages/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.editMessage(req.params.id, req.body.content) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.delete('/messaging/messages/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.deleteMessage(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/messages/:id/read', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.markAsRead(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Templates */
  router.get('/messaging/templates', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/templates', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/messaging/templates/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTemplate(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Drafts */
  router.get('/messaging/drafts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDrafts(req.query.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/messaging/drafts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.saveDraft(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/messaging/drafts/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDraft(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.delete('/messaging/drafts/:id', async (req, res) => {
    try {
      await svc.deleteDraft(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/messaging/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getMessagingAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/messaging/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  MessageCenter,
  DDDConversation,
  DDDMessage,
  DDDMessageTemplate,
  DDDMessageDraft,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
  MESSAGE_TYPES,
  MESSAGE_STATUSES,
  TEMPLATE_CATEGORIES,
  MESSAGE_PRIORITIES,
  BUILTIN_TEMPLATES,
  createMessageCenterRouter,
};
