/**
 * System Integration Bus — ناقل التكامل الموحد
 *
 * Unified event bus that bridges:
 *  1. EventStore     (persistent, audit-grade events → MongoDB)
 *  2. MessageQueue   (async pub/sub → NATS / InMemory)
 *  3. Socket.IO      (real-time push → browser clients)
 *  4. In-process     (EventEmitter → same-process subscribers)
 *
 * Every domain publishes through ONE API — the bus decides how to route:
 *  - persist?    → EventStore (CQRS) for audit & replay
 *  - broadcast?  → MessageQueue for cross-service async
 *  - realtime?   → Socket.IO for live dashboards
 *  - local?      → EventEmitter for same-process handlers
 *
 * @module integration/systemIntegrationBus
 */

'use strict';

const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// ─── Constants ───────────────────────────────────────────────────────────────

const DELIVERY = {
  PERSIST: 'persist',       // → EventStore (immutable log)
  BROADCAST: 'broadcast',   // → MessageQueue (async delivery)
  REALTIME: 'realtime',     // → Socket.IO (live push)
  LOCAL: 'local',           // → EventEmitter (in-process)
};

const PRIORITY = {
  CRITICAL: 'critical',     // Financial, medical, legal
  HIGH: 'high',             // HR actions, auth events
  NORMAL: 'normal',         // Standard domain events
  LOW: 'low',               // Analytics, cache invalidation
};

// ─── Domain Event Envelope ───────────────────────────────────────────────────

/**
 * Standard event envelope wrapping all domain events
 */
function createEventEnvelope(domain, eventType, payload, options = {}) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    domain,
    eventType,
    payload,
    metadata: {
      correlationId: options.correlationId || null,
      causationId: options.causationId || null,
      userId: options.userId || null,
      userName: options.userName || null,
      userRole: options.userRole || null,
      source: options.source || domain,
      ipAddress: options.ipAddress || null,
      requestId: options.requestId || null,
      timestamp: new Date().toISOString(),
    },
    delivery: options.delivery || [DELIVERY.LOCAL, DELIVERY.BROADCAST],
    priority: options.priority || PRIORITY.NORMAL,
    version: options.version || 1,
    aggregateId: options.aggregateId || null,
    aggregateType: options.aggregateType || null,
  };
}

// ─── System Integration Bus ──────────────────────────────────────────────────

class SystemIntegrationBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);

    this._eventStore = null;
    this._messageQueue = null;
    this._socketEmitter = null;

    this._subscribers = new Map();    // pattern → [handler]
    this._middleware = [];             // pre-publish transforms
    this._deadLetters = [];
    this._stats = {
      published: 0,
      persisted: 0,
      broadcast: 0,
      realtime: 0,
      local: 0,
      errors: 0,
      lastEvent: null,
    };
    this._initialized = false;
    this._domainRegistry = new Map();  // domain → { name, version, events[] }
  }

  // ── Initialization ─────────────────────────────────────────────────────

  /**
   * Wire the bus to existing infrastructure (called once at startup)
   */
  initialize({ eventStore, messageQueue, socketEmitter } = {}) {
    if (eventStore) {
      this._eventStore = eventStore;
      logger.info('[IntegrationBus] EventStore wired');
    }

    if (messageQueue) {
      this._messageQueue = messageQueue;
      logger.info('[IntegrationBus] MessageQueue wired');
    }

    if (socketEmitter) {
      this._socketEmitter = socketEmitter;
      logger.info('[IntegrationBus] SocketEmitter wired');
    }

    this._initialized = true;
    logger.info('[IntegrationBus] System Integration Bus initialized — ' +
      `EventStore:${!!eventStore} MQ:${!!messageQueue} Socket:${!!socketEmitter}`);
    return this;
  }

  // ── Domain Registration ────────────────────────────────────────────────

  /**
   * Register a domain and its published events
   * @param {string} name - Domain identifier (e.g. 'hr', 'finance')
   * @param {object} config - { version, events: ['employee.hired', ...] }
   */
  registerDomain(name, config = {}) {
    this._domainRegistry.set(name, {
      name,
      version: config.version || '1.0.0',
      events: config.events || [],
      registeredAt: new Date().toISOString(),
    });
    logger.info(`[IntegrationBus] Domain registered: ${name} (${config.events?.length || 0} events)`);
    return this;
  }

  /**
   * Get all registered domains
   */
  getRegisteredDomains() {
    return Object.fromEntries(this._domainRegistry);
  }

  // ── Publishing ─────────────────────────────────────────────────────────

  /**
   * Publish a domain event through the integration bus
   *
   * @param {string}  domain     - Source domain (e.g. 'hr', 'finance', 'medical')
   * @param {string}  eventType  - Event name (e.g. 'employee.hired')
   * @param {object}  payload    - Event data
   * @param {object} [options]   - { delivery[], priority, correlationId, aggregateId, ... }
   * @returns {Promise<object>}  - The event envelope
   */
  async publish(domain, eventType, payload, options = {}) {
    const envelope = createEventEnvelope(domain, eventType, payload, options);

    // Run middleware pipeline
    let enrichedEnvelope = envelope;
    for (const mw of this._middleware) {
      try {
        enrichedEnvelope = await mw(enrichedEnvelope);
        if (!enrichedEnvelope) {
          logger.warn(`[IntegrationBus] Middleware dropped event: ${eventType}`);
          return null;
        }
      } catch (err) {
        logger.error(`[IntegrationBus] Middleware error: ${err.message}`);
      }
    }

    this._stats.published++;
    this._stats.lastEvent = enrichedEnvelope.metadata.timestamp;

    const deliveries = enrichedEnvelope.delivery;
    const results = { persisted: false, broadcast: false, realtime: false, local: false };

    // 1. Persist to EventStore (for audit, replay, CQRS)
    if (deliveries.includes(DELIVERY.PERSIST) && this._eventStore) {
      try {
        await this._eventStore.appendEvents(
          enrichedEnvelope.aggregateType || domain,
          enrichedEnvelope.aggregateId || 'global',
          [{
            type: eventType,
            payload: enrichedEnvelope.payload,
            domain,
          }],
          enrichedEnvelope.metadata
        );
        results.persisted = true;
        this._stats.persisted++;
      } catch (err) {
        logger.error(`[IntegrationBus] EventStore persist failed: ${err.message}`);
        this._stats.errors++;
      }
    }

    // 2. Broadcast via MessageQueue (async cross-service)
    if (deliveries.includes(DELIVERY.BROADCAST) && this._messageQueue?.connected) {
      try {
        const subject = `${domain}.${eventType}`;
        await this._messageQueue.publish(subject, enrichedEnvelope);
        results.broadcast = true;
        this._stats.broadcast++;
      } catch (err) {
        logger.error(`[IntegrationBus] MessageQueue broadcast failed: ${err.message}`);
        this._stats.errors++;
      }
    }

    // 3. Push via Socket.IO (real-time to clients)
    if (deliveries.includes(DELIVERY.REALTIME) && this._socketEmitter) {
      try {
        const io = typeof this._socketEmitter.getIO === 'function'
          ? this._socketEmitter.getIO()
          : this._socketEmitter;
        if (io) {
          const channel = `${domain}:${eventType}`;
          io.emit(channel, {
            domain,
            eventType,
            payload: enrichedEnvelope.payload,
            timestamp: enrichedEnvelope.metadata.timestamp,
          });
          results.realtime = true;
          this._stats.realtime++;
        }
      } catch (err) {
        logger.error(`[IntegrationBus] Socket.IO push failed: ${err.message}`);
        this._stats.errors++;
      }
    }

    // 4. Local EventEmitter dispatch (same-process handlers)
    if (deliveries.includes(DELIVERY.LOCAL)) {
      try {
        const fullEventName = `${domain}.${eventType}`;
        this.emit(fullEventName, enrichedEnvelope);
        this.emit(`${domain}.*`, enrichedEnvelope);
        this.emit('*', enrichedEnvelope);

        // Dispatch to pattern subscribers
        this._dispatchToSubscribers(fullEventName, enrichedEnvelope);

        results.local = true;
        this._stats.local++;
      } catch (err) {
        logger.error(`[IntegrationBus] Local dispatch failed: ${err.message}`);
        this._stats.errors++;
      }
    }

    return { envelope: enrichedEnvelope, results };
  }

  // ── Subscribing ────────────────────────────────────────────────────────

  /**
   * Subscribe to domain events by pattern
   *
   * @param {string}   pattern  - Event pattern (e.g. 'hr.*', 'finance.invoice.*', '*')
   * @param {Function} handler  - async (envelope) => void
   * @returns {Function}        - Unsubscribe function
   */
  subscribe(pattern, handler) {
    if (!this._subscribers.has(pattern)) {
      this._subscribers.set(pattern, []);
    }
    this._subscribers.get(pattern).push(handler);

    // Also subscribe to MessageQueue if available
    if (this._messageQueue?.connected && pattern !== '*') {
      this._messageQueue.subscribe(pattern, (msg) => {
        try {
          handler(msg.data || msg);
        } catch (err) {
          logger.error(`[IntegrationBus] MQ subscriber error: ${err.message}`);
        }
      }).catch(() => {});
    }

    logger.debug(`[IntegrationBus] Subscriber added for pattern: ${pattern}`);

    return () => {
      const handlers = this._subscribers.get(pattern);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Subscribe to events from a specific domain
   */
  subscribeDomain(domain, handler) {
    return this.subscribe(`${domain}.*`, handler);
  }

  /**
   * Subscribe to all events (global observer)
   */
  subscribeAll(handler) {
    return this.subscribe('*', handler);
  }

  // ── Middleware ──────────────────────────────────────────────────────────

  /**
   * Add pre-publish middleware
   * @param {Function} fn - async (envelope) => envelope | null
   */
  use(fn) {
    this._middleware.push(fn);
    return this;
  }

  // ── Query / Replay ─────────────────────────────────────────────────────

  /**
   * Query historical events from EventStore
   */
  async queryEvents(criteria = {}) {
    if (!this._eventStore) {
      return { events: [], message: 'EventStore not available' };
    }
    return this._eventStore.queryEvents(criteria);
  }

  /**
   * Replay events for an aggregate
   */
  async replayAggregate(aggregateType, aggregateId, reducer, initialState = {}) {
    if (!this._eventStore) {
      return { state: initialState, version: 0, message: 'EventStore not available' };
    }
    return this._eventStore.replayAggregate(aggregateType, aggregateId, reducer, initialState);
  }

  // ── Health & Stats ─────────────────────────────────────────────────────

  getStats() {
    return {
      ...this._stats,
      initialized: this._initialized,
      registeredDomains: this._domainRegistry.size,
      subscriberPatterns: this._subscribers.size,
      totalSubscribers: Array.from(this._subscribers.values())
        .reduce((sum, arr) => sum + arr.length, 0),
      middlewareCount: this._middleware.length,
      infrastructure: {
        eventStore: !!this._eventStore,
        messageQueue: this._messageQueue?.connected || false,
        socketIO: !!this._socketEmitter,
      },
    };
  }

  async healthCheck() {
    const health = {
      status: 'healthy',
      bus: this._initialized,
      eventStore: false,
      messageQueue: false,
      socketIO: false,
      domains: this._domainRegistry.size,
      timestamp: new Date().toISOString(),
    };

    if (this._eventStore) {
      try {
        await this._eventStore.getStats();
        health.eventStore = true;
      } catch { health.eventStore = false; }
    }

    if (this._messageQueue) {
      health.messageQueue = this._messageQueue.connected;
    }

    if (this._socketEmitter) {
      const io = typeof this._socketEmitter.getIO === 'function'
        ? this._socketEmitter.getIO()
        : this._socketEmitter;
      health.socketIO = !!io;
    }

    if (!health.bus) health.status = 'degraded';
    return health;
  }

  // ── Internal ───────────────────────────────────────────────────────────

  _dispatchToSubscribers(eventName, envelope) {
    for (const [pattern, handlers] of this._subscribers) {
      if (this._matchPattern(pattern, eventName)) {
        for (const handler of handlers) {
          setImmediate(async () => {
            try {
              await handler(envelope);
            } catch (err) {
              logger.error(`[IntegrationBus] Subscriber error for ${pattern}: ${err.message}`);
              this._deadLetters.push({
                pattern,
                eventName,
                error: err.message,
                timestamp: new Date().toISOString(),
              });
            }
          });
        }
      }
    }
  }

  _matchPattern(pattern, eventName) {
    if (pattern === '*') return true;
    if (pattern === eventName) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventName.startsWith(prefix + '.') || eventName === prefix;
    }
    if (pattern.endsWith('.>')) {
      const prefix = pattern.slice(0, -2);
      return eventName.startsWith(prefix + '.') || eventName === prefix;
    }
    // Wildcard token match
    const patternParts = pattern.split('.');
    const eventParts = eventName.split('.');
    if (patternParts.length !== eventParts.length) return false;
    return patternParts.every((p, i) => p === '*' || p === eventParts[i]);
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

const integrationBus = new SystemIntegrationBus();

// ─── Express Routes ──────────────────────────────────────────────────────────

function mountIntegrationBusRoutes(app) {
  const express = require('express');
  const router = express.Router();

  // GET /api/v2/integration-bus/status
  router.get('/status', async (_req, res) => {
    const health = await integrationBus.healthCheck();
    const stats = integrationBus.getStats();
    res.json({ success: true, health, stats });
  });

  // GET /api/v2/integration-bus/domains
  router.get('/domains', (_req, res) => {
    res.json({
      success: true,
      domains: integrationBus.getRegisteredDomains(),
    });
  });

  // GET /api/v2/integration-bus/events — query historical events
  router.get('/events', async (req, res) => {
    try {
      const { domain, eventType, from, to, limit } = req.query;
      const events = await integrationBus.queryEvents({
        domain,
        eventType,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit: limit ? parseInt(limit) : 50,
      });
      res.json({ success: true, events });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/v2/integration-bus/publish — manual event publish
  router.post('/publish', async (req, res) => {
    try {
      const { domain, eventType, payload, options } = req.body;
      if (!domain || !eventType) {
        return res.status(400).json({ error: 'domain and eventType are required' });
      }
      const result = await integrationBus.publish(domain, eventType, payload || {}, {
        ...options,
        userId: req.user?.id,
        userName: req.user?.name,
        source: 'api',
      });
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api/v2/integration-bus', router);
  logger.info('[IntegrationBus] Routes mounted at /api/v2/integration-bus');
}

// ─── Module Exports ──────────────────────────────────────────────────────────

module.exports = {
  SystemIntegrationBus,
  integrationBus,
  createEventEnvelope,
  mountIntegrationBusRoutes,
  DELIVERY,
  PRIORITY,
};
