/**
 * ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Notification Center Service (مركز الإشعارات)
 *  Port: 3640
 *  Phase 8A — Push, SMS, Email, WhatsApp, Templates, Scheduling
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3640;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_notifications';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/* ─── Redis ───────────────────────────────────────────────────── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 50, 2000),
});

/* ─── Mongoose Schemas ────────────────────────────────────────── */

// قالب الإشعار
const TemplateSchema = new mongoose.Schema({
  templateId: { type: String, unique: true },
  name: { type: String, required: true },
  nameAr: { type: String },
  category: {
    type: String,
    enum: ['system', 'attendance', 'finance', 'academic', 'health', 'transport', 'general', 'emergency', 'marketing'],
    default: 'general',
  },
  channels: [{ type: String, enum: ['push', 'sms', 'email', 'whatsapp', 'in-app'] }],
  subject: { type: String }, // email subject template
  subjectAr: { type: String },
  body: { type: String, required: true }, // Handlebars template (EN)
  bodyAr: { type: String }, // Handlebars template (AR)
  htmlBody: { type: String }, // HTML for email
  variables: [{ name: String, type: { type: String, enum: ['string', 'number', 'date', 'url'] }, required: Boolean }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
TemplateSchema.pre('save', async function (next) {
  if (!this.templateId) {
    const c = await mongoose.model('Template').countDocuments();
    this.templateId = `TMPL-${String(c + 1).padStart(4, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

// الإشعار
const NotificationSchema = new mongoose.Schema(
  {
    notifId: { type: String, unique: true },
    templateId: { type: String },
    channel: { type: String, enum: ['push', 'sms', 'email', 'whatsapp', 'in-app'], required: true },
    category: { type: String, default: 'general' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    recipients: [
      {
        userId: String,
        email: String,
        phone: String,
        deviceToken: String,
        name: String,
      },
    ],
    subject: { type: String },
    body: { type: String, required: true },
    htmlBody: { type: String },
    data: { type: mongoose.Schema.Types.Mixed }, // payload extras
    status: { type: String, enum: ['pending', 'queued', 'sending', 'sent', 'partial', 'failed'], default: 'pending' },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    results: [
      {
        recipientId: String,
        channel: String,
        status: { type: String, enum: ['sent', 'delivered', 'failed', 'bounced'] },
        error: String,
        sentAt: Date,
      },
    ],
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
NotificationSchema.index({ status: 1, scheduledAt: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.pre('save', async function (next) {
  if (!this.notifId) {
    const c = await mongoose.model('Notification').countDocuments();
    this.notifId = `NOTIF-${String(c + 1).padStart(6, '0')}`;
  }
  next();
});

// تفضيلات المستخدم
const PreferenceSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  channels: {
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  categories: {
    system: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    finance: { type: Boolean, default: true },
    academic: { type: Boolean, default: true },
    health: { type: Boolean, default: true },
    transport: { type: Boolean, default: true },
    general: { type: Boolean, default: true },
    emergency: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' },
    end: { type: String, default: '07:00' },
  },
  language: { type: String, enum: ['ar', 'en'], default: 'ar' },
  updatedAt: { type: Date, default: Date.now },
});

// سجل الإرسال
const DeliveryLogSchema = new mongoose.Schema({
  notifId: String,
  channel: String,
  recipientId: String,
  provider: String,
  status: { type: String, enum: ['sent', 'delivered', 'read', 'failed', 'bounced'] },
  providerMsgId: String,
  error: String,
  latencyMs: Number,
  createdAt: { type: Date, default: Date.now, expires: 2592000 }, // 30 days TTL
});

const Template = mongoose.model('Template', TemplateSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Preference = mongoose.model('Preference', PreferenceSchema);
const DeliveryLog = mongoose.model('DeliveryLog', DeliveryLogSchema);

/* ─── BullMQ Queue & Worker ───────────────────────────────────── */
const notifQueue = new Queue('notifications', { connection: redis });

const worker = new Worker(
  'notifications',
  async job => {
    const { notifId } = job.data;
    const notif = await Notification.findOne({ notifId });
    if (!notif) return;

    notif.status = 'sending';
    await notif.save();

    const results = [];
    for (const recipient of notif.recipients) {
      const start = Date.now();
      try {
        // Simulate channel-specific sending
        let providerMsgId = `${notif.channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        let status = 'sent';

        if (notif.channel === 'email') {
          // In production: use nodemailer transporter
          console.log(`📧 Email to ${recipient.email}: ${notif.subject}`);
        } else if (notif.channel === 'sms') {
          // In production: use Twilio
          console.log(`📱 SMS to ${recipient.phone}: ${notif.body?.substring(0, 50)}`);
        } else if (notif.channel === 'whatsapp') {
          console.log(`💬 WhatsApp to ${recipient.phone}: ${notif.body?.substring(0, 50)}`);
        } else if (notif.channel === 'push') {
          console.log(`🔔 Push to ${recipient.deviceToken}: ${notif.body?.substring(0, 50)}`);
        } else {
          // in-app — just store
          status = 'delivered';
        }

        results.push({ recipientId: recipient.userId, channel: notif.channel, status, sentAt: new Date() });
        await DeliveryLog.create({
          notifId,
          channel: notif.channel,
          recipientId: recipient.userId,
          provider: notif.channel,
          status,
          providerMsgId,
          latencyMs: Date.now() - start,
        });
      } catch (err) {
        results.push({ recipientId: recipient.userId, channel: notif.channel, status: 'failed', error: err.message });
        await DeliveryLog.create({
          notifId,
          channel: notif.channel,
          recipientId: recipient.userId,
          provider: notif.channel,
          status: 'failed',
          error: err.message,
          latencyMs: Date.now() - start,
        });
      }
    }

    const allSent = results.every(r => r.status === 'sent' || r.status === 'delivered');
    const anyFailed = results.some(r => r.status === 'failed');
    notif.results = results;
    notif.status = allSent ? 'sent' : anyFailed ? 'partial' : 'sent';
    notif.sentAt = new Date();
    await notif.save();

    // Update Redis stats
    await redis.hincrby('notif:stats', 'total_sent', results.filter(r => r.status !== 'failed').length);
    await redis.hincrby('notif:stats', `channel:${notif.channel}`, 1);
  },
  { connection: redis, concurrency: 5 },
);

worker.on('failed', (job, err) => console.error(`❌ Notification job failed: ${err.message}`));

/* ─── Handlebars Template Engine ──────────────────────────────── */
const Handlebars = require('handlebars');

function renderTemplate(templateStr, vars) {
  if (!templateStr) return '';
  const compiled = Handlebars.compile(templateStr);
  return compiled(vars || {});
}

/* ─── Health ──────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const db = mongoose.connection.readyState === 1;
    const rd = redis.status === 'ready';
    res.status(db && rd ? 200 : 503).json({
      status: db && rd ? 'healthy' : 'degraded',
      service: 'notification-center-service',
      port: PORT,
      mongodb: db ? 'connected' : 'disconnected',
      redis: rd ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

/* ─── Templates CRUD ──────────────────────────────────────────── */
app.post('/api/notifications/templates', async (req, res) => {
  try {
    const tmpl = await Template.create(req.body);
    res.status(201).json(tmpl);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/notifications/templates', async (req, res) => {
  try {
    const { category, channel, active } = req.query;
    const q = {};
    if (category) q.category = category;
    if (channel) q.channels = channel;
    if (active !== undefined) q.isActive = active === 'true';
    const templates = await Template.find(q).sort('-createdAt');
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notifications/templates/:id', async (req, res) => {
  try {
    const t = await Template.findOne({ templateId: req.params.id });
    if (!t) return res.status(404).json({ error: 'القالب غير موجود' });
    res.json(t);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/templates/:id', async (req, res) => {
  try {
    const t = await Template.findOneAndUpdate({ templateId: req.params.id }, req.body, { new: true });
    if (!t) return res.status(404).json({ error: 'القالب غير موجود' });
    res.json(t);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/notifications/templates/:id', async (req, res) => {
  try {
    await Template.findOneAndDelete({ templateId: req.params.id });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Send Notification ───────────────────────────────────────── */
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { templateId, channel, recipients, subject, body, data, priority, scheduledAt, category, createdBy } = req.body;

    let finalBody = body;
    let finalSubject = subject;
    let finalHtmlBody = null;

    // If template-based, render the template
    if (templateId) {
      const tmpl = await Template.findOne({ templateId, isActive: true });
      if (!tmpl) return res.status(404).json({ error: 'القالب غير موجود أو غير مفعل' });
      finalBody = renderTemplate(tmpl.bodyAr || tmpl.body, data);
      finalSubject = renderTemplate(tmpl.subjectAr || tmpl.subject, data);
      finalHtmlBody = tmpl.htmlBody ? renderTemplate(tmpl.htmlBody, data) : null;
    }

    if (!finalBody) return res.status(400).json({ error: 'محتوى الإشعار مطلوب' });
    if (!recipients?.length) return res.status(400).json({ error: 'المستلمون مطلوبون' });

    // Check user preferences
    const filteredRecipients = [];
    for (const r of recipients) {
      if (r.userId) {
        const pref = await Preference.findOne({ userId: r.userId });
        if (pref) {
          const channelKey = channel === 'in-app' ? 'inApp' : channel;
          if (!pref.channels[channelKey]) continue;
          if (category && !pref.categories[category]) continue;
          // Quiet hours check
          if (pref.quietHours?.enabled && priority !== 'urgent') {
            const now = new Date();
            const hh = now.getHours().toString().padStart(2, '0');
            const mm = now.getMinutes().toString().padStart(2, '0');
            const current = `${hh}:${mm}`;
            if (current >= pref.quietHours.start || current <= pref.quietHours.end) continue;
          }
        }
      }
      filteredRecipients.push(r);
    }

    if (!filteredRecipients.length) {
      return res.json({ message: 'جميع المستلمين قاموا بتعطيل هذا النوع', sent: 0 });
    }

    const notif = await Notification.create({
      templateId,
      channel: channel || 'in-app',
      category: category || 'general',
      priority: priority || 'normal',
      recipients: filteredRecipients,
      subject: finalSubject,
      body: finalBody,
      htmlBody: finalHtmlBody,
      data,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdBy,
      status: scheduledAt ? 'pending' : 'queued',
    });

    if (!scheduledAt) {
      await notifQueue.add(
        'send-notification',
        { notifId: notif.notifId },
        {
          priority: priority === 'urgent' ? 1 : priority === 'high' ? 2 : priority === 'normal' ? 3 : 4,
        },
      );
    }

    res.status(201).json({ notifId: notif.notifId, status: notif.status, recipients: filteredRecipients.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Bulk Send ───────────────────────────────────────────────── */
app.post('/api/notifications/send/bulk', async (req, res) => {
  try {
    const { notifications } = req.body;
    if (!notifications?.length) return res.status(400).json({ error: 'مطلوب قائمة الإشعارات' });

    const results = [];
    for (const n of notifications) {
      const notif = await Notification.create({
        ...n,
        status: 'queued',
      });
      await notifQueue.add('send-notification', { notifId: notif.notifId });
      results.push({ notifId: notif.notifId });
    }
    res.status(201).json({ queued: results.length, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Notifications List / Search ─────────────────────────────── */
app.get('/api/notifications', async (req, res) => {
  try {
    const { status, channel, category, page = 1, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (channel) q.channel = channel;
    if (category) q.category = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Notification.find(q).sort('-createdAt').skip(skip).limit(Number(limit)),
      Notification.countDocuments(q),
    ]);
    res.json({ data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notifications/:id', async (req, res) => {
  try {
    const n = await Notification.findOne({ notifId: req.params.id });
    if (!n) return res.status(404).json({ error: 'الإشعار غير موجود' });
    res.json(n);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── User In-App Notifications ───────────────────────────────── */
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const q = { 'recipients.userId': req.params.userId, channel: 'in-app' };
    if (unreadOnly === 'true') q['results.status'] = { $ne: 'read' };
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Notification.find(q).sort('-createdAt').skip(skip).limit(Number(limit));
    const total = await Notification.countDocuments(q);
    res.json({ data: items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/user/:userId/read/:notifId', async (req, res) => {
  try {
    await Notification.updateOne(
      { notifId: req.params.notifId, 'recipients.userId': req.params.userId },
      { $set: { 'results.$[elem].status': 'read' } },
      { arrayFilters: [{ 'elem.recipientId': req.params.userId }] },
    );
    res.json({ message: 'تم التحديث' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { 'recipients.userId': req.params.userId, channel: 'in-app' },
      { $set: { 'results.$[elem].status': 'read' } },
      { arrayFilters: [{ 'elem.recipientId': req.params.userId }] },
    );
    res.json({ message: 'تم قراءة الكل' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── User Preferences ────────────────────────────────────────── */
app.get('/api/notifications/preferences/:userId', async (req, res) => {
  try {
    let pref = await Preference.findOne({ userId: req.params.userId });
    if (!pref) pref = await Preference.create({ userId: req.params.userId });
    res.json(pref);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/preferences/:userId', async (req, res) => {
  try {
    const pref = await Preference.findOneAndUpdate(
      { userId: req.params.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, upsert: true },
    );
    res.json(pref);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Delivery Logs ───────────────────────────────────────────── */
app.get('/api/notifications/delivery-logs', async (req, res) => {
  try {
    const { notifId, channel, status, page = 1, limit = 50 } = req.query;
    const q = {};
    if (notifId) q.notifId = notifId;
    if (channel) q.channel = channel;
    if (status) q.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      DeliveryLog.find(q).sort('-createdAt').skip(skip).limit(Number(limit)),
      DeliveryLog.countDocuments(q),
    ]);
    res.json({ data: items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Dashboard ───────────────────────────────────────────────── */
app.get('/api/notifications/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('notif:dashboard');
    if (cached) return res.json(JSON.parse(cached));

    const [totalNotifications, pending, sent, failed, totalTemplates, channels, categories, recentActivity] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ status: 'pending' }),
      Notification.countDocuments({ status: 'sent' }),
      Notification.countDocuments({ status: 'failed' }),
      Template.countDocuments({ isActive: true }),
      Notification.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 } } }]),
      Notification.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Notification.find().sort('-createdAt').limit(10).select('notifId channel category status sentAt createdAt'),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySent = await Notification.countDocuments({ sentAt: { $gte: todayStart }, status: 'sent' });

    const data = {
      totalNotifications,
      pending,
      sent,
      failed,
      totalTemplates,
      todaySent,
      channels: channels.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      categories: categories.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      recentActivity,
      timestamp: new Date().toISOString(),
    };

    await redis.setex('notif:dashboard', 30, JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Scheduled Notifications Processor ───────────────────────── */
cron.schedule('* * * * *', async () => {
  try {
    const due = await Notification.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() },
    });
    for (const notif of due) {
      notif.status = 'queued';
      await notif.save();
      await notifQueue.add('send-notification', { notifId: notif.notifId });
    }
    if (due.length) console.log(`⏰ Dispatched ${due.length} scheduled notifications`);
  } catch (e) {
    console.error('Scheduled notification cron error:', e.message);
  }
});

// Retry failed notifications
cron.schedule('*/5 * * * *', async () => {
  try {
    const failed = await Notification.find({
      status: 'failed',
      retryCount: { $lt: 3 },
    });
    for (const n of failed) {
      n.retryCount += 1;
      n.status = 'queued';
      await n.save();
      await notifQueue.add(
        'send-notification',
        { notifId: n.notifId },
        {
          delay: n.retryCount * 60000, // Progressive delay
        },
      );
    }
  } catch (e) {
    console.error('Retry cron error:', e.message);
  }
});

// Cleanup old notifications (90 days)
cron.schedule('0 3 * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const r = await Notification.deleteMany({ createdAt: { $lt: cutoff }, status: 'sent' });
    if (r.deletedCount) console.log(`🧹 Cleaned ${r.deletedCount} old notifications`);
  } catch (e) {
    console.error('Cleanup cron error:', e.message);
  }
});

/* ─── Seed Default Templates ──────────────────────────────────── */
async function seedTemplates() {
  const count = await Template.countDocuments();
  if (count > 0) return;
  const defaults = [
    {
      name: 'Attendance Alert',
      nameAr: 'تنبيه حضور',
      category: 'attendance',
      channels: ['push', 'sms', 'in-app'],
      body: '{{studentName}} was marked {{status}} at {{time}}',
      bodyAr: 'تم تسجيل {{studentName}} كـ {{status}} الساعة {{time}}',
      variables: [
        { name: 'studentName', type: 'string', required: true },
        { name: 'status', type: 'string', required: true },
        { name: 'time', type: 'string', required: true },
      ],
    },
    {
      name: 'Fee Reminder',
      nameAr: 'تذكير رسوم',
      category: 'finance',
      channels: ['email', 'sms', 'whatsapp'],
      subject: 'Fee Payment Reminder',
      subjectAr: 'تذكير بدفع الرسوم',
      body: 'Dear {{parentName}}, a fee of {{amount}} SAR is due on {{dueDate}}',
      bodyAr: 'عزيزي {{parentName}}، مبلغ {{amount}} ريال مستحق بتاريخ {{dueDate}}',
      variables: [
        { name: 'parentName', type: 'string', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'dueDate', type: 'date', required: true },
      ],
    },
    {
      name: 'Emergency Broadcast',
      nameAr: 'بث طوارئ',
      category: 'emergency',
      channels: ['push', 'sms', 'email', 'whatsapp', 'in-app'],
      body: 'URGENT: {{message}}',
      bodyAr: 'عاجل: {{message}}',
      variables: [{ name: 'message', type: 'string', required: true }],
    },
    {
      name: 'Grade Published',
      nameAr: 'نشر الدرجات',
      category: 'academic',
      channels: ['push', 'in-app'],
      body: 'Grades for {{courseName}} - {{period}} are now available',
      bodyAr: 'درجات {{courseName}} - {{period}} متاحة الآن',
      variables: [
        { name: 'courseName', type: 'string', required: true },
        { name: 'period', type: 'string', required: true },
      ],
    },
    {
      name: 'Health Incident',
      nameAr: 'حادث صحي',
      category: 'health',
      channels: ['push', 'sms', 'in-app'],
      body: 'Health alert for {{studentName}}: {{incident}}. Action: {{action}}',
      bodyAr: 'تنبيه صحي لـ {{studentName}}: {{incident}}. الإجراء: {{action}}',
      variables: [
        { name: 'studentName', type: 'string', required: true },
        { name: 'incident', type: 'string', required: true },
        { name: 'action', type: 'string', required: true },
      ],
    },
    {
      name: 'Transport Update',
      nameAr: 'تحديث النقل',
      category: 'transport',
      channels: ['push', 'sms'],
      body: 'Bus {{busNumber}} — {{message}}',
      bodyAr: 'الباص {{busNumber}} — {{message}}',
      variables: [
        { name: 'busNumber', type: 'string', required: true },
        { name: 'message', type: 'string', required: true },
      ],
    },
  ];
  await Template.insertMany(defaults);
  console.log('🌱 Seeded 6 default notification templates');
}

/* ─── Start ───────────────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_notifications');
    await seedTemplates();
    app.listen(PORT, () => console.log(`🔔 Notification Center running → http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('❌ MongoDB error:', e.message);
    process.exit(1);
  });
