/**
 * Message Queue — نظام قوائم الرسائل (NATS / In-Memory Fallback)
 *
 * Provides asynchronous messaging between services for:
 *  - Decoupled architecture
 *  - Reliable message delivery
 *  - Event-driven communication
 *  - Job queue processing
 *  - Pub/Sub for real-time updates
 *
 * Supports:
 *  - NATS (production) — high-performance messaging
 *  - In-Memory (development/test) — zero-dependency fallback
 *
 * @module infrastructure/messageQueue
 */

const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// ─── Message Queue Interface ─────────────────────────────────────────────────

/**
 * Abstract message queue interface
 */
class MessageQueueBase extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.connected = false;
    this._subscriptions = new Map();
  }

  async connect() {
    throw new Error('Not implemented');
  }
  async disconnect() {
    throw new Error('Not implemented');
  }
  async publish(_subject, _data, _options) {
    throw new Error('Not implemented');
  }
  async subscribe(_subject, _handler, _options) {
    throw new Error('Not implemented');
  }
  async unsubscribe(_subject) {
    throw new Error('Not implemented');
  }
  async request(_subject, _data, _timeout) {
    throw new Error('Not implemented');
  }
}

// ─── In-Memory Message Queue (Dev/Test) ──────────────────────────────────────

class InMemoryMessageQueue extends MessageQueueBase {
  constructor() {
    super('InMemoryMQ');
    this._queues = new Map(); // subject -> [message, ...]
    this._handlers = new Map(); // subject -> [handler, ...]
    this._deadLetters = [];
    this._processing = new Map();
  }

  async connect() {
    this.connected = true;
    logger.info('[MessageQueue] In-memory message queue connected');
    this.emit('connect');
    return this;
  }

  async disconnect() {
    this.connected = false;
    this._queues.clear();
    this._handlers.clear();
    this.emit('disconnect');
  }

  async publish(subject, data, options = {}) {
    if (!this.connected) throw new Error('Message queue not connected');

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      data,
      timestamp: new Date(),
      headers: options.headers || {},
      replyTo: options.replyTo || null,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
    };

    // Add to queue
    if (!this._queues.has(subject)) {
      this._queues.set(subject, []);
    }
    this._queues.get(subject).push(message);

    // Dispatch to handlers
    const handlers = this._getMatchingHandlers(subject);
    for (const handler of handlers) {
      setImmediate(async () => {
        try {
          await handler(message);
        } catch (error) {
          logger.error(`[MessageQueue] Handler error for ${subject}: ${error.message}`);
          message.retryCount += 1;
          if (message.retryCount >= message.maxRetries) {
            this._deadLetters.push({ ...message, error: error.message, deadAt: new Date() });
          } else {
            // Re-queue for retry
            this._queues.get(subject)?.push(message);
          }
        }
      });
    }

    return message.id;
  }

  async subscribe(subject, handler, options = {}) {
    if (!this._handlers.has(subject)) {
      this._handlers.set(subject, []);
    }
    this._handlers.get(subject).push(handler);
    this._subscriptions.set(subject, options);

    logger.debug(`[MessageQueue] Subscribed to: ${subject}`);
    return { subject, unsubscribe: () => this.unsubscribe(subject) };
  }

  async unsubscribe(subject) {
    this._handlers.delete(subject);
    this._subscriptions.delete(subject);
  }

  async request(subject, data, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout for ${subject}`));
      }, timeout);

      const replySubject = `_reply.${Date.now()}`;

      this.subscribe(replySubject, msg => {
        clearTimeout(timer);
        this.unsubscribe(replySubject);
        resolve(msg.data);
      });

      this.publish(subject, data, { replyTo: replySubject });
    });
  }

  getQueueStats() {
    const stats = {};
    for (const [subject, messages] of this._queues) {
      stats[subject] = {
        pending: messages.length,
        subscribers: this._handlers.get(subject)?.length || 0,
      };
    }
    return {
      ...stats,
      deadLetters: this._deadLetters.length,
      totalSubscriptions: this._subscriptions.size,
    };
  }

  getDeadLetters() {
    return [...this._deadLetters];
  }

  clearDeadLetters() {
    this._deadLetters = [];
  }

  _getMatchingHandlers(subject) {
    const handlers = [];

    for (const [pattern, patternHandlers] of this._handlers) {
      if (this._matchSubject(pattern, subject)) {
        handlers.push(...patternHandlers);
      }
    }

    return handlers;
  }

  /**
   * NATS-style wildcard matching
   * '*' matches single token, '>' matches rest of subject
   */
  _matchSubject(pattern, subject) {
    if (pattern === subject) return true;

    const patternParts = pattern.split('.');
    const subjectParts = subject.split('.');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '>') return true;
      if (patternParts[i] === '*') continue;
      if (patternParts[i] !== subjectParts[i]) return false;
    }

    return patternParts.length === subjectParts.length;
  }
}

// ─── NATS Message Queue (Production) ─────────────────────────────────────────

class NATSMessageQueue extends MessageQueueBase {
  constructor(options = {}) {
    super('NATS');
    this.url = options.url || process.env.NATS_URL || 'nats://localhost:4222';
    this.options = options;
    this._nc = null;
    this._codec = null;
  }

  async connect() {
    try {
      const { connect, JSONCodec } = require('nats');
      this._codec = JSONCodec();
      this._nc = await connect({
        servers: this.url,
        name: 'alawael-erp',
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        ...this.options,
      });

      this.connected = true;
      logger.info(`[MessageQueue] NATS connected to ${this.url}`);
      this.emit('connect');

      // Monitor connection
      (async () => {
        for await (const s of this._nc.status()) {
          logger.info(`[MessageQueue] NATS status: ${s.type} — ${s.data || ''}`);
          if (s.type === 'disconnect') {
            this.connected = false;
            this.emit('disconnect');
          } else if (s.type === 'reconnect') {
            this.connected = true;
            this.emit('reconnect');
          }
        }
      })().catch(() => {});

      return this;
    } catch (error) {
      logger.error(`[MessageQueue] NATS connection failed: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    if (this._nc) {
      await this._nc.drain();
      this.connected = false;
      logger.info('[MessageQueue] NATS disconnected');
    }
  }

  async publish(subject, data, options = {}) {
    if (!this._nc || !this.connected) throw new Error('NATS not connected');
    const encodedData = this._codec.encode(data);
    this._nc.publish(subject, encodedData, {
      headers: options.headers,
      reply: options.replyTo,
    });
    return `nats_${Date.now()}`;
  }

  async subscribe(subject, handler, options = {}) {
    if (!this._nc || !this.connected) throw new Error('NATS not connected');

    const sub = this._nc.subscribe(subject, {
      queue: options.queue,
      max: options.max,
    });

    this._subscriptions.set(subject, sub);

    (async () => {
      for await (const msg of sub) {
        try {
          const data = this._codec.decode(msg.data);
          const message = {
            id: `nats_${Date.now()}`,
            subject: msg.subject,
            data,
            timestamp: new Date(),
            reply: msg.reply,
          };
          await handler(message);

          // If it's a request, respond
          if (msg.reply && message._response) {
            msg.respond(this._codec.encode(message._response));
          }
        } catch (error) {
          logger.error(`[MessageQueue] NATS handler error for ${subject}: ${error.message}`);
        }
      }
    })().catch(() => {});

    return { subject, unsubscribe: () => sub.unsubscribe() };
  }

  async request(subject, data, timeout = 5000) {
    if (!this._nc || !this.connected) throw new Error('NATS not connected');
    const response = await this._nc.request(subject, this._codec.encode(data), { timeout });
    return this._codec.decode(response.data);
  }
}

// ─── Message Queue Factory ───────────────────────────────────────────────────

/**
 * Create the appropriate message queue based on environment
 * @returns {MessageQueueBase}
 */
function createMessageQueue() {
  const useNATS = process.env.NATS_ENABLED === 'true' || process.env.NATS_URL;

  if (useNATS && process.env.NODE_ENV !== 'test') {
    logger.info('[MessageQueue] Using NATS message queue');
    return new NATSMessageQueue();
  }

  logger.info('[MessageQueue] Using in-memory message queue (development/test)');
  return new InMemoryMessageQueue();
}

// ─── Pre-defined Subjects (Channels) ─────────────────────────────────────────

const SUBJECTS = {
  // Auth events
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED: 'auth.failed',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Beneficiary events
  BENEFICIARY_REGISTERED: 'beneficiary.registered',
  BENEFICIARY_UPDATED: 'beneficiary.updated',
  BENEFICIARY_DISCHARGED: 'beneficiary.discharged',

  // Medical events
  MEDICAL_RECORD_CREATED: 'medical.record.created',
  MEDICAL_RECORD_UPDATED: 'medical.record.updated',
  THERAPY_SESSION_COMPLETED: 'medical.therapy.completed',

  // Finance events
  INVOICE_CREATED: 'finance.invoice.created',
  PAYMENT_RECEIVED: 'finance.payment.received',
  EXPENSE_APPROVED: 'finance.expense.approved',

  // HR events
  EMPLOYEE_HIRED: 'hr.employee.hired',
  EMPLOYEE_TERMINATED: 'hr.employee.terminated',
  LEAVE_REQUESTED: 'hr.leave.requested',
  LEAVE_APPROVED: 'hr.leave.approved',

  // Notification events
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_BATCH: 'notification.batch',
  EMAIL_SEND: 'notification.email',
  SMS_SEND: 'notification.sms',
  WHATSAPP_SEND: 'notification.whatsapp',

  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_ALERT: 'system.alert',
  CACHE_INVALIDATE: 'system.cache.invalidate',

  // Job queue
  JOB_SCHEDULE: 'job.schedule',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',

  // Wildcard subjects
  ALL_AUTH: 'auth.>',
  ALL_MEDICAL: 'medical.>',
  ALL_FINANCE: 'finance.>',
  ALL_HR: 'hr.>',
  ALL_NOTIFICATIONS: 'notification.>',
  ALL_SYSTEM: 'system.>',
};

// ─── Singleton Instance ──────────────────────────────────────────────────────
let _instance = null;

/**
 * Get the singleton message queue instance
 * @returns {MessageQueueBase}
 */
function getMessageQueue() {
  if (!_instance) {
    _instance = createMessageQueue();
  }
  return _instance;
}

/**
 * Initialize and connect the message queue
 */
async function initializeMessageQueue() {
  const mq = getMessageQueue();
  if (!mq.connected) {
    await mq.connect();
  }
  return mq;
}

// ─── Express Routes ──────────────────────────────────────────────────────────

function mountMessageQueueRoutes(app) {
  const express = require('express');
  const router = express.Router();

  router.get('/status', (_req, res) => {
    const mq = getMessageQueue();
    res.json({
      success: true,
      type: mq.name,
      connected: mq.connected,
      subscriptions: [...mq._subscriptions.keys()],
      stats: mq.getQueueStats ? mq.getQueueStats() : {},
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/dead-letters', (_req, res) => {
    const mq = getMessageQueue();
    const deadLetters = mq.getDeadLetters ? mq.getDeadLetters() : [];
    res.json({ success: true, deadLetters, count: deadLetters.length });
  });

  router.post('/publish', async (req, res) => {
    try {
      const { subject, data } = req.body;
      if (!subject) return res.status(400).json({ error: 'subject is required' });
      const mq = getMessageQueue();
      const id = await mq.publish(subject, data || {});
      res.json({ success: true, messageId: id });
    } catch (error) {
      safeError(res, error, 'messageQueue');
    }
  });

  app.use('/api/v2/message-queue', router);
  logger.info('[MessageQueue] API routes mounted on /api/v2/message-queue');
}

module.exports = {
  // Factory
  createMessageQueue,
  getMessageQueue,
  initializeMessageQueue,

  // Classes
  InMemoryMessageQueue,
  NATSMessageQueue,
  MessageQueueBase,

  // Subjects
  SUBJECTS,

  // Router
  mountMessageQueueRoutes,
};
