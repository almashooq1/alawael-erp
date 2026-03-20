/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Communication Hub
 * مركز الاتصالات الموحد - SMS, Email, Push, WebSocket, WhatsApp
 *
 * Channels: email (SMTP/SendGrid), sms (Twilio), push (FCM),
 *           in_app (MongoDB), whatsapp (proxy to whatsapp-service)
 * Features: Templates, rate-limiting, provider failover,
 *           delivery tracking, cost analytics, batch send
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'communication-hub' },
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3210;
app.use(express.json({ limit: '5mb' }));

// ─── MongoDB ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_communications', { maxPoolSize: 10 });

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', { maxRetriesPerRequest: null });

// ─── Schemas ─────────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['email', 'sms', 'push', 'in_app', 'whatsapp'], required: true, index: true },
    to: { type: String, required: true },
    from: String,
    subject: String,
    body: { type: String, required: true },
    templateId: String,
    templateData: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['queued', 'sent', 'delivered', 'failed', 'bounced'], default: 'queued', index: true },
    provider: String,
    providerMessageId: String,
    cost: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    errorMessage: String,
    metadata: mongoose.Schema.Types.Mixed,
    userId: { type: String, index: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
    scheduledAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true },
);

messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    channel: { type: String, enum: ['email', 'sms', 'push', 'whatsapp', 'all'] },
    subject: String,
    body: { type: String, required: true },
    bodyAr: String, // Arabic variant
    variables: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Template = mongoose.model('Template', templateSchema);

// ─── Email Transport ─────────────────────────────────────────────────────────
const emailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

// ─── Channel Senders ─────────────────────────────────────────────────────────
const senders = {
  async email(msg) {
    // Try SendGrid first, fallback to SMTP
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const result = await sgMail.send({
        to: msg.to,
        from: msg.from || process.env.SMTP_FROM || 'noreply@alawael.com',
        subject: msg.subject,
        html: msg.body,
      });
      return { provider: 'sendgrid', messageId: result[0]?.headers?.['x-message-id'] };
    }

    const result = await emailTransport.sendMail({
      from: msg.from || process.env.SMTP_FROM || 'noreply@alawael.com',
      to: msg.to,
      subject: msg.subject,
      html: msg.body,
    });
    return { provider: 'smtp', messageId: result.messageId };
  },

  async sms(msg) {
    if (!process.env.TWILIO_ACCOUNT_SID) throw new Error('Twilio not configured');
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await twilio.messages.create({
      body: msg.body,
      to: msg.to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    return { provider: 'twilio', messageId: result.sid, cost: parseFloat(result.price || 0) };
  },

  async push(msg) {
    if (!process.env.FCM_SERVICE_ACCOUNT) throw new Error('FCM not configured');
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FCM_SERVICE_ACCOUNT)) });
    }
    const result = await admin.messaging().send({
      token: msg.to,
      notification: { title: msg.subject || 'إشعار', body: msg.body },
      data: msg.metadata || {},
    });
    return { provider: 'fcm', messageId: result };
  },

  async in_app(msg) {
    return { provider: 'internal', messageId: msg._id?.toString() };
  },

  async whatsapp(msg) {
    // Proxy to WhatsApp service
    const response = await fetch(`${process.env.WHATSAPP_SERVICE_URL || 'http://whatsapp:3010'}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: msg.to, message: msg.body, template: msg.templateId }),
    });
    const result = await response.json();
    return { provider: 'whatsapp-service', messageId: result.messageId };
  },
};

// ─── BullMQ Queue ────────────────────────────────────────────────────────────
const sendQueue = new Queue('communication-send', { connection: redis });

const worker = new Worker(
  'communication-send',
  async job => {
    const msg = await Message.findById(job.data.messageId);
    if (!msg || msg.status === 'sent') return;

    try {
      msg.attempts += 1;
      const result = await senders[msg.channel](msg);
      msg.status = 'sent';
      msg.provider = result.provider;
      msg.providerMessageId = result.messageId;
      msg.cost = result.cost || 0;
      msg.deliveredAt = new Date();
      await msg.save();
      logger.info(`Message sent`, { id: msg._id, channel: msg.channel, to: msg.to });
    } catch (error) {
      msg.errorMessage = error.message;
      msg.status = msg.attempts >= msg.maxAttempts ? 'failed' : 'queued';
      await msg.save();
      if (msg.status === 'queued') throw error; // retry
      logger.error(`Message failed`, { id: msg._id, error: error.message });
    }
  },
  { connection: redis, concurrency: 10 },
);

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const RATE_LIMITS = { email: 100, sms: 20, push: 200, whatsapp: 50 };

async function checkRateLimit(channel, userId) {
  const key = `comm:rate:${channel}:${userId}:${new Date().toISOString().slice(0, 13)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);
  return count <= (RATE_LIMITS[channel] || 100);
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// Send message
app.post('/api/send', async (req, res) => {
  try {
    const { channel, to, subject, body, templateId, templateData, userId, priority, scheduledAt, metadata } = req.body;

    if (!channel || !to) return res.status(400).json({ error: 'channel and to are required' });
    if (!senders[channel]) return res.status(400).json({ error: `Unsupported channel: ${channel}` });

    // Rate limit check
    if (userId && !(await checkRateLimit(channel, userId))) {
      return res.status(429).json({ error: 'Rate limit exceeded for this channel' });
    }

    // Template rendering
    let finalBody = body;
    let finalSubject = subject;
    if (templateId) {
      const template = await Template.findOne({ name: templateId, active: true });
      if (template) {
        const lang = req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en';
        finalBody = Handlebars.compile(lang === 'ar' && template.bodyAr ? template.bodyAr : template.body)(templateData || {});
        if (template.subject) finalSubject = Handlebars.compile(template.subject)(templateData || {});
      }
    }

    const msg = await Message.create({
      channel,
      to,
      subject: finalSubject,
      body: finalBody,
      templateId,
      templateData,
      userId,
      priority,
      scheduledAt,
      metadata,
    });

    const delay = scheduledAt ? Math.max(0, new Date(scheduledAt) - Date.now()) : 0;
    await sendQueue.add(
      'send',
      { messageId: msg._id.toString() },
      {
        delay,
        priority: priority === 'critical' ? 1 : priority === 'high' ? 2 : priority === 'low' ? 4 : 3,
        attempts: msg.maxAttempts,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    res.status(201).json({ data: msg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch send
app.post('/api/send/batch', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    const results = [];
    for (const m of messages.slice(0, 1000)) {
      const msg = await Message.create(m);
      await sendQueue.add('send', { messageId: msg._id.toString() }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
      results.push({ id: msg._id, channel: m.channel, to: m.to });
    }
    res.status(201).json({ data: results, queued: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Message status
app.get('/api/messages/:id', async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  res.json({ data: msg });
});

// User message history
app.get('/api/messages/user/:userId', async (req, res) => {
  const { page = 1, limit = 20, channel, status } = req.query;
  const filter = { userId: req.params.userId };
  if (channel) filter.channel = channel;
  if (status) filter.status = status;
  const [data, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean(),
    Message.countDocuments(filter),
  ]);
  res.json({ data, total, page: +page });
});

// Templates CRUD
app.get('/api/templates', async (req, res) => {
  const templates = await Template.find({ active: true }).lean();
  res.json({ data: templates });
});

app.post('/api/templates', async (req, res) => {
  const template = await Template.create(req.body);
  res.status(201).json({ data: template });
});

// Analytics
app.get('/api/stats', async (req, res) => {
  const hours = parseInt(req.query.hours || '24');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const [byChannel, byStatus, totalCost] = await Promise.all([
    Message.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$channel', count: { $sum: 1 } } }]),
    Message.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Message.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: null, cost: { $sum: '$cost' }, count: { $sum: 1 } } }]),
  ]);
  res.json({ period: `${hours}h`, byChannel, byStatus, totalCost: totalCost[0] || { cost: 0, count: 0 } });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'communication-hub', version: '1.0.0', uptime: process.uptime(), channels: Object.keys(senders) });
});

app.listen(PORT, '0.0.0.0', () => logger.info(`📡 Communication Hub running on port ${PORT}`));
module.exports = app;
