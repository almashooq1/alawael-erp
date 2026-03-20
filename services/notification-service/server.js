/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Notification Microservice
 * خدمة الإشعارات المستقلة
 *
 * Channels: Email, SMS, Push (FCM), In-App, WhatsApp
 * Features: Templates, Rate Limiting, Retry, Scheduling, Batching
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { createBullBoard } = require('@bull-board/api');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const cron = require('node-cron');

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'notification-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3070;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));

// ─── MongoDB Schema ──────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true, index: true },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app', 'whatsapp', 'webhook'],
      required: true,
    },
    recipient: {
      userId: String,
      email: String,
      phone: String,
      deviceToken: String,
      webhookUrl: String,
    },
    template: { type: String },
    subject: { type: String },
    body: { type: String, required: true },
    bodyAr: { type: String }, // Arabic body
    data: { type: mongoose.Schema.Types.Mixed },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: String,
    scheduledAt: Date,
    sentAt: Date,
    readAt: Date,
    expiresAt: Date,
    tenantId: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

notificationSchema.index({ 'recipient.userId': 1, status: 1 });
notificationSchema.index({ channel: 1, status: 1, createdAt: -1 });
notificationSchema.index({ scheduledAt: 1 }, { sparse: true });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);

// ─── Template Schema ─────────────────────────────────────────────────────────
const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    channel: { type: String, required: true },
    subject: String,
    body: { type: String, required: true },
    bodyAr: String,
    variables: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Template = mongoose.model('NotificationTemplate', templateSchema);

// ─── Email Transport ─────────────────────────────────────────────────────────
const emailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

// ─── Redis Connection ────────────────────────────────────────────────────────
let redis;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redis.on('error', err => logger.warn('Redis error:', err.message));
} catch (e) {
  logger.warn('Redis not available, rate limiting disabled');
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────
const RATE_LIMITS = {
  email: { max: 50, window: 3600 }, // 50/hour per user
  sms: { max: 10, window: 3600 }, // 10/hour per user
  push: { max: 100, window: 3600 }, // 100/hour per user
  whatsapp: { max: 20, window: 3600 }, // 20/hour per user
};

async function checkRateLimit(userId, channel) {
  if (!redis) return true;
  const key = `ratelimit:notif:${channel}:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMITS[channel]?.window || 3600);
  return count <= (RATE_LIMITS[channel]?.max || 100);
}

// ─── Send Functions ──────────────────────────────────────────────────────────
async function sendEmail(notification) {
  const info = await emailTransport.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@alawael.sa',
    to: notification.recipient.email,
    subject: notification.subject || 'Al-Awael Notification',
    html: notification.body,
  });
  logger.info(`Email sent: ${info.messageId}`);
  return info;
}

async function sendPush(notification) {
  // Firebase Cloud Messaging placeholder
  logger.info(`Push notification sent to ${notification.recipient.deviceToken}`);
  return { success: true };
}

async function sendSMS(notification) {
  // SMS gateway placeholder (Twilio, Unifonic, etc.)
  logger.info(`SMS sent to ${notification.recipient.phone}`);
  return { success: true };
}

async function sendWebhook(notification) {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(notification.recipient.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'notification',
      data: notification.data,
      body: notification.body,
      timestamp: new Date().toISOString(),
    }),
  });
  return { status: res.status };
}

const CHANNEL_HANDLERS = {
  email: sendEmail,
  push: sendPush,
  sms: sendSMS,
  webhook: sendWebhook,
  in_app: async n => ({ success: true }), // stored in DB only
  whatsapp: async n => {
    logger.info(`WhatsApp notification forwarded to whatsapp service`);
    return { success: true };
  },
};

// ─── Core Send Logic ─────────────────────────────────────────────────────────
async function processNotification(notification) {
  const handler = CHANNEL_HANDLERS[notification.channel];
  if (!handler) throw new Error(`Unknown channel: ${notification.channel}`);

  notification.attempts += 1;
  try {
    const result = await handler(notification);
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
    logger.info(`Notification ${notification.id} sent via ${notification.channel}`);
    return result;
  } catch (error) {
    notification.lastError = error.message;
    if (notification.attempts >= notification.maxAttempts) {
      notification.status = 'failed';
    } else {
      notification.status = 'pending'; // will be retried
    }
    await notification.save();
    logger.error(`Notification ${notification.id} failed: ${error.message}`);
    throw error;
  }
}

// ─── Scheduled Processor ────────────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  try {
    const pending = await Notification.find({
      status: 'pending',
      $or: [{ scheduledAt: { $lte: new Date() } }, { scheduledAt: null }],
      attempts: { $lt: 3 },
    })
      .sort({ priority: -1, createdAt: 1 })
      .limit(50);

    for (const notif of pending) {
      try {
        await processNotification(notif);
      } catch (e) {
        // already handled
      }
    }
  } catch (e) {
    logger.error('Scheduled processor error:', e.message);
  }
});

// ─── API Routes ──────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'notification-service',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Send notification
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { channel, recipient, subject, body, bodyAr, template, data, priority, scheduledAt } = req.body;

    if (!channel || !body) {
      return res.status(400).json({ error: 'channel and body are required' });
    }

    // Rate limit check
    if (recipient?.userId) {
      const allowed = await checkRateLimit(recipient.userId, channel);
      if (!allowed) {
        return res.status(429).json({ error: 'Rate limit exceeded', channel });
      }
    }

    const notification = await Notification.create({
      channel,
      recipient,
      subject,
      body,
      bodyAr,
      template,
      data,
      priority: priority || 'normal',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'queued' : 'pending',
    });

    // Send immediately if not scheduled
    if (!scheduledAt) {
      try {
        await processNotification(notification);
      } catch (e) {
        // will be retried by cron
      }
    }

    res.status(201).json({
      success: true,
      id: notification.id,
      status: notification.status,
    });
  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send batch notifications
app.post('/api/notifications/batch', async (req, res) => {
  try {
    const { notifications } = req.body;
    if (!Array.isArray(notifications)) {
      return res.status(400).json({ error: 'notifications array required' });
    }

    const results = await Promise.allSettled(
      notifications.map(async n => {
        const notif = await Notification.create({ ...n, status: 'pending' });
        return processNotification(notif);
      }),
    );

    res.json({
      success: true,
      total: notifications.length,
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status, channel } = req.query;

    const filter = { 'recipient.userId': userId };
    if (status) filter.status = status;
    if (channel) filter.channel = channel;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
    ]);

    res.json({
      data: notifications,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate({ id: req.params.id }, { status: 'read', readAt: new Date() }, { new: true });
    res.json({ success: true, notification: notif });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Template CRUD
app.get('/api/notifications/templates', async (req, res) => {
  const templates = await Template.find({ active: true });
  res.json({ data: templates });
});

app.post('/api/notifications/templates', async (req, res) => {
  const template = await Template.create(req.body);
  res.status(201).json({ data: template });
});

// Stats
app.get('/api/notifications/stats', async (req, res) => {
  try {
    const [byStatus, byChannel] = await Promise.all([
      Notification.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Notification.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 } } }]),
    ]);

    res.json({
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      byChannel: Object.fromEntries(byChannel.map(c => [c._id, c.count])),
      total: await Notification.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Startup ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    }

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🔔 Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Startup failed:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
