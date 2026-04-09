/**
 * Document Email Gateway Service — بوابة البريد الإلكتروني للمستندات
 * ──────────────────────────────────────────────────────────────
 * إرسال/استقبال المستندات عبر البريد، إعادة التوجيه التلقائي،
 * قوالب البريد، سلاسل المراسلات، المرفقات
 *
 * @module documentEmailGateway.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const EventEmitter = require('events');

/* ─── Email Message Model ────────────────────────────────────── */
const emailMessageSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      index: true,
    },
    messageId: { type: String, unique: true },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    from: {
      email: String,
      name: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    to: [{ email: String, name: String }],
    cc: [{ email: String, name: String }],
    bcc: [{ email: String, name: String }],
    subject: String,
    body: { html: String, text: String },
    attachments: [
      {
        filename: String,
        mimeType: String,
        size: Number,
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      },
    ],
    threadId: { type: String, index: true },
    inReplyTo: String,
    status: {
      type: String,
      enum: ['draft', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'received'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    tracking: {
      opened: { type: Boolean, default: false },
      openedAt: Date,
      openCount: { type: Number, default: 0 },
      clicked: { type: Boolean, default: false },
      clickedAt: Date,
    },
    template: String,
    error: String,
    sentAt: Date,
    deliveredAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_email_messages' }
);

emailMessageSchema.index({ documentId: 1, direction: 1 });
emailMessageSchema.index({ threadId: 1, createdAt: 1 });
emailMessageSchema.index({ 'from.email': 1 });

const EmailMessage =
  mongoose.models.EmailMessage || mongoose.model('EmailMessage', emailMessageSchema);

/* ─── Email Template Model ───────────────────────────────────── */
const emailTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    name: String,
    nameAr: String,
    category: {
      type: String,
      enum: ['notification', 'approval', 'sharing', 'reminder', 'report', 'custom'],
      default: 'notification',
    },
    subject: String,
    subjectAr: String,
    body: { html: String, text: String },
    bodyAr: { html: String, text: String },
    variables: [{ key: String, label: String, required: Boolean }],
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_email_templates' }
);

const EmailTemplate =
  mongoose.models.EmailTemplate || mongoose.model('EmailTemplate', emailTemplateSchema);

/* ─── Forwarding Rule Model ──────────────────────────────────── */
const forwardingRuleSchema = new mongoose.Schema(
  {
    name: String,
    nameAr: String,
    trigger: {
      event: {
        type: String,
        enum: [
          'document.created',
          'document.approved',
          'document.rejected',
          'document.shared',
          'document.expired',
          'workflow.completed',
          'comment.added',
        ],
      },
      conditions: {
        documentTypes: [String],
        departments: [String],
        tags: [String],
        classifications: [String],
      },
    },
    action: {
      templateKey: String,
      recipients: [{ email: String, name: String, role: String }],
      ccRules: [
        {
          type: {
            type: String,
            enum: ['manager', 'department_head', 'creator', 'custom'],
          },
          email: String,
        },
      ],
      includeDocument: { type: Boolean, default: true },
      includeSummary: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
    stats: {
      triggered: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_forwarding_rules' }
);

const ForwardingRule =
  mongoose.models.ForwardingRule || mongoose.model('ForwardingRule', forwardingRuleSchema);

/* ─── Default Templates ──────────────────────────────────────── */
const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'doc_shared',
    name: 'Document Shared',
    nameAr: 'مشاركة مستند',
    category: 'sharing',
    subjectAr: 'تمت مشاركة مستند معك: {{documentTitle}}',
    bodyAr: {
      html: `<div dir="rtl" style="font-family:Cairo,sans-serif">
<h2>مرحباً {{recipientName}}</h2>
<p>تمت مشاركة المستند <strong>{{documentTitle}}</strong> معك بواسطة {{senderName}}.</p>
<p>نوع الصلاحية: {{permission}}</p>
<a href="{{documentUrl}}" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">فتح المستند</a>
</div>`,
      text: 'مرحباً {{recipientName}}\nتمت مشاركة المستند {{documentTitle}} معك بواسطة {{senderName}}.',
    },
    variables: [
      { key: 'recipientName', label: 'اسم المستلم', required: true },
      { key: 'senderName', label: 'اسم المرسل', required: true },
      { key: 'documentTitle', label: 'عنوان المستند', required: true },
      { key: 'documentUrl', label: 'رابط المستند', required: true },
      { key: 'permission', label: 'الصلاحية', required: false },
    ],
    isSystem: true,
  },
  {
    key: 'doc_approval_request',
    name: 'Approval Request',
    nameAr: 'طلب اعتماد',
    category: 'approval',
    subjectAr: 'مطلوب اعتمادك: {{documentTitle}}',
    bodyAr: {
      html: `<div dir="rtl" style="font-family:Cairo,sans-serif">
<h2>طلب اعتماد</h2>
<p>مطلوب اعتمادك على المستند <strong>{{documentTitle}}</strong>.</p>
<p>المرسل: {{senderName}}</p>
<p>الأولوية: {{priority}}</p>
<p>الملاحظات: {{notes}}</p>
<div style="margin-top:20px">
<a href="{{approveUrl}}" style="background:#22c55e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-left:10px">اعتماد</a>
<a href="{{rejectUrl}}" style="background:#ef4444;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">رفض</a>
</div></div>`,
      text: 'طلب اعتماد\nمطلوب اعتمادك على المستند {{documentTitle}}.',
    },
    variables: [
      { key: 'documentTitle', label: 'عنوان المستند', required: true },
      { key: 'senderName', label: 'اسم المرسل', required: true },
      { key: 'priority', label: 'الأولوية', required: false },
      { key: 'notes', label: 'الملاحظات', required: false },
      { key: 'approveUrl', label: 'رابط الاعتماد', required: true },
      { key: 'rejectUrl', label: 'رابط الرفض', required: true },
    ],
    isSystem: true,
  },
  {
    key: 'doc_reminder',
    name: 'Document Reminder',
    nameAr: 'تذكير بمستند',
    category: 'reminder',
    subjectAr: 'تذكير: {{documentTitle}} — {{reminderType}}',
    bodyAr: {
      html: `<div dir="rtl" style="font-family:Cairo,sans-serif">
<h2>تذكير</h2>
<p>{{reminderMessage}}</p>
<p>المستند: <strong>{{documentTitle}}</strong></p>
<p>الموعد: {{dueDate}}</p>
<a href="{{documentUrl}}" style="background:#f59e0b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">فتح المستند</a>
</div>`,
      text: 'تذكير: {{reminderMessage}}\nالمستند: {{documentTitle}}\nالموعد: {{dueDate}}',
    },
    isSystem: true,
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentEmailGatewayService extends EventEmitter {
  constructor() {
    super();
  }

  /* ─── Init Templates ──────────────────────────────────────── */
  async initTemplates() {
    for (const tpl of DEFAULT_EMAIL_TEMPLATES) {
      await EmailTemplate.findOneAndUpdate(
        { key: tpl.key },
        { $setOnInsert: tpl },
        { upsert: true }
      );
    }
    return { success: true, initialized: DEFAULT_EMAIL_TEMPLATES.length };
  }

  /* ─── Send Email ──────────────────────────────────────────── */
  async send(options = {}) {
    const {
      documentId,
      to,
      cc,
      bcc,
      subject,
      body,
      templateKey,
      templateVars,
      attachments,
      priority,
      userId,
    } = options;

    let finalSubject = subject;
    let finalBody = body;

    if (templateKey) {
      const resolved = await this._resolveTemplate(templateKey, templateVars || {});
      if (resolved) {
        finalSubject = finalSubject || resolved.subject;
        finalBody = finalBody || resolved.body;
      }
    }

    const msgId = `<${crypto.randomUUID()}@alawael-erp.com>`;
    const message = new EmailMessage({
      documentId,
      messageId: msgId,
      direction: 'outbound',
      from: { userId, email: 'noreply@alawael-erp.com', name: 'نظام الأوائل' },
      to: (to || []).map(r => (typeof r === 'string' ? { email: r } : r)),
      cc: (cc || []).map(r => (typeof r === 'string' ? { email: r } : r)),
      bcc: (bcc || []).map(r => (typeof r === 'string' ? { email: r } : r)),
      subject: finalSubject,
      body:
        typeof finalBody === 'string'
          ? { html: finalBody, text: finalBody.replace(/<[^>]+>/g, '') }
          : finalBody,
      attachments,
      status: 'queued',
      priority: priority || 'normal',
      template: templateKey,
      createdBy: userId,
    });

    await message.save();

    // Simulate send
    this._processSend(message._id).catch(err => console.error('Email send error:', err));

    return { success: true, message };
  }

  async _processSend(messageId) {
    const message = await EmailMessage.findById(messageId);
    if (!message) return;

    message.status = 'sending';
    await message.save();

    try {
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      message.status = 'sent';
      message.sentAt = new Date();
      await message.save();

      this.emit('emailSent', {
        messageId: message.messageId,
        documentId: message.documentId,
        to: message.to,
      });
    } catch (err) {
      message.status = 'failed';
      message.error = err.message;
      await message.save();
    }
  }

  /* ─── Resolve Template ────────────────────────────────────── */
  async _resolveTemplate(templateKey, vars) {
    const template = await EmailTemplate.findOne({ key: templateKey }).lean();
    if (!template) return null;

    const replaceVars = text => {
      if (!text) return text;
      let result = text;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
      }
      return result;
    };

    return {
      subject: replaceVars(template.subjectAr || template.subject),
      body: {
        html: replaceVars(template.bodyAr?.html || template.body?.html || ''),
        text: replaceVars(template.bodyAr?.text || template.body?.text || ''),
      },
    };
  }

  /* ─── Get Messages ────────────────────────────────────────── */
  async getMessages(options = {}) {
    const { documentId, direction, status, threadId, page = 1, limit = 20 } = options;
    const filter = {};
    if (documentId) filter.documentId = documentId;
    if (direction) filter.direction = direction;
    if (status) filter.status = status;
    if (threadId) filter.threadId = threadId;

    const [messages, total] = await Promise.all([
      EmailMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('documentId', 'title name')
        .populate('from.userId', 'name email')
        .lean(),
      EmailMessage.countDocuments(filter),
    ]);

    return { success: true, messages, total, page, limit };
  }

  /* ─── Get Thread ──────────────────────────────────────────── */
  async getThread(threadId) {
    const messages = await EmailMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .populate('from.userId', 'name email')
      .lean();
    return { success: true, messages, count: messages.length };
  }

  /* ─── Track Open ──────────────────────────────────────────── */
  async trackOpen(messageId) {
    const message = await EmailMessage.findOneAndUpdate(
      { messageId },
      {
        $set: {
          'tracking.opened': true,
          'tracking.openedAt': new Date(),
        },
        $inc: { 'tracking.openCount': 1 },
      },
      { new: true }
    );
    return { success: !!message };
  }

  /* ─── Templates CRUD ──────────────────────────────────────── */
  async getTemplates(options = {}) {
    const { category } = options;
    const filter = {};
    if (category) filter.category = category;
    let templates = await EmailTemplate.find(filter).sort({ isSystem: -1 }).lean();
    if (templates.length === 0) {
      await this.initTemplates();
      templates = await EmailTemplate.find(filter).lean();
    }
    return { success: true, templates };
  }

  async createTemplate(data) {
    const key = `custom_${Date.now()}`;
    const template = new EmailTemplate({ ...data, key, isSystem: false });
    await template.save();
    return { success: true, template };
  }

  async updateTemplate(templateId, updates) {
    const template = await EmailTemplate.findByIdAndUpdate(
      templateId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!template) return { success: false, error: 'القالب غير موجود' };
    return { success: true, template };
  }

  async deleteTemplate(templateId) {
    const template = await EmailTemplate.findById(templateId);
    if (!template) return { success: false, error: 'القالب غير موجود' };
    if (template.isSystem) return { success: false, error: 'لا يمكن حذف قالب النظام' };
    await template.deleteOne();
    return { success: true };
  }

  /* ─── Forwarding Rules CRUD ───────────────────────────────── */
  async createRule(data) {
    const rule = new ForwardingRule(data);
    await rule.save();
    return { success: true, rule };
  }

  async getRules(options = {}) {
    const { isActive } = options;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    const rules = await ForwardingRule.find(filter).sort({ createdAt: -1 }).lean();
    return { success: true, rules };
  }

  async updateRule(ruleId, updates) {
    const rule = await ForwardingRule.findByIdAndUpdate(
      ruleId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    return { success: true, rule };
  }

  async deleteRule(ruleId) {
    await ForwardingRule.findByIdAndDelete(ruleId);
    return { success: true };
  }

  async toggleRule(ruleId) {
    const rule = await ForwardingRule.findById(ruleId);
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    rule.isActive = !rule.isActive;
    await rule.save();
    return { success: true, rule };
  }

  /* ─── Fire Event (check rules) ────────────────────────────── */
  async processEvent(eventName, eventData = {}) {
    const rules = await ForwardingRule.find({
      'trigger.event': eventName,
      isActive: true,
    }).lean();

    const results = [];
    for (const rule of rules) {
      if (!this._matchConditions(rule.trigger.conditions, eventData)) continue;
      try {
        const result = await this.send({
          documentId: eventData.documentId,
          to: rule.action.recipients,
          templateKey: rule.action.templateKey,
          templateVars: eventData,
        });
        results.push({ ruleId: rule._id, success: true });
        await ForwardingRule.findByIdAndUpdate(rule._id, {
          $inc: { 'stats.triggered': 1, 'stats.sent': 1 },
        });
      } catch (err) {
        results.push({ ruleId: rule._id, success: false, error: err.message });
        await ForwardingRule.findByIdAndUpdate(rule._id, {
          $inc: { 'stats.triggered': 1, 'stats.failed': 1 },
        });
      }
    }

    return { success: true, processed: results.length, results };
  }

  _matchConditions(conditions, data) {
    if (!conditions) return true;
    if (conditions.documentTypes?.length && !conditions.documentTypes.includes(data.documentType))
      return false;
    if (conditions.departments?.length && !conditions.departments.includes(data.department))
      return false;
    return true;
  }

  /* ─── Statistics ──────────────────────────────────────────── */
  async getStats() {
    const [totalMessages, byDirection, byStatus, totalRules] = await Promise.all([
      EmailMessage.countDocuments(),
      EmailMessage.aggregate([{ $group: { _id: '$direction', count: { $sum: 1 } } }]),
      EmailMessage.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ForwardingRule.countDocuments(),
    ]);

    return {
      success: true,
      stats: {
        totalMessages,
        byDirection: byDirection.reduce((a, d) => ({ ...a, [d._id]: d.count }), {}),
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        totalRules,
      },
    };
  }
}

module.exports = new DocumentEmailGatewayService();
