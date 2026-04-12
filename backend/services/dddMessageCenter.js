'use strict';
/**
 * MessageCenter Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddMessageCenter.js
 */

const {
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
} = require('../models/DddMessageCenter');

const BaseCrudService = require('./base/BaseCrudService');

class MessageCenter extends BaseCrudService {
  constructor() {
    super('MessageCenter', {
      description: 'In-app messaging, conversations & message templates',
      version: '1.0.0',
    }, {
      conversations: DDDConversation,
      messages: DDDMessage,
      messageTemplates: DDDMessageTemplate,
      messageDrafts: DDDMessageDraft,
    })
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
  async getConversation(id) { return this._getById(DDDConversation, id); }
  async createConversation(data) {
    if (!data.conversationCode) data.conversationCode = `CONV-${Date.now()}`;
    return DDDConversation.create(data);
  }
  async archiveConversation(id) {
    return DDDConversation.findByIdAndUpdate(id, { status: 'archived' }, { new: true }).lean();
  }
  async closeConversation(id) {
    return DDDConversation.findByIdAndUpdate(id, { status: 'closed' }, { new: true }).lean();
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
    ).lean();
  }
  async deleteMessage(id) {
    return DDDMessage.findByIdAndUpdate(
      id,
      { status: 'deleted', deletedAt: new Date() },
      { new: true }
    ).lean();
  }
  async markAsRead(messageId, userId) {
    return DDDMessage.findByIdAndUpdate(
      messageId,
      {
        $addToSet: { readBy: { userId, readAt: new Date() } },
        status: 'read',
      },
      { new: true }
    ).lean();
  }

  /* ── Templates ── */
  async listTemplates(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDMessageTemplate.find(q).sort({ category: 1 }).lean();
  }
  async createTemplate(data) { return this._create(DDDMessageTemplate, data); }
  async updateTemplate(id, data) { return this._update(DDDMessageTemplate, id, data, { runValidators: true }); }

  /* ── Drafts ── */
  async listDrafts(userId) {
    return DDDMessageDraft.find({ userId }).sort({ updatedAt: -1 }).lean();
  }
  async saveDraft(data) { return this._create(DDDMessageDraft, data); }
  async updateDraft(id, data) { return this._update(DDDMessageDraft, id, data); }
  async deleteDraft(id) {
    return DDDMessageDraft.findByIdAndDelete(id).lean();
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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new MessageCenter();
