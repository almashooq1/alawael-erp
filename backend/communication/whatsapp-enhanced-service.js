/* eslint-disable no-unused-vars */
/**
 * WhatsApp Enhanced Service - خدمات متقدمة لنظام الوتساب
 * =====================================================
 * خدمات:
 * - محرك الشات بوت والردود التلقائية
 * - جدولة الرسائل
 * - إدارة الحملات التسويقية
 * - إدارة جهات الاتصال والمجموعات
 * - الردود السريعة
 * - التوجيه والتعيين التلقائي
 * - التحليلات المتقدمة
 * - استطلاعات الرأي
 * - سير العمل (Flows)
 */

const logger = require('../utils/logger');
const {
  ChatbotRule,
  ChatbotSession,
  ScheduledMessage,
  Campaign,
  ContactGroup,
  Contact,
  QuickReply,
  AutoAssignmentRule,
  Label,
  Survey,
  SurveyResponse,
  Flow,
  AnalyticsSnapshot,
  Blacklist,
  NotificationPreference,
} = require('./whatsapp-enhanced-models');

const { whatsappService } = require('./whatsapp-service');

// ═══════════════════════════════════════════════════════════════════════════════
// 1) CHATBOT ENGINE - محرك الشات بوت
// ═══════════════════════════════════════════════════════════════════════════════

class ChatbotEngine {
  /**
   * معالجة رسالة واردة عبر الشات بوت
   */
  static async processIncomingMessage(tenantId, contactPhone, messageText, conversationId) {
    try {
      // التحقق من وجود جلسة نشطة
      const session = await ChatbotSession.findOne({
        tenantId,
        contactPhone,
        status: { $in: ['active', 'waiting_input'] },
      });

      if (session && session.status === 'waiting_input') {
        return await this._processFlowInput(session, messageText);
      }

      // البحث عن قاعدة مطابقة
      const rules = await ChatbotRule.find({
        tenantId,
        isActive: true,
      }).sort({ priority: -1 });

      let matchedRule = null;

      for (const rule of rules) {
        if (this._matchesRule(rule, messageText)) {
          matchedRule = rule;
          break;
        }
      }

      // إذا لم تطابق أي قاعدة، ابحث عن القاعدة الافتراضية
      if (!matchedRule) {
        matchedRule = await ChatbotRule.findOne({
          tenantId,
          isActive: true,
          isDefault: true,
        });
      }

      if (!matchedRule) {
        return { handled: false, reason: 'no_matching_rule' };
      }

      // التحقق من شروط التفعيل
      if (!this._checkConditions(matchedRule)) {
        return { handled: false, reason: 'conditions_not_met' };
      }

      // تنفيذ الرد
      const result = await this._executeRule(
        matchedRule,
        tenantId,
        contactPhone,
        conversationId,
        messageText
      );

      // تحديث الإحصائيات
      await ChatbotRule.updateOne(
        { _id: matchedRule._id },
        {
          $inc: { 'stats.triggered': 1 },
          $set: { 'stats.lastTriggered': new Date() },
        }
      );

      return { handled: true, rule: matchedRule.name, result };
    } catch (error) {
      logger.error('Chatbot processing error:', error);
      return { handled: false, error: error.message };
    }
  }

  static _matchesRule(rule, text) {
    if (!text || !rule.patterns || rule.patterns.length === 0) return false;

    const lowerText = text.toLowerCase().trim();

    for (const pattern of rule.patterns) {
      switch (rule.matchType) {
        case 'exact':
          if (lowerText === pattern.toLowerCase()) return true;
          break;
        case 'contains':
          if (lowerText.includes(pattern.toLowerCase())) return true;
          break;
        case 'starts_with':
          if (lowerText.startsWith(pattern.toLowerCase())) return true;
          break;
        case 'keyword': {
          // تطابق الكلمة كاملة
          const wordRegex = new RegExp(
            `\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'i'
          );
          if (wordRegex.test(text)) return true;
          break;
        }
        case 'regex':
          try {
            const regex = new RegExp(pattern, rule.patternFlags || 'i');
            if (regex.test(text)) return true;
          } catch (_) {
            /* skip invalid regex */
          }
          break;
        case 'ai_intent':
          // placeholder for AI-based intent matching
          break;
      }
    }

    return false;
  }

  static _checkConditions(rule) {
    if (!rule.conditions) return true;

    const { activeHours } = rule.conditions;
    if (activeHours && activeHours.enabled) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const dayOfWeek = now.getDay();

      if (activeHours.daysOfWeek && activeHours.daysOfWeek.length > 0) {
        if (!activeHours.daysOfWeek.includes(dayOfWeek)) return false;
      }

      if (activeHours.start && activeHours.end) {
        if (currentTime < activeHours.start || currentTime > activeHours.end) return false;
      }
    }

    return true;
  }

  static async _executeRule(rule, tenantId, contactPhone, conversationId, userMessage) {
    const { responseType, response } = rule;

    switch (responseType) {
      case 'text': {
        const text = response.textAr || response.text;
        if (text) {
          await whatsappService.sendText(contactPhone, text);
        }
        return { type: 'text', sent: true };
      }

      case 'template': {
        if (response.templateName) {
          await whatsappService.sendTemplate(
            contactPhone,
            response.templateName,
            response.templateParams || []
          );
        }
        return { type: 'template', sent: true };
      }

      case 'interactive': {
        if (response.interactive) {
          await whatsappService.sendInteractive(contactPhone, response.interactive);
        }
        return { type: 'interactive', sent: true };
      }

      case 'media': {
        if (response.mediaUrl) {
          switch (response.mediaType) {
            case 'image':
              await whatsappService.sendImage(contactPhone, response.mediaUrl, response.text);
              break;
            case 'video':
              await whatsappService.sendVideo(contactPhone, response.mediaUrl, response.text);
              break;
            case 'document':
              await whatsappService.sendDocument(
                contactPhone,
                response.mediaUrl,
                'file',
                response.text
              );
              break;
            case 'audio':
              await whatsappService.sendAudio(contactPhone, response.mediaUrl);
              break;
          }
        }
        return { type: 'media', sent: true };
      }

      case 'flow': {
        if (response.flowSteps && response.flowSteps.length > 0) {
          const firstStep = response.flowSteps[0];
          const session = await ChatbotSession.create({
            tenantId,
            contactPhone,
            conversationId,
            status: 'waiting_input',
            activeRuleId: rule._id,
            currentFlowStep: firstStep.stepId,
            collectedData: {},
            history: [
              {
                ruleId: rule._id,
                userMessage,
                botResponse: firstStep.messageAr || firstStep.message,
                flowStep: firstStep.stepId,
              },
            ],
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          });

          // إرسال أول خطوة
          if (firstStep.type === 'button' && firstStep.options) {
            const buttons = firstStep.options.map((opt, i) => ({
              type: 'reply',
              reply: { id: `flow_${i}`, title: opt.labelAr || opt.label },
            }));
            await whatsappService.sendInteractive(contactPhone, {
              type: 'button',
              body: { text: firstStep.messageAr || firstStep.message },
              action: { buttons },
            });
          } else if (firstStep.type === 'list' && firstStep.options) {
            const rows = firstStep.options.map((opt, i) => ({
              id: `flow_${i}`,
              title: opt.labelAr || opt.label,
            }));
            await whatsappService.sendInteractive(contactPhone, {
              type: 'list',
              body: { text: firstStep.messageAr || firstStep.message },
              action: {
                button: 'اختر',
                sections: [{ title: 'الخيارات', rows }],
              },
            });
          } else {
            await whatsappService.sendText(contactPhone, firstStep.messageAr || firstStep.message);
          }

          return { type: 'flow', sessionId: session._id, sent: true };
        }
        return { type: 'flow', sent: false };
      }

      case 'transfer_agent': {
        if (response.transferTo) {
          // إعلام المستخدم
          if (response.transferTo.message) {
            await whatsappService.sendText(contactPhone, response.transferTo.message);
          }
          return {
            type: 'transfer',
            department: response.transferTo.department,
            agentId: response.transferTo.agentId,
          };
        }
        return { type: 'transfer', sent: false };
      }

      default:
        return { type: 'unknown', sent: false };
    }
  }

  static async _processFlowInput(session, userMessage) {
    try {
      const rule = await ChatbotRule.findById(session.activeRuleId);
      if (!rule || !rule.response.flowSteps) {
        session.status = 'completed';
        await session.save();
        return { handled: false, reason: 'flow_not_found' };
      }

      const currentStep = rule.response.flowSteps.find(s => s.stepId === session.currentFlowStep);
      if (!currentStep) {
        session.status = 'completed';
        await session.save();
        return { handled: false, reason: 'step_not_found' };
      }

      // حفظ البيانات المُجمَّعة
      if (!session.collectedData) session.collectedData = {};
      session.collectedData[currentStep.stepId] = userMessage;

      // تحديد الخطوة التالية
      let nextStepId = currentStep.nextStep;
      if (currentStep.options) {
        const matchedOption = currentStep.options.find(
          opt =>
            opt.label === userMessage || opt.labelAr === userMessage || opt.value === userMessage
        );
        if (matchedOption && matchedOption.nextStep) {
          nextStepId = matchedOption.nextStep;
        }
      }

      if (!nextStepId) {
        session.status = 'completed';
        session.history.push({
          ruleId: rule._id,
          userMessage,
          botResponse: 'شكراً لك!',
          flowStep: currentStep.stepId,
        });
        await session.save();
        await whatsappService.sendText(session.contactPhone, 'شكراً لك! تم استلام بياناتك.');
        return { handled: true, type: 'flow_completed', collectedData: session.collectedData };
      }

      const nextStep = rule.response.flowSteps.find(s => s.stepId === nextStepId);
      if (!nextStep) {
        session.status = 'completed';
        await session.save();
        return { handled: false, reason: 'next_step_not_found' };
      }

      // الانتقال للخطوة التالية
      session.currentFlowStep = nextStepId;
      session.history.push({
        ruleId: rule._id,
        userMessage,
        botResponse: nextStep.messageAr || nextStep.message,
        flowStep: nextStepId,
      });
      await session.save();

      await whatsappService.sendText(session.contactPhone, nextStep.messageAr || nextStep.message);
      return { handled: true, type: 'flow_step', currentStep: nextStepId };
    } catch (error) {
      logger.error('Flow processing error:', error);
      return { handled: false, error: error.message };
    }
  }

  // ── CRUD Operations ──

  static async createRule(data) {
    return ChatbotRule.create(data);
  }

  static async getRules(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return ChatbotRule.find(query).sort({ priority: -1 });
  }

  static async getRuleById(id) {
    return ChatbotRule.findById(id).populate('createdBy', 'name email');
  }

  static async updateRule(id, data) {
    return ChatbotRule.findByIdAndUpdate(id, data, { new: true });
  }

  static async deleteRule(id) {
    return ChatbotRule.findByIdAndDelete(id);
  }

  static async toggleRule(id) {
    const rule = await ChatbotRule.findById(id);
    if (!rule) return null;
    rule.isActive = !rule.isActive;
    await rule.save();
    return rule;
  }

  static async getSessions(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return ChatbotSession.find(query).sort({ updatedAt: -1 }).limit(100);
  }

  static async getSessionStats(tenantId) {
    const [stats] = await ChatbotSession.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const result = await ChatbotSession.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return result.reduce((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2) SCHEDULER - جدولة الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

class MessageScheduler {
  static _intervalId = null;

  /**
   * بدء جدولة المعالجة (كل دقيقة)
   */
  static start() {
    if (this._intervalId) return;
    this._intervalId = setInterval(() => this.processScheduledMessages(), 60 * 1000);
    logger.info('WhatsApp message scheduler started');
  }

  static stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      logger.info('WhatsApp message scheduler stopped');
    }
  }

  /**
   * معالجة الرسائل المُجدولة
   */
  static async processScheduledMessages() {
    try {
      const now = new Date();
      const messages = await ScheduledMessage.find({
        status: 'pending',
        scheduledAt: { $lte: now },
      }).limit(50);

      for (const msg of messages) {
        try {
          msg.status = 'processing';
          await msg.save();

          const result = await this._sendScheduledMessage(msg);

          msg.status = 'sent';
          msg.result = {
            waMessageId: result?.messageId,
            sentAt: new Date(),
            attempts: (msg.result?.attempts || 0) + 1,
          };

          // معالجة التكرار
          if (msg.recurrence?.enabled) {
            await this._scheduleNextOccurrence(msg);
          }

          await msg.save();
        } catch (sendError) {
          msg.status = 'failed';
          msg.result = {
            error: sendError.message,
            attempts: (msg.result?.attempts || 0) + 1,
          };
          await msg.save();
          logger.error(`Scheduled message ${msg._id} failed:`, sendError);
        }
      }
    } catch (error) {
      logger.error('Scheduler processing error:', error);
    }
  }

  static async _sendScheduledMessage(msg) {
    const { recipient, messageType, content } = msg;

    switch (messageType) {
      case 'text':
        return whatsappService.sendText(recipient.phone, content.text);
      case 'template':
        return whatsappService.sendTemplate(
          recipient.phone,
          content.templateName,
          content.templateParams
        );
      case 'image':
        return whatsappService.sendImage(recipient.phone, content.mediaUrl, content.mediaCaption);
      case 'document':
        return whatsappService.sendDocument(
          recipient.phone,
          content.mediaUrl,
          'file',
          content.mediaCaption
        );
      case 'video':
        return whatsappService.sendVideo(recipient.phone, content.mediaUrl, content.mediaCaption);
      case 'interactive':
        return whatsappService.sendInteractive(recipient.phone, content.interactive);
      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }
  }

  static async _scheduleNextOccurrence(msg) {
    const { recurrence } = msg;
    if (!recurrence.enabled) return;

    if (recurrence.maxOccurrences && recurrence.occurrenceCount >= recurrence.maxOccurrences)
      return;
    if (recurrence.endDate && new Date() >= new Date(recurrence.endDate)) return;

    const nextDate = new Date(msg.scheduledAt);

    switch (recurrence.pattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (recurrence.interval || 1));
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7 * (recurrence.interval || 1));
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + (recurrence.interval || 1));
        break;
    }

    msg.scheduledAt = nextDate;
    msg.status = 'pending';
    msg.recurrence.occurrenceCount = (msg.recurrence.occurrenceCount || 0) + 1;
  }

  // ── CRUD ──

  static async create(data) {
    return ScheduledMessage.create(data);
  }

  static async getAll(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return ScheduledMessage.find(query)
      .sort({ scheduledAt: 1 })
      .populate('createdBy', 'name email');
  }

  static async getById(id) {
    return ScheduledMessage.findById(id).populate('createdBy', 'name email');
  }

  static async update(id, data) {
    return ScheduledMessage.findByIdAndUpdate(id, data, { new: true });
  }

  static async cancel(id, userId) {
    return ScheduledMessage.findByIdAndUpdate(
      id,
      { status: 'cancelled', cancelledBy: userId },
      { new: true }
    );
  }

  static async delete(id) {
    return ScheduledMessage.findByIdAndDelete(id);
  }

  static async getStats(tenantId) {
    const result = await ScheduledMessage.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return result.reduce((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3) CAMPAIGN MANAGER - إدارة الحملات
// ═══════════════════════════════════════════════════════════════════════════════

class CampaignManager {
  static async create(data) {
    const campaign = await Campaign.create(data);

    // حساب إجمالي المستلمين
    let totalRecipients = 0;
    if (campaign.audience?.customRecipients) {
      totalRecipients = campaign.audience.customRecipients.length;
    }
    if (campaign.audience?.groupIds?.length > 0) {
      const groups = await ContactGroup.find({ _id: { $in: campaign.audience.groupIds } });
      totalRecipients += groups.reduce((sum, g) => sum + (g.memberCount || 0), 0);
    }
    if (campaign.audience?.tags?.length > 0) {
      const tagCount = await Contact.countDocuments({
        tenantId: data.tenantId,
        tags: { $in: campaign.audience.tags },
        'optIn.status': true,
        'blocked.status': false,
      });
      totalRecipients += tagCount;
    }

    campaign.audience.totalRecipients = totalRecipients;
    campaign.progress.total = totalRecipients;
    await campaign.save();

    return campaign;
  }

  static async getAll(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return Campaign.find(query).sort({ createdAt: -1 }).populate('createdBy', 'name email');
  }

  static async getById(id) {
    return Campaign.findById(id).populate('createdBy updatedBy', 'name email');
  }

  static async update(id, data) {
    return Campaign.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id) {
    return Campaign.findByIdAndDelete(id);
  }

  /**
   * تشغيل الحملة
   */
  static async launch(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) throw new Error('الحملة غير موجودة');
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('لا يمكن تشغيل حملة في الحالة: ' + campaign.status);
    }

    campaign.status = 'running';
    campaign.progress.startedAt = new Date();
    await campaign.save();

    // بدء الإرسال في الخلفية
    this._executeCampaign(campaign).catch(err => {
      logger.error(`Campaign ${id} execution error:`, err);
    });

    return campaign;
  }

  static async pause(id) {
    return Campaign.findByIdAndUpdate(id, { status: 'paused' }, { new: true });
  }

  static async resume(id) {
    const campaign = await Campaign.findByIdAndUpdate(id, { status: 'running' }, { new: true });
    if (campaign) {
      this._executeCampaign(campaign).catch(err => {
        logger.error(`Campaign ${id} resume error:`, err);
      });
    }
    return campaign;
  }

  static async cancel(id) {
    return Campaign.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
  }

  static async _executeCampaign(campaign) {
    try {
      const recipients = await this._getRecipients(campaign);
      const { batchSize = 50, batchDelayMs = 2000, maxRetries = 3 } = campaign.settings || {};

      for (let i = 0; i < recipients.length; i += batchSize) {
        // التحقق من أن الحملة لا تزال في حالة التشغيل
        const currentCampaign = await Campaign.findById(campaign._id);
        if (!currentCampaign || currentCampaign.status !== 'running') break;

        const batch = recipients.slice(i, i + batchSize);

        for (const recipient of batch) {
          try {
            await this._sendCampaignMessage(campaign, recipient);
            await Campaign.updateOne(
              { _id: campaign._id },
              {
                $inc: { 'progress.sent': 1 },
                $set: { 'progress.lastProcessedAt': new Date() },
              }
            );
          } catch (sendError) {
            await Campaign.updateOne({ _id: campaign._id }, { $inc: { 'progress.failed': 1 } });
            logger.error(`Campaign message send failed:`, sendError.message);
          }
        }

        // تأخير بين الدُفعات
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelayMs));
        }
      }

      // اكتمال الحملة
      await Campaign.updateOne(
        { _id: campaign._id },
        {
          $set: {
            status: 'completed',
            'progress.completedAt': new Date(),
          },
        }
      );
    } catch (error) {
      await Campaign.updateOne({ _id: campaign._id }, { $set: { status: 'failed' } });
      throw error;
    }
  }

  static async _getRecipients(campaign) {
    let recipients = [];

    if (campaign.audience?.customRecipients?.length > 0) {
      recipients.push(...campaign.audience.customRecipients);
    }

    if (campaign.audience?.groupIds?.length > 0) {
      const groups = await ContactGroup.find({ _id: { $in: campaign.audience.groupIds } });
      for (const group of groups) {
        for (const member of group.members) {
          if (!recipients.find(r => r.phone === member.phone)) {
            recipients.push({ phone: member.phone, name: member.name });
          }
        }
      }
    }

    if (campaign.audience?.tags?.length > 0) {
      const contacts = await Contact.find({
        tenantId: campaign.tenantId,
        tags: { $in: campaign.audience.tags },
        'optIn.status': true,
        'blocked.status': false,
      });
      for (const contact of contacts) {
        if (!recipients.find(r => r.phone === contact.phone)) {
          recipients.push({ phone: contact.phone, name: contact.name || contact.nameAr });
        }
      }
    }

    // استبعاد القائمة السوداء
    if (campaign.settings?.respectOptOut) {
      const blacklisted = await Blacklist.find({
        tenantId: campaign.tenantId,
        isActive: true,
        phone: { $in: recipients.map(r => r.phone) },
      }).select('phone');
      const blacklistSet = new Set(blacklisted.map(b => b.phone));
      recipients = recipients.filter(r => !blacklistSet.has(r.phone));
    }

    return recipients;
  }

  static async _sendCampaignMessage(campaign, recipient) {
    const { messageType, content } = campaign;

    switch (messageType) {
      case 'text':
        return whatsappService.sendText(recipient.phone, content.text);
      case 'template':
        return whatsappService.sendTemplate(
          recipient.phone,
          content.templateName,
          recipient.params || content.templateParams
        );
      case 'image':
        return whatsappService.sendImage(recipient.phone, content.mediaUrl, content.mediaCaption);
      case 'interactive':
        return whatsappService.sendInteractive(recipient.phone, content.interactive);
      default:
        return whatsappService.sendText(recipient.phone, content.text || '');
    }
  }

  static async getStats(tenantId) {
    const result = await Campaign.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSent: { $sum: '$progress.sent' },
          totalDelivered: { $sum: '$progress.delivered' },
          totalRead: { $sum: '$progress.read' },
          totalFailed: { $sum: '$progress.failed' },
        },
      },
    ]);
    return result;
  }

  static async duplicate(id) {
    const original = await Campaign.findById(id).lean();
    if (!original) throw new Error('الحملة غير موجودة');
    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;
    original.name = `${original.name} (نسخة)`;
    original.status = 'draft';
    original.progress = { total: original.progress?.total || 0 };
    return Campaign.create(original);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4) CONTACT MANAGER - إدارة جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

class ContactManager {
  // ── Contacts ──

  static async createContact(data) {
    return Contact.create(data);
  }

  static async getContacts(tenantId, options = {}) {
    const { page = 1, limit = 50, search, tags, blocked, optedIn, sort = '-updatedAt' } = options;
    const query = { tenantId, isActive: true };

    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } },
      ];
    }
    if (tags) query.tags = { $in: tags.split(',') };
    if (blocked !== undefined) query['blocked.status'] = blocked === 'true';
    if (optedIn !== undefined) query['optIn.status'] = optedIn === 'true';

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('labels');

    return { contacts, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  static async getContactByPhone(tenantId, phone) {
    return Contact.findOne({ tenantId, phone }).populate('labels groups');
  }

  static async updateContact(id, data) {
    return Contact.findByIdAndUpdate(id, data, { new: true });
  }

  static async deleteContact(id) {
    return Contact.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async addTag(id, tag) {
    return Contact.findByIdAndUpdate(id, { $addToSet: { tags: tag } }, { new: true });
  }

  static async removeTag(id, tag) {
    return Contact.findByIdAndUpdate(id, { $pull: { tags: tag } }, { new: true });
  }

  static async addNote(id, text, userId) {
    return Contact.findByIdAndUpdate(
      id,
      { $push: { notes: { text, createdBy: userId } } },
      { new: true }
    );
  }

  static async blockContact(tenantId, phone, reason, userId) {
    await Contact.updateOne(
      { tenantId, phone },
      {
        $set: {
          'blocked.status': true,
          'blocked.reason': reason,
          'blocked.blockedAt': new Date(),
          'blocked.blockedBy': userId,
        },
      }
    );
    // إضافة إلى القائمة السوداء أيضاً
    await Blacklist.findOneAndUpdate(
      { tenantId, phone },
      {
        tenantId,
        phone,
        reason,
        category: 'manual',
        blockedBy: userId,
        isActive: true,
      },
      { upsert: true }
    );
    return { success: true };
  }

  static async unblockContact(tenantId, phone) {
    await Contact.updateOne({ tenantId, phone }, { $set: { 'blocked.status': false } });
    await Blacklist.updateOne({ tenantId, phone }, { isActive: false });
    return { success: true };
  }

  static async optOut(tenantId, phone) {
    return Contact.updateOne(
      { tenantId, phone },
      {
        $set: {
          'optIn.status': false,
          'optIn.optedOutAt': new Date(),
          'optIn.method': 'keyword',
        },
      }
    );
  }

  static async optIn(tenantId, phone) {
    return Contact.updateOne(
      { tenantId, phone },
      {
        $set: {
          'optIn.status': true,
          'optIn.optedInAt': new Date(),
          'optIn.method': 'manual',
        },
      }
    );
  }

  static async importContacts(tenantId, contacts, userId) {
    const results = { success: 0, failed: 0, duplicates: 0, errors: [] };

    for (const c of contacts) {
      try {
        await Contact.findOneAndUpdate(
          { tenantId, phone: c.phone },
          {
            tenantId,
            phone: c.phone,
            name: c.name,
            nameAr: c.nameAr,
            email: c.email,
            tags: c.tags || [],
            'optIn.status': true,
            'optIn.optedInAt': new Date(),
            'optIn.method': 'manual',
            isActive: true,
          },
          { upsert: true, new: true }
        );
        results.success++;
      } catch (error) {
        if (error.code === 11000) {
          results.duplicates++;
        } else {
          results.failed++;
          results.errors.push({ phone: c.phone, error: error.message });
        }
      }
    }
    return results;
  }

  static async getContactStats(tenantId) {
    const [total, active, blocked, optedOut] = await Promise.all([
      Contact.countDocuments({ tenantId }),
      Contact.countDocuments({ tenantId, isActive: true, 'blocked.status': false }),
      Contact.countDocuments({ tenantId, 'blocked.status': true }),
      Contact.countDocuments({ tenantId, 'optIn.status': false }),
    ]);
    return { total, active, blocked, optedOut };
  }

  // ── Groups ──

  static async createGroup(data) {
    const group = await ContactGroup.create(data);
    group.memberCount = group.members?.length || 0;
    await group.save();
    return group;
  }

  static async getGroups(tenantId) {
    return ContactGroup.find({ tenantId, isActive: true }).sort({ name: 1 });
  }

  static async getGroupById(id) {
    return ContactGroup.findById(id);
  }

  static async updateGroup(id, data) {
    const group = await ContactGroup.findByIdAndUpdate(id, data, { new: true });
    if (group) {
      group.memberCount = group.members?.length || 0;
      await group.save();
    }
    return group;
  }

  static async deleteGroup(id) {
    return ContactGroup.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async addMemberToGroup(groupId, member) {
    return ContactGroup.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { members: member },
        $inc: { memberCount: 1 },
      },
      { new: true }
    );
  }

  static async removeMemberFromGroup(groupId, phone) {
    return ContactGroup.findByIdAndUpdate(
      groupId,
      {
        $pull: { members: { phone } },
        $inc: { memberCount: -1 },
      },
      { new: true }
    );
  }

  // ── Labels ──

  static async createLabel(data) {
    return Label.create(data);
  }

  static async getLabels(tenantId) {
    return Label.find({ tenantId, isActive: true }).sort({ name: 1 });
  }

  static async updateLabel(id, data) {
    return Label.findByIdAndUpdate(id, data, { new: true });
  }

  static async deleteLabel(id) {
    return Label.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async assignLabel(contactId, labelId) {
    await Contact.findByIdAndUpdate(contactId, { $addToSet: { labels: labelId } });
    await Label.findByIdAndUpdate(labelId, { $inc: { usageCount: 1 } });
    return { success: true };
  }

  static async removeLabel(contactId, labelId) {
    await Contact.findByIdAndUpdate(contactId, { $pull: { labels: labelId } });
    await Label.findByIdAndUpdate(labelId, { $inc: { usageCount: -1 } });
    return { success: true };
  }

  // ── Blacklist ──

  static async addToBlacklist(data) {
    return Blacklist.create(data);
  }

  static async getBlacklist(tenantId) {
    return Blacklist.find({ tenantId, isActive: true })
      .sort({ createdAt: -1 })
      .populate('blockedBy', 'name email');
  }

  static async removeFromBlacklist(id) {
    return Blacklist.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async isBlacklisted(tenantId, phone) {
    const entry = await Blacklist.findOne({ tenantId, phone, isActive: true });
    return !!entry;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5) QUICK REPLY MANAGER - إدارة الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

class QuickReplyManager {
  static async create(data) {
    return QuickReply.create(data);
  }

  static async getAll(tenantId, options = {}) {
    const { category, search } = options;
    const query = { tenantId, isActive: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { shortcut: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { titleAr: { $regex: search, $options: 'i' } },
      ];
    }
    return QuickReply.find(query).sort({ category: 1, title: 1 });
  }

  static async getByShortcut(tenantId, shortcut) {
    return QuickReply.findOne({ tenantId, shortcut, isActive: true });
  }

  static async getById(id) {
    return QuickReply.findById(id);
  }

  static async update(id, data) {
    return QuickReply.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id) {
    return QuickReply.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  /**
   * إرسال رد سريع مع استبدال المتغيرات
   */
  static async sendQuickReply(tenantId, shortcut, phone, variables = {}) {
    const reply = await QuickReply.findOne({ tenantId, shortcut, isActive: true });
    if (!reply) throw new Error('الرد السريع غير موجود');

    let text = reply.content.textAr || reply.content.text;
    // استبدال المتغيرات
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    const result = await whatsappService.sendText(phone, text);

    // تحديث الإحصائيات
    await QuickReply.updateOne(
      { _id: reply._id },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
    );

    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6) AUTO-ASSIGNMENT ENGINE - محرك التعيين التلقائي
// ═══════════════════════════════════════════════════════════════════════════════

class AutoAssignmentEngine {
  static async assignConversation(tenantId, conversationId, messageText, contactTags = []) {
    try {
      const rules = await AutoAssignmentRule.find({
        tenantId,
        isActive: true,
      }).sort({ priority: -1 });

      for (const rule of rules) {
        if (this._matchesConditions(rule, messageText, contactTags)) {
          const agent = this._selectAgent(rule);
          if (agent) {
            return {
              assigned: true,
              rule: rule.name,
              agent: agent.userId,
              department: rule.assignment.department,
              autoReply: rule.notification.autoReplyAr || rule.notification.autoReply,
            };
          }
        }
      }

      return { assigned: false, reason: 'no_matching_rule' };
    } catch (error) {
      logger.error('Auto-assignment error:', error);
      return { assigned: false, error: error.message };
    }
  }

  static _matchesConditions(rule, messageText, contactTags) {
    const { conditions } = rule;
    if (!conditions) return true;

    if (conditions.keywords?.length > 0 && messageText) {
      const lowerText = messageText.toLowerCase();
      if (!conditions.keywords.some(k => lowerText.includes(k.toLowerCase()))) {
        return false;
      }
    }

    if (conditions.contactTags?.length > 0) {
      if (!conditions.contactTags.some(t => contactTags.includes(t))) {
        return false;
      }
    }

    return true;
  }

  static _selectAgent(rule) {
    const { agents, currentAgentIndex } = rule.assignment;
    if (!agents || agents.length === 0) return null;

    switch (rule.type) {
      case 'round_robin': {
        const available = agents.filter(a => a.currentLoad < a.maxConcurrent);
        if (available.length === 0) return null;
        const idx = (currentAgentIndex || 0) % available.length;
        // تحديث المؤشر
        AutoAssignmentRule.updateOne(
          { _id: rule._id },
          { 'assignment.currentAgentIndex': idx + 1 }
        ).catch(() => {});
        return available[idx];
      }

      case 'load_balanced': {
        const available = agents.filter(a => a.currentLoad < a.maxConcurrent);
        if (available.length === 0) return null;
        return available.reduce(
          (min, a) => (a.currentLoad < min.currentLoad ? a : min),
          available[0]
        );
      }

      default:
        return agents[0];
    }
  }

  // ── CRUD ──

  static async createRule(data) {
    return AutoAssignmentRule.create(data);
  }

  static async getRules(tenantId) {
    return AutoAssignmentRule.find({ tenantId, isActive: true }).sort({ priority: -1 });
  }

  static async getById(id) {
    return AutoAssignmentRule.findById(id);
  }

  static async update(id, data) {
    return AutoAssignmentRule.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id) {
    return AutoAssignmentRule.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7) SURVEY MANAGER - إدارة استطلاعات الرأي
// ═══════════════════════════════════════════════════════════════════════════════

class SurveyManager {
  static async create(data) {
    return Survey.create(data);
  }

  static async getAll(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return Survey.find(query).sort({ createdAt: -1 });
  }

  static async getById(id) {
    return Survey.findById(id);
  }

  static async update(id, data) {
    return Survey.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id) {
    return Survey.findByIdAndDelete(id);
  }

  /**
   * تشغيل الاستطلاع وإرسال الأسئلة للمستلمين
   */
  static async launch(id) {
    const survey = await Survey.findById(id);
    if (!survey) throw new Error('الاستطلاع غير موجود');

    survey.status = 'active';
    await survey.save();

    const recipients = await this._getRecipients(survey);

    // إرسال السؤال الأول لكل مستلم
    const firstQuestion = survey.questions.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
    if (!firstQuestion) throw new Error('لا توجد أسئلة في الاستطلاع');

    let sent = 0;
    for (const recipient of recipients) {
      try {
        await this._sendQuestion(recipient.phone, survey, firstQuestion, 0);

        // إنشاء سجل الاستجابة
        await SurveyResponse.create({
          surveyId: survey._id,
          tenantId: survey.tenantId,
          contactPhone: recipient.phone,
          contactName: recipient.name,
          status: 'partial',
          currentQuestion: 0,
        });

        sent++;
      } catch (err) {
        logger.error(`Survey send failed for ${recipient.phone}:`, err.message);
      }
    }

    survey.stats.totalSent = sent;
    await survey.save();

    return { surveyId: survey._id, sent, totalRecipients: recipients.length };
  }

  static async _getRecipients(survey) {
    const recipients = [];
    if (survey.audience?.recipients) {
      recipients.push(...survey.audience.recipients);
    }
    if (survey.audience?.groupIds?.length > 0) {
      const groups = await ContactGroup.find({ _id: { $in: survey.audience.groupIds } });
      for (const group of groups) {
        for (const member of group.members) {
          if (!recipients.find(r => r.phone === member.phone)) {
            recipients.push({ phone: member.phone, name: member.name });
          }
        }
      }
    }
    return recipients;
  }

  static async _sendQuestion(phone, survey, question, questionIndex) {
    if (question.type === 'single_choice' || question.type === 'yes_no') {
      // إرسال كأزرار تفاعلية
      const options =
        question.type === 'yes_no'
          ? [
              { label: 'نعم', value: 'yes' },
              { label: 'لا', value: 'no' },
            ]
          : question.options;

      if (options.length <= 3) {
        const buttons = options.map((opt, i) => ({
          type: 'reply',
          reply: {
            id: `survey_${survey._id}_q${questionIndex}_${i}`,
            title: opt.labelAr || opt.label,
          },
        }));
        await whatsappService.sendInteractive(phone, {
          type: 'button',
          body: { text: question.textAr || question.text },
          action: { buttons },
        });
      } else {
        // القائمة إذا كان أكثر من 3 خيارات
        const rows = options.map((opt, i) => ({
          id: `survey_${survey._id}_q${questionIndex}_${i}`,
          title: opt.labelAr || opt.label,
        }));
        await whatsappService.sendInteractive(phone, {
          type: 'list',
          body: { text: question.textAr || question.text },
          action: {
            button: 'اختر إجابتك',
            sections: [{ title: 'الخيارات', rows }],
          },
        });
      }
    } else if (question.type === 'rating' || question.type === 'nps') {
      const max = question.type === 'nps' ? 10 : 5;
      const text = `${question.textAr || question.text}\n\nالرجاء الرد برقم من 1 إلى ${max}`;
      await whatsappService.sendText(phone, text);
    } else {
      // نص حر
      await whatsappService.sendText(phone, question.textAr || question.text);
    }
  }

  /**
   * معالجة إجابة واردة
   */
  static async processAnswer(surveyId, contactPhone, answer) {
    const response = await SurveyResponse.findOne({ surveyId, contactPhone, status: 'partial' });
    if (!response) return { handled: false, reason: 'no_active_response' };

    const survey = await Survey.findById(surveyId);
    if (!survey) return { handled: false, reason: 'survey_not_found' };

    const sortedQuestions = survey.questions.sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentQ = sortedQuestions[response.currentQuestion];

    // حفظ الإجابة
    response.answers.push({
      questionId: currentQ.questionId,
      value: answer,
    });

    const nextIdx = response.currentQuestion + 1;

    if (nextIdx >= sortedQuestions.length) {
      // اكتمال الاستطلاع
      response.status = 'completed';
      response.completedAt = new Date();
      await response.save();

      // تحديث إحصائيات الاستطلاع
      await Survey.updateOne({ _id: surveyId }, { $inc: { 'stats.totalResponses': 1 } });

      // إرسال رسالة شكر
      await whatsappService.sendText(
        contactPhone,
        survey.settings?.thankYouMessage || 'شكراً لمشاركتك!'
      );

      return { handled: true, type: 'survey_completed' };
    }

    // إرسال السؤال التالي
    response.currentQuestion = nextIdx;
    await response.save();

    await this._sendQuestion(contactPhone, survey, sortedQuestions[nextIdx], nextIdx);
    return { handled: true, type: 'next_question', questionIndex: nextIdx };
  }

  static async getResults(surveyId) {
    const survey = await Survey.findById(surveyId);
    if (!survey) throw new Error('الاستطلاع غير موجود');

    const responses = await SurveyResponse.find({ surveyId, status: 'completed' });

    const results = {};
    for (const q of survey.questions) {
      const answers = responses
        .map(r => r.answers.find(a => a.questionId === q.questionId))
        .filter(Boolean);

      results[q.questionId] = {
        question: q.textAr || q.text,
        type: q.type,
        totalAnswers: answers.length,
        answers: {},
      };

      if (['single_choice', 'yes_no', 'multiple_choice'].includes(q.type)) {
        const distribution = {};
        answers.forEach(a => {
          const val = String(a.value);
          distribution[val] = (distribution[val] || 0) + 1;
        });
        results[q.questionId].distribution = distribution;
      } else if (['rating', 'nps'].includes(q.type)) {
        const values = answers.map(a => Number(a.value)).filter(v => !isNaN(v));
        results[q.questionId].average = values.length
          ? values.reduce((s, v) => s + v, 0) / values.length
          : 0;
        results[q.questionId].min = values.length ? Math.min(...values) : 0;
        results[q.questionId].max = values.length ? Math.max(...values) : 0;
      } else {
        results[q.questionId].responses = answers.map(a => a.value);
      }
    }

    return {
      survey: { title: survey.title, titleAr: survey.titleAr },
      stats: survey.stats,
      results,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8) FLOW ENGINE - محرك سير العمل
// ═══════════════════════════════════════════════════════════════════════════════

class FlowEngine {
  static async create(data) {
    return Flow.create(data);
  }

  static async getAll(tenantId) {
    return Flow.find({ tenantId }).sort({ createdAt: -1 });
  }

  static async getById(id) {
    return Flow.findById(id);
  }

  static async update(id, data) {
    return Flow.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id) {
    return Flow.findByIdAndDelete(id);
  }

  static async activate(id) {
    return Flow.findByIdAndUpdate(id, { isActive: true, status: 'active' }, { new: true });
  }

  static async deactivate(id) {
    return Flow.findByIdAndUpdate(id, { isActive: false, status: 'paused' }, { new: true });
  }

  /**
   * تنفيذ سير العمل
   */
  static async execute(flowId, contactPhone, triggerData = {}) {
    const flow = await Flow.findById(flowId);
    if (!flow || !flow.isActive) throw new Error('سير العمل غير نشط');

    const variables = {};
    if (flow.variables) {
      flow.variables.forEach(v => {
        variables[v.name] = triggerData[v.name] ?? v.defaultValue;
      });
    }

    const startStep = flow.steps[0];
    if (!startStep) throw new Error('سير العمل فارغ');

    await this._executeStep(flow, startStep, contactPhone, variables);

    // تحديث الإحصائيات
    await Flow.updateOne(
      { _id: flowId },
      { $inc: { 'stats.totalExecutions': 1, 'stats.successfulExecutions': 1 } }
    );

    return { flowId, executed: true };
  }

  static async _executeStep(flow, step, contactPhone, variables) {
    switch (step.type) {
      case 'send_message': {
        const text = this._interpolate(step.config?.text || '', variables);
        await whatsappService.sendText(contactPhone, text);
        break;
      }

      case 'delay': {
        const ms = (step.config?.minutes || 1) * 60 * 1000;
        await new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000))); // max 5s in sync
        break;
      }

      case 'add_tag': {
        if (step.config?.tag) {
          await Contact.updateOne(
            { phone: contactPhone },
            { $addToSet: { tags: step.config.tag } }
          );
        }
        break;
      }

      case 'remove_tag': {
        if (step.config?.tag) {
          await Contact.updateOne({ phone: contactPhone }, { $pull: { tags: step.config.tag } });
        }
        break;
      }

      case 'add_to_group': {
        if (step.config?.groupId) {
          await ContactGroup.updateOne(
            { _id: step.config.groupId },
            { $addToSet: { members: { phone: contactPhone } } }
          );
        }
        break;
      }

      case 'end':
        return;

      default:
        logger.warn(`Unknown flow step type: ${step.type}`);
    }

    // الانتقال للخطوة التالية
    const nextRef = step.nextSteps?.find(n => n.condition === 'default') || step.nextSteps?.[0];
    if (nextRef?.stepId) {
      const nextStep = flow.steps.find(s => s.stepId === nextRef.stepId);
      if (nextStep) {
        await this._executeStep(flow, nextStep, contactPhone, variables);
      }
    }
  }

  static _interpolate(text, variables) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9) ANALYTICS ENGINE - محرك التحليلات
// ═══════════════════════════════════════════════════════════════════════════════

class AnalyticsEngine {
  /**
   * لوحة معلومات شاملة
   */
  static async getDashboard(tenantId) {
    const [contactStats, campaignStats, scheduledStats, chatbotStats, recentSnapshots] =
      await Promise.all([
        ContactManager.getContactStats(tenantId),
        CampaignManager.getStats(tenantId),
        MessageScheduler.getStats(tenantId),
        ChatbotEngine.getSessionStats(tenantId),
        AnalyticsSnapshot.find({ tenantId }).sort({ date: -1 }).limit(30),
      ]);

    return {
      contacts: contactStats,
      campaigns: campaignStats,
      scheduled: scheduledStats,
      chatbot: chatbotStats,
      trends: recentSnapshots,
    };
  }

  /**
   * حفظ لقطة تحليلية يومية
   */
  static async createDailySnapshot(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalContacts, newContacts, optedOut, blocked, activeCampaigns] = await Promise.all([
      Contact.countDocuments({ tenantId, isActive: true }),
      Contact.countDocuments({
        tenantId,
        createdAt: { $gte: today },
      }),
      Contact.countDocuments({ tenantId, 'optIn.status': false }),
      Contact.countDocuments({ tenantId, 'blocked.status': true }),
      Campaign.countDocuments({ tenantId, status: 'running' }),
    ]);

    const chatbotTriggered = await ChatbotSession.countDocuments({
      tenantId,
      createdAt: { $gte: today },
    });

    return AnalyticsSnapshot.findOneAndUpdate(
      { tenantId, date: today, period: 'daily' },
      {
        tenantId,
        date: today,
        period: 'daily',
        contacts: {
          totalActive: totalContacts,
          newContacts,
          optedOut,
          blocked,
        },
        campaigns: {
          active: activeCampaigns,
        },
        chatbot: {
          triggered: chatbotTriggered,
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * تحليلات الرسائل حسب الفترة
   */
  static async getMessageAnalytics(tenantId, startDate, endDate) {
    return AnalyticsSnapshot.find({
      tenantId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      period: 'daily',
    }).sort({ date: 1 });
  }

  /**
   * تقرير أداء القوالب
   */
  static async getTemplatePerformance(tenantId) {
    const snapshots = await AnalyticsSnapshot.find({ tenantId }).sort({ date: -1 }).limit(30);

    const templateStats = {};
    for (const snap of snapshots) {
      for (const t of snap.topTemplates || []) {
        if (!templateStats[t.templateName]) {
          templateStats[t.templateName] = { sent: 0, delivered: 0, read: 0 };
        }
        templateStats[t.templateName].sent += t.sent || 0;
        templateStats[t.templateName].delivered += t.delivered || 0;
        templateStats[t.templateName].read += t.read || 0;
      }
    }
    return templateStats;
  }

  /**
   * تقرير تفضيلات الإشعارات
   */
  static async getNotificationPreferences(tenantId) {
    const prefs = await NotificationPreference.find({ tenantId });
    const summary = {
      total: prefs.length,
      channels: { whatsapp: 0, sms: 0, email: 0 },
      categories: { appointments: 0, payments: 0, promotions: 0, updates: 0, surveys: 0 },
      languages: {},
    };

    for (const p of prefs) {
      if (p.channels?.whatsapp) summary.channels.whatsapp++;
      if (p.channels?.sms) summary.channels.sms++;
      if (p.channels?.email) summary.channels.email++;
      for (const cat of Object.keys(summary.categories)) {
        if (p.categories?.[cat]) summary.categories[cat]++;
      }
      const lang = p.language || 'ar';
      summary.languages[lang] = (summary.languages[lang] || 0) + 1;
    }

    return summary;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10) NOTIFICATION PREFERENCES - تفضيلات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

class NotificationPreferenceManager {
  static async getPreference(tenantId, contactPhone) {
    let pref = await NotificationPreference.findOne({ tenantId, contactPhone });
    if (!pref) {
      pref = await NotificationPreference.create({ tenantId, contactPhone });
    }
    return pref;
  }

  static async updatePreference(tenantId, contactPhone, updates) {
    return NotificationPreference.findOneAndUpdate({ tenantId, contactPhone }, updates, {
      upsert: true,
      new: true,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  ChatbotEngine,
  MessageScheduler,
  CampaignManager,
  ContactManager,
  QuickReplyManager,
  AutoAssignmentEngine,
  SurveyManager,
  FlowEngine,
  AnalyticsEngine,
  NotificationPreferenceManager,
};
