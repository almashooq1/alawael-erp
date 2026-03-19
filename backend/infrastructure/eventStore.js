/**
 * Event Store — مخزن الأحداث (Event Sourcing)
 *
 * Implements Event Sourcing pattern for tracking all changes to
 * sensitive data (medical records, financial transactions, etc.)
 *
 * Features:
 *  - Immutable event log
 *  - Event replay for state reconstruction
 *  - Snapshots for performance optimization
 *  - Event versioning
 *  - Aggregate root pattern
 *
 * @module infrastructure/eventStore
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ─── Event Schema ────────────────────────────────────────────────────────────

const EventSchema = new mongoose.Schema(
  {
    // Event identity
    eventId: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    eventVersion: {
      type: Number,
      default: 1,
    },

    // Aggregate (entity) this event belongs to
    aggregateId: {
      type: String,
      required: true,
      index: true,
    },
    aggregateType: {
      type: String,
      required: true,
      index: true,
    },
    aggregateVersion: {
      type: Number,
      required: true,
    },

    // Event payload (the actual change data)
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Metadata
    metadata: {
      userId: { type: String, index: true },
      userName: String,
      userRole: String,
      ipAddress: String,
      userAgent: String,
      requestId: String,
      correlationId: String,
      causationId: String,
      source: String, // which service/module emitted this event
      timestamp: { type: Date, default: Date.now },
    },

    // Stream tracking
    streamPosition: {
      type: Number,
      required: true,
    },

    // Domain context
    domain: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'event_store',
  }
);

// Compound indexes for efficient querying
EventSchema.index({ aggregateType: 1, aggregateId: 1, aggregateVersion: 1 }, { unique: true });
EventSchema.index({ domain: 1, eventType: 1, createdAt: -1 });
EventSchema.index({ 'metadata.userId': 1, createdAt: -1 });
EventSchema.index({ 'metadata.correlationId': 1 });

// ─── Snapshot Schema ─────────────────────────────────────────────────────────

const SnapshotSchema = new mongoose.Schema(
  {
    aggregateId: { type: String, required: true },
    aggregateType: { type: String, required: true },
    version: { type: Number, required: true },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    domain: String,
  },
  {
    timestamps: true,
    collection: 'event_snapshots',
  }
);

SnapshotSchema.index({ aggregateType: 1, aggregateId: 1 }, { unique: true });

// ─── Models ──────────────────────────────────────────────────────────────────

let EventModel;
let SnapshotModel;

try {
  EventModel = mongoose.model('Event');
} catch {
  EventModel = mongoose.model('Event', EventSchema);
}

try {
  SnapshotModel = mongoose.model('EventSnapshot');
} catch {
  SnapshotModel = mongoose.model('EventSnapshot', SnapshotSchema);
}

// ─── Event Store Class ───────────────────────────────────────────────────────

class EventStore {
  constructor() {
    this._handlers = new Map(); // eventType -> [handler, handler, ...]
    this._projections = new Map(); // name -> projection function
    this._streamPositionCounter = 0;
  }

  /**
   * Append events to the store
   * @param {string} aggregateType - e.g., 'MedicalRecord', 'FinancialTransaction'
   * @param {string} aggregateId - Entity ID
   * @param {Array<{type: string, payload: Object}>} events - Events to append
   * @param {Object} metadata - Context metadata
   * @param {number} expectedVersion - Optimistic concurrency check
   */
  async appendEvents(aggregateType, aggregateId, events, metadata = {}, expectedVersion = -1) {
    // Optimistic concurrency: check current version
    const currentVersion = await this._getCurrentVersion(aggregateType, aggregateId);
    if (expectedVersion >= 0 && currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion} ` +
          `for ${aggregateType}:${aggregateId}`
      );
    }

    const storedEvents = [];
    let version = currentVersion;

    for (const event of events) {
      version += 1;
      this._streamPositionCounter += 1;

      const storedEvent = await EventModel.create({
        eventType: event.type,
        eventVersion: event.version || 1,
        aggregateId,
        aggregateType,
        aggregateVersion: version,
        payload: event.payload,
        metadata: {
          ...metadata,
          timestamp: new Date(),
        },
        streamPosition: this._streamPositionCounter,
        domain: event.domain || aggregateType.toLowerCase(),
      });

      storedEvents.push(storedEvent);

      // Dispatch to handlers
      await this._dispatch(event.type, storedEvent);
    }

    logger.debug(
      `[EventStore] Appended ${events.length} events to ${aggregateType}:${aggregateId} (v${version})`
    );

    return { events: storedEvents, version };
  }

  /**
   * Get all events for an aggregate
   * @param {string} aggregateType
   * @param {string} aggregateId
   * @param {Object} [options]
   * @param {number} [options.fromVersion] - Start from this version
   * @param {number} [options.toVersion] - End at this version
   */
  async getEvents(aggregateType, aggregateId, options = {}) {
    const query = { aggregateType, aggregateId };
    if (options.fromVersion) query.aggregateVersion = { $gte: options.fromVersion };
    if (options.toVersion) {
      query.aggregateVersion = query.aggregateVersion || {};
      query.aggregateVersion.$lte = options.toVersion;
    }

    return EventModel.find(query).sort({ aggregateVersion: 1 }).lean().exec();
  }

  /**
   * Rebuild aggregate state from events (Event Replay)
   * @param {string} aggregateType
   * @param {string} aggregateId
   * @param {Function} reducer - (state, event) => newState
   * @param {Object} [initialState] - Initial state
   */
  async replayAggregate(aggregateType, aggregateId, reducer, initialState = {}) {
    // Try snapshot first
    const snapshot = await SnapshotModel.findOne({ aggregateType, aggregateId }).lean();
    let state = snapshot ? snapshot.state : { ...initialState };
    const fromVersion = snapshot ? snapshot.version + 1 : 0;

    // Get events after snapshot
    const events = await this.getEvents(aggregateType, aggregateId, { fromVersion });

    // Replay events
    for (const event of events) {
      state = reducer(state, event);
    }

    return {
      state,
      version:
        events.length > 0 ? events[events.length - 1].aggregateVersion : snapshot?.version || 0,
    };
  }

  /**
   * Save a snapshot for an aggregate
   */
  async saveSnapshot(aggregateType, aggregateId, version, state) {
    await SnapshotModel.findOneAndUpdate(
      { aggregateType, aggregateId },
      { version, state, domain: aggregateType.toLowerCase() },
      { upsert: true, new: true }
    );
    logger.debug(`[EventStore] Snapshot saved for ${aggregateType}:${aggregateId} at v${version}`);
  }

  /**
   * Subscribe to event types
   * @param {string} eventType
   * @param {Function} handler - async (event) => void
   */
  subscribe(eventType, handler) {
    if (!this._handlers.has(eventType)) {
      this._handlers.set(eventType, []);
    }
    this._handlers.get(eventType).push(handler);
  }

  /**
   * Query events by criteria
   */
  async queryEvents(criteria = {}) {
    const query = {};
    if (criteria.domain) query.domain = criteria.domain;
    if (criteria.eventType) query.eventType = criteria.eventType;
    if (criteria.userId) query['metadata.userId'] = criteria.userId;
    if (criteria.from) query.createdAt = { $gte: criteria.from };
    if (criteria.to) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = criteria.to;
    }
    if (criteria.correlationId) query['metadata.correlationId'] = criteria.correlationId;

    return EventModel.find(query)
      .sort({ streamPosition: -1 })
      .limit(criteria.limit || 100)
      .lean()
      .exec();
  }

  /**
   * Get event stream summary/stats
   */
  async getStats() {
    const [totalEvents, aggregateTypes, recentEvents] = await Promise.all([
      EventModel.countDocuments(),
      EventModel.distinct('aggregateType'),
      EventModel.find().sort({ createdAt: -1 }).limit(10).lean().exec(),
    ]);

    return {
      totalEvents,
      aggregateTypes,
      recentEvents: recentEvents.map(e => ({
        eventType: e.eventType,
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        timestamp: e.createdAt,
      })),
    };
  }

  // ─── Private Methods ────────────────────────────────────────────────────

  async _getCurrentVersion(aggregateType, aggregateId) {
    const lastEvent = await EventModel.findOne({ aggregateType, aggregateId })
      .sort({ aggregateVersion: -1 })
      .select('aggregateVersion')
      .lean();
    return lastEvent ? lastEvent.aggregateVersion : -1;
  }

  async _dispatch(eventType, event) {
    const handlers = this._handlers.get(eventType) || [];
    const wildcardHandlers = this._handlers.get('*') || [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`[EventStore] Handler error for ${eventType}: ${error.message}`);
      }
    }
  }
}

// ─── CQRS Command Bus ────────────────────────────────────────────────────────

class CommandBus {
  constructor() {
    this._handlers = new Map();
  }

  /**
   * Register a command handler
   * @param {string} commandType
   * @param {Function} handler - async (command) => result
   */
  register(commandType, handler) {
    if (this._handlers.has(commandType)) {
      throw new Error(`Command handler already registered: ${commandType}`);
    }
    this._handlers.set(commandType, handler);
  }

  /**
   * Execute a command
   * @param {Object} command - { type, payload, metadata }
   */
  async execute(command) {
    const handler = this._handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    logger.debug(`[CommandBus] Executing: ${command.type}`);
    const result = await handler(command);
    return result;
  }
}

// ─── CQRS Query Bus ─────────────────────────────────────────────────────────

class QueryBus {
  constructor() {
    this._handlers = new Map();
  }

  /**
   * Register a query handler
   * @param {string} queryType
   * @param {Function} handler - async (query) => result
   */
  register(queryType, handler) {
    this._handlers.set(queryType, handler);
  }

  /**
   * Execute a query
   * @param {Object} query - { type, params }
   */
  async execute(query) {
    const handler = this._handlers.get(query.type);
    if (!handler) {
      throw new Error(`No handler registered for query: ${query.type}`);
    }
    return handler(query);
  }
}

// ─── Singleton Instances ─────────────────────────────────────────────────────
const eventStore = new EventStore();
const commandBus = new CommandBus();
const queryBus = new QueryBus();

// ─── Express Routes ──────────────────────────────────────────────────────────

/**
 * Mount Event Store API endpoints
 * @param {import('express').Express} app
 */
function mountEventStoreRoutes(app) {
  const express = require('express');
  const router = express.Router();

  // Get events for an aggregate
  router.get('/events/:aggregateType/:aggregateId', async (req, res) => {
    try {
      const events = await eventStore.getEvents(req.params.aggregateType, req.params.aggregateId, {
        fromVersion: parseInt(req.query.fromVersion) || undefined,
        toVersion: parseInt(req.query.toVersion) || undefined,
      });
      res.json({ success: true, events, count: events.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Query events
  router.get('/events', async (req, res) => {
    try {
      const events = await eventStore.queryEvents({
        domain: req.query.domain,
        eventType: req.query.eventType,
        userId: req.query.userId,
        from: req.query.from ? new Date(req.query.from) : undefined,
        to: req.query.to ? new Date(req.query.to) : undefined,
        limit: parseInt(req.query.limit) || 100,
      });
      res.json({ success: true, events, count: events.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Event store stats
  router.get('/stats', async (_req, res) => {
    try {
      const stats = await eventStore.getStats();
      res.json({ success: true, ...stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api/v2/event-store', router);
  logger.info('[EventStore] API routes mounted on /api/v2/event-store');
}

module.exports = {
  // Core
  EventStore,
  eventStore,
  EventModel,
  SnapshotModel,

  // CQRS
  CommandBus,
  QueryBus,
  commandBus,
  queryBus,

  // Router
  mountEventStoreRoutes,
};
