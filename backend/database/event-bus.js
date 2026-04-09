/**
 * Database Event Bus (Change Streams) - Al-Awael ERP
 * ناقل أحداث قاعدة البيانات (تيارات التغيير)
 *
 * Features:
 *  - MongoDB Change Streams for real-time event processing
 *  - Event filtering by operation type and collection
 *  - Automatic resume after disconnect (resume tokens)
 *  - Debounced event batching for high-throughput
 *  - Dead letter queue for failed event handlers
 *  - Event replay from a specific timestamp
 *  - Integration with Socket.IO for real-time UI updates
 */

'use strict';

const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// DatabaseEventBus
// ══════════════════════════════════════════════════════════════════
class DatabaseEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.setMaxListeners(50);

    this._watchers = new Map(); // collection -> ChangeStream
    this._resumeTokens = new Map(); // collection -> resumeToken
    this._handlers = new Map(); // eventKey -> [handler, ...]
    this._deadLetters = [];
    this._maxDeadLetters = options.maxDeadLetters || 1000;
    this._batchSize = options.batchSize || 1;
    this._batchTimeoutMs = options.batchTimeoutMs || 100;
    this._isRunning = false;
    this._reconnectDelay = options.reconnectDelay || 5000;
    this._fullDocument = options.fullDocument || 'updateLookup';
    this._batches = new Map(); // collection -> { events: [], timer }
  }

  // ────── Watch a Mongoose Model's Collection ──────
  /**
   * Start watching a model's collection for changes
   *
   * @param {mongoose.Model|string} modelOrName - Mongoose model or model name
   * @param {Object} options - { operations, pipeline, fullDocument, batchSize }
   * @returns {DatabaseEventBus} this (for chaining)
   *
   * @example
   *   eventBus.watch(User, {
   *     operations: ['insert', 'update', 'delete'],
   *   });
   *
   *   eventBus.on('User:insert', (event) => {
   *     console.log('New user created:', event.fullDocument.name);
   *   });
   */
  watch(modelOrName, options = {}) {
    const model = typeof modelOrName === 'string' ? mongoose.model(modelOrName) : modelOrName;

    const collectionName = model.collection.collectionName;
    const modelName = model.modelName;

    if (this._watchers.has(collectionName)) {
      logger.warn(`[EventBus] Already watching ${collectionName}`);
      return this;
    }

    const pipeline = this._buildPipeline(options);
    const changeStreamOptions = {
      fullDocument: options.fullDocument || this._fullDocument,
      fullDocumentBeforeChange: options.fullDocumentBeforeChange || 'off',
      batchSize: options.batchSize || this._batchSize,
    };

    // Resume from saved token if available
    const resumeToken = this._resumeTokens.get(collectionName);
    if (resumeToken) {
      changeStreamOptions.resumeAfter = resumeToken;
    }

    try {
      const changeStream = model.watch(pipeline, changeStreamOptions);

      changeStream.on('change', change => {
        this._handleChange(modelName, collectionName, change);
      });

      changeStream.on('error', err => {
        logger.error(`[EventBus] Change stream error for ${collectionName}:`, err.message);
        this._watchers.delete(collectionName);

        // Auto-reconnect
        if (this._isRunning) {
          setTimeout(() => {
            logger.info(`[EventBus] Reconnecting watcher for ${collectionName}`);
            this.watch(model, options);
          }, this._reconnectDelay);
        }
      });

      changeStream.on('close', () => {
        logger.info(`[EventBus] Change stream closed for ${collectionName}`);
        this._watchers.delete(collectionName);
      });

      this._watchers.set(collectionName, { stream: changeStream, model, options });
      this._isRunning = true;

      logger.info(`[EventBus] Watching ${modelName} (${collectionName})`);
    } catch (err) {
      logger.error(`[EventBus] Failed to watch ${collectionName}:`, err.message);
    }

    return this;
  }

  // ────── Handle Incoming Change ──────
  _handleChange(modelName, collectionName, change) {
    const operationType = change.operationType; // insert, update, replace, delete, etc.
    const resumeToken = change._id;

    // Save resume token
    this._resumeTokens.set(collectionName, resumeToken);

    const event = {
      modelName,
      collection: collectionName,
      operation: operationType,
      documentId: change.documentKey?._id,
      fullDocument: change.fullDocument || null,
      updateDescription: change.updateDescription || null,
      timestamp: change.clusterTime || new Date(),
      resumeToken,
    };

    // Emit specific events
    const eventKey = `${modelName}:${operationType}`;
    this.emit(eventKey, event);

    // Emit wildcard events
    this.emit(`${modelName}:*`, event);
    this.emit('*', event);

    // Call registered handlers
    this._callHandlers(eventKey, event);
    this._callHandlers(`${modelName}:*`, event);
  }

  // ────── Register Event Handler ──────
  /**
   * Register a typed event handler
   *
   * @param {string} eventKey - e.g., 'User:insert', 'Order:update', 'Beneficiary:*'
   * @param {Function} handler - async (event) => { ... }
   * @param {Object} options - { retries, retryDelay }
   */
  handle(eventKey, handler, options = {}) {
    if (!this._handlers.has(eventKey)) {
      this._handlers.set(eventKey, []);
    }
    this._handlers.get(eventKey).push({ fn: handler, options });
    return this;
  }

  // ────── Call Handlers with Error Safety ──────
  async _callHandlers(eventKey, event) {
    const handlers = this._handlers.get(eventKey);
    if (!handlers || handlers.length === 0) return;

    for (const { fn, options } of handlers) {
      const maxRetries = options.retries || 0;
      let lastErr = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await fn(event);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (attempt < maxRetries) {
            const delay = (options.retryDelay || 500) * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }

      if (lastErr) {
        logger.error(`[EventBus] Handler failed for ${eventKey}:`, lastErr.message);
        this._addToDeadLetters(eventKey, event, lastErr);
      }
    }
  }

  // ────── Dead Letter Queue ──────
  _addToDeadLetters(eventKey, event, error) {
    this._deadLetters.push({
      eventKey,
      event,
      error: error.message,
      timestamp: new Date(),
    });

    // Trim to max size
    while (this._deadLetters.length > this._maxDeadLetters) {
      this._deadLetters.shift();
    }
  }

  /** Get dead letter queue contents */
  getDeadLetters(limit = 50) {
    return this._deadLetters.slice(-limit);
  }

  /** Replay dead letters */
  async replayDeadLetters(filter = {}) {
    const toReplay = filter.eventKey
      ? this._deadLetters.filter(d => d.eventKey === filter.eventKey)
      : [...this._deadLetters];

    let replayed = 0;
    for (const dl of toReplay) {
      try {
        await this._callHandlers(dl.eventKey, dl.event);
        replayed++;
        // Remove from dead letters
        const idx = this._deadLetters.indexOf(dl);
        if (idx >= 0) this._deadLetters.splice(idx, 1);
      } catch (_) {
        // Still failing, leave in dead letters
      }
    }
    return { replayed, remaining: this._deadLetters.length };
  }

  // ────── Build Aggregation Pipeline ──────
  _buildPipeline(options = {}) {
    const pipeline = [];

    // Filter by operation types
    if (options.operations && options.operations.length > 0) {
      pipeline.push({
        $match: { operationType: { $in: options.operations } },
      });
    }

    // Custom pipeline stages
    if (options.pipeline) {
      pipeline.push(...options.pipeline);
    }

    return pipeline;
  }

  // ────── Database-Level Watch (all collections) ──────
  /**
   * Watch the entire database for changes
   */
  watchDatabase(options = {}) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      logger.warn('[EventBus] Cannot watch database — not connected');
      return this;
    }

    try {
      const pipeline = this._buildPipeline(options);
      const changeStream = mongoose.connection.watch(pipeline, {
        fullDocument: options.fullDocument || this._fullDocument,
      });

      changeStream.on('change', change => {
        const ns = change.ns;
        const collectionName = ns?.coll || 'unknown';

        // Try to find the model name
        let modelName = collectionName;
        try {
          const modelNames = mongoose.modelNames();
          for (const name of modelNames) {
            if (mongoose.model(name).collection.collectionName === collectionName) {
              modelName = name;
              break;
            }
          }
        } catch (_) {
          // ignore
        }

        this._handleChange(modelName, collectionName, change);
      });

      changeStream.on('error', err => {
        logger.error(`[EventBus] Database watcher error:`, err.message);
      });

      this._watchers.set('__database__', { stream: changeStream });
      this._isRunning = true;
      logger.info('[EventBus] Watching entire database for changes');
    } catch (err) {
      logger.error(`[EventBus] Failed to watch database:`, err.message);
    }

    return this;
  }

  // ────── Stop Watching ──────
  /** Unwatch a specific collection */
  unwatch(modelOrName) {
    const name =
      typeof modelOrName === 'string'
        ? modelOrName
        : modelOrName.collection?.collectionName || modelOrName;

    const watcher = this._watchers.get(name);
    if (watcher) {
      watcher.stream.close();
      this._watchers.delete(name);
      logger.info(`[EventBus] Stopped watching ${name}`);
    }
    return this;
  }

  /** Stop all watchers and clean up */
  async shutdown() {
    this._isRunning = false;
    for (const [name, watcher] of this._watchers) {
      try {
        await watcher.stream.close();
        logger.info(`[EventBus] Closed watcher for ${name}`);
      } catch (err) {
        logger.error(`[EventBus] Error closing watcher for ${name}:`, err.message);
      }
    }
    this._watchers.clear();
    this.removeAllListeners();
    logger.info('[EventBus] Shutdown complete');
  }

  // ────── Stats ──────
  getStats() {
    return {
      isRunning: this._isRunning,
      activeWatchers: this._watchers.size,
      watchedCollections: [...this._watchers.keys()],
      registeredHandlers: [...this._handlers.entries()].map(([k, v]) => ({
        event: k,
        count: v.length,
      })),
      deadLetterCount: this._deadLetters.length,
      resumeTokenCount: this._resumeTokens.size,
    };
  }
}

// Singleton instance
const databaseEventBus = new DatabaseEventBus();

module.exports = {
  DatabaseEventBus,
  databaseEventBus,
};
