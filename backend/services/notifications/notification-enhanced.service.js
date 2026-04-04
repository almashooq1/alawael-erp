'use strict';

const NotificationTemplate = require('../../models/NotificationTemplate');
const NotificationPreference = require('../../models/NotificationPreference');
const BroadcastMessage = require('../../models/BroadcastMessage');
const Escalation = require('../../models/Escalation');
const logger = require('../../utils/logger');

/**
 * خدمة الإشعارات المحسّنة
 * Enhanced Notification Service — Prompt 8
 */
class NotificationEnhancedService {
  /**
   * إرسال إشعار من قالب مع مراعاة تفضيلات المستخدم وساعات الهدوء
   */
  async sendFromTemplate(templateCode, recipient, data = {}, locale = 'ar') {
    const template = await NotificationTemplate.findOne({ code: templateCode, isActive: true });
    if (!template) throw new Error(`قالب الإشعار غير موجود: ${templateCode}`);

    // تحقق من تفضيلات المستخدم
    const pref = await this._getUserPreferences(recipient, template.category);
    let channels = [...template.channels];

    // فلترة القنوات حسب التفضيلات
    channels = this._filterByPreferences(channels, pref);

    // ساعات الهدوء
    if (this._isQuietHours(pref) && template.priority !== 'urgent') {
      channels = channels.filter(c => c === 'database');
    }

    if (!channels.length) {
      logger.info(`[Notifications] تجاهل الإشعار (quiet/muted): ${templateCode}`);
      return null;
    }

    const rendered = template.render(locale, data);

    // إرسال عبر كل قناة
    const results = await Promise.allSettled(
      channels.map(ch => this._sendViaChannel(ch, recipient, rendered, template, data))
    );

    // تحديث إحصائيات القالب
    await NotificationTemplate.findByIdAndUpdate(template._id, {
      $inc: { usageCount: 1 },
      lastUsedAt: new Date(),
    });

    logger.info(`[Notifications] تم الإرسال: ${templateCode} → ${channels.join(', ')}`);
    return { templateCode, channels, rendered };
  }

  /**
   * إرسال عبر قناة محددة
   */
  async _sendViaChannel(channel, recipient, rendered, template, data) {
    switch (channel) {
      case 'database':
        // سيُستخدم لإشعارات في الواجهة
        return { channel: 'database', status: 'queued' };

      case 'sms':
        return this._sendSms(recipient.phone, rendered.body);

      case 'whatsapp':
        return this._sendWhatsApp(recipient.phone, template, rendered, data);

      case 'email':
        return this._sendEmail(recipient.email, rendered.subject, rendered.body);

      case 'push':
        return this._sendPush(recipient, rendered.subject || template.nameAr, rendered.body);

      default:
        logger.warn(`[Notifications] قناة غير معروفة: ${channel}`);
        return null;
    }
  }

  async _sendSms(phone, body) {
    if (!phone) return null;
    // تكامل مع UnifonicSmsService الموجود في communication/
    try {
      const { smsService } = require('../../communication');
      return await smsService.sendSms(phone, body);
    } catch (err) {
      logger.error(`[Notifications] فشل SMS: ${err.message}`);
      return { error: err.message };
    }
  }

  async _sendWhatsApp(phone, template, rendered, data) {
    if (!phone) return null;
    try {
      const { whatsappService } = require('../../communication');
      if (template.whatsappTemplateName) {
        return await whatsappService.sendTemplate(phone, template.whatsappTemplateName, data);
      }
      return await whatsappService.sendText(phone, rendered.body);
    } catch (err) {
      logger.error(`[Notifications] فشل WhatsApp: ${err.message}`);
      return { error: err.message };
    }
  }

  async _sendEmail(email, subject, body) {
    if (!email) return null;
    try {
      const { emailService } = require('../../communication');
      return await emailService.sendEmail({ to: email, subject, html: body });
    } catch (err) {
      logger.error(`[Notifications] فشل Email: ${err.message}`);
      return { error: err.message };
    }
  }

  async _sendPush(recipient, title, body) {
    try {
      // تكامل مع FCM
      logger.info(`[Push] ${title} → ${recipient._id || recipient.id}`);
      return { channel: 'push', status: 'queued' };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * إرسال رسالة جماعية Broadcast
   */
  async sendBroadcast(broadcastId) {
    const broadcast = await BroadcastMessage.findById(broadcastId);
    if (!broadcast) throw new Error('الرسالة الجماعية غير موجودة');
    if (!['approved', 'draft'].includes(broadcast.status)) {
      throw new Error('الرسالة الجماعية ليست في حالة موافقة');
    }

    const recipients = await this._resolveBroadcastRecipients(broadcast);
    broadcast.totalRecipients = recipients.length;
    broadcast.status = 'sending';
    await broadcast.save();

    let sentCount = 0,
      failedCount = 0;

    for (const recipient of recipients) {
      try {
        const locale = recipient.preferredLanguage || 'ar';
        const body = locale === 'ar' ? broadcast.bodyAr : broadcast.bodyEn || broadcast.bodyAr;

        for (const channel of broadcast.channels) {
          await this._sendViaChannel(
            channel,
            recipient,
            { subject: broadcast.subject, body },
            null,
            {}
          );
        }
        sentCount++;
      } catch (err) {
        failedCount++;
        logger.error(`[Broadcast] فشل للمستلم ${recipient._id}: ${err.message}`);
      }
    }

    await BroadcastMessage.findByIdAndUpdate(broadcastId, {
      sentCount,
      failedCount,
      status: 'sent',
      sentAt: new Date(),
    });

    return { sentCount, failedCount, totalRecipients: recipients.length };
  }

  /**
   * نظام التصعيد التلقائي
   */
  async createEscalation(
    escalatableType,
    escalatableId,
    type,
    description,
    branchId,
    priority = 'medium',
    reportedBy = null
  ) {
    const slaDeadlines = this._getSlaDeadlines(priority);
    const assignedTo = await this._getEscalationTarget(branchId, 1);

    const escalation = await Escalation.create({
      escalatableType,
      escalatableId,
      branchId,
      type,
      priority,
      currentLevel: 1,
      assignedTo,
      description,
      reportedBy,
      escalationHistory: [
        {
          level: 1,
          assignedTo,
          at: new Date(),
          reason: 'تصعيد أولي',
        },
      ],
      status: 'open',
      slaDeadlines,
    });

    // إشعار المسؤول
    if (assignedTo) {
      try {
        await this.sendFromTemplate(
          'escalation_assigned',
          { _id: assignedTo },
          {
            escalation_id: escalation._id.toString(),
            type,
            priority,
            description,
          }
        );
      } catch (err) {
        logger.warn(`[Escalation] فشل إشعار التصعيد: ${err.message}`);
      }
    }

    logger.info(`[Escalation] تم إنشاء تصعيد: ${escalation._id} — Priority: ${priority}`);
    return escalation;
  }

  /**
   * تصعيد تلقائي عند انتهاء SLA
   */
  async autoEscalate(escalationId) {
    const escalation = await Escalation.findById(escalationId);
    if (!escalation) throw new Error('التصعيد غير موجود');

    const nextLevel = escalation.currentLevel + 1;
    if (nextLevel > 4) {
      logger.warn(`[Escalation] وصل التصعيد للحد الأقصى: ${escalationId}`);
      return escalation;
    }

    const assignedTo = await this._getEscalationTarget(escalation.branchId, nextLevel);
    const history = [
      ...escalation.escalationHistory,
      {
        level: nextLevel,
        assignedTo,
        at: new Date(),
        reason: 'تصعيد تلقائي — تجاوز SLA',
      },
    ];

    await Escalation.findByIdAndUpdate(escalationId, {
      currentLevel: nextLevel,
      assignedTo,
      escalationHistory: history,
      slaBreached: true,
    });

    logger.info(`[Escalation] تصعيد تلقائي للمستوى ${nextLevel}: ${escalationId}`);
    return Escalation.findById(escalationId);
  }

  /**
   * قائمة الإشعارات لمستخدم
   */
  async getNotifications(userId, options = {}) {
    const { limit = 30, skip = 0, unreadOnly = false } = options;
    // الاستعلام من نموذج الإشعارات الموجود أو DB notifications
    const query = { userId };
    if (unreadOnly) query.readAt = null;

    // استخدام mongoose Notification model إذا وجد
    try {
      const Notification = require('../../models/Notification');
      const [notifications, unreadCount] = await Promise.all([
        Notification.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip),
        Notification.countDocuments({ userId, readAt: null }),
      ]);
      return { notifications, unreadCount };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  // ---- تفضيلات المستخدم ----
  async _getUserPreferences(recipient, category) {
    if (!recipient?._id && !recipient?.id) return null;
    const userId = recipient._id || recipient.id;
    return NotificationPreference.findOne({ userId, category });
  }

  _filterByPreferences(channels, pref) {
    if (!pref) return channels;
    if (pref.isMuted) return [];

    const map = {
      database: pref.channelDatabase,
      email: pref.channelEmail,
      sms: pref.channelSms,
      whatsapp: pref.channelWhatsapp,
      push: pref.channelPush,
    };

    return channels.filter(ch => map[ch] !== false);
  }

  _isQuietHours(pref) {
    if (!pref?.quietHoursStart || !pref?.quietHoursEnd) return false;
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return current >= pref.quietHoursStart && current <= pref.quietHoursEnd;
  }

  _getSlaDeadlines(priority) {
    const map = {
      critical: { acknowledge: '30m', resolve: '4h' },
      high: { acknowledge: '1h', resolve: '8h' },
      medium: { acknowledge: '4h', resolve: '24h' },
      low: { acknowledge: '24h', resolve: '72h' },
    };
    return map[priority] || map.medium;
  }

  async _getEscalationTarget(branchId, level) {
    const roleMap = {
      1: 'branch_supervisor',
      2: 'branch_manager',
      3: 'operations_director',
      4: 'ceo',
    };
    const role = roleMap[level] || 'branch_supervisor';

    try {
      const User = require('../../models/User');
      const user = await User.findOne({ role, 'employee.branchId': branchId });
      if (user) return user._id;
      const fallback = await User.findOne({ role });
      return fallback?._id || null;
    } catch {
      return null;
    }
  }

  async _resolveBroadcastRecipients(broadcast) {
    try {
      const User = require('../../models/User');
      const query = {};
      if (broadcast.branchId) query['employee.branchId'] = broadcast.branchId;

      switch (broadcast.targetAudience) {
        case 'guardians':
          query.role = 'guardian';
          break;
        case 'employees':
          query.role = { $in: ['therapist', 'nurse', 'admin', 'manager'] };
          break;
        case 'branch':
          // فقط الفرع المحدد
          break;
        // 'all' — لا قيود
      }

      if (broadcast.targetFilters) {
        Object.assign(query, broadcast.targetFilters);
      }

      return User.find(query).select('_id email phone preferredLanguage');
    } catch {
      return [];
    }
  }

  // ---- CRUD ----
  async createTemplate(data, userId) {
    return NotificationTemplate.create({ ...data, createdBy: userId });
  }

  async updateTemplate(id, data, userId) {
    return NotificationTemplate.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true }
    );
  }

  async getTemplates(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return NotificationTemplate.find(query).sort({ category: 1, code: 1 });
  }

  async updatePreferences(userId, category, prefs) {
    return NotificationPreference.findOneAndUpdate(
      { userId, category },
      { ...prefs },
      { upsert: true, new: true }
    );
  }

  async getEscalations(filters = {}) {
    const query = {};
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.status) query.status = filters.status;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    return Escalation.find(query)
      .populate('assignedTo', 'name email')
      .populate('branchId', 'nameAr')
      .sort({ createdAt: -1 });
  }

  async acknowledgeEscalation(id, userId) {
    return Escalation.findByIdAndUpdate(
      id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true }
    );
  }

  async resolveEscalation(id, userId, notes) {
    return Escalation.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date(), resolutionNotes: notes },
      { new: true }
    );
  }

  async createBroadcast(data, userId) {
    return BroadcastMessage.create({ ...data, senderId: userId });
  }

  async approveBroadcast(id, userId) {
    return BroadcastMessage.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: userId, approvedAt: new Date() },
      { new: true }
    );
  }
}

module.exports = new NotificationEnhancedService();
