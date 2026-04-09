/**
 * Connection Pool Manager - Al-Awael ERP
 * مدير حوض الاتصالات الذكي
 *
 * Features:
 *  - Advanced connection pool configuration
 *  - Multiple connection support (read replicas, analytics DB)
 *  - Connection lifecycle management
 *  - Automatic reconnection with exponential backoff
 *  - Connection health monitoring
 *  - Read/Write splitting
 *  - Connection tagging for debugging
 *  - Graceful shutdown with drain
 *  - Pool statistics & diagnostics
 */

'use strict';

const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Default Pool Configuration
// ══════════════════════════════════════════════════════════════════
const DEFAULT_POOL_CONFIG = {
  // Connection pool
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 5,
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 50,
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_MS) || 30000,
  waitQueueTimeoutMS: parseInt(process.env.DB_WAIT_QUEUE_TIMEOUT) || 10000,

  // Timeouts
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
  serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,

  // Heartbeat
  heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_MS) || 10000,

  // Write concern
  writeConcern: {
    w: process.env.DB_WRITE_CONCERN || 'majority',
    j: process.env.DB_JOURNAL === 'true' || true,
    wtimeout: parseInt(process.env.DB_WRITE_TIMEOUT) || 5000,
  },

  // Read concern / preference
  readPreference: process.env.DB_READ_PREFERENCE || 'primaryPreferred',
  readConcern: { level: process.env.DB_READ_CONCERN || 'majority' },

  // Compression
  compressors: ['snappy', 'zlib'],

  // Auto index
  autoIndex: process.env.NODE_ENV !== 'production',
  autoCreate: process.env.NODE_ENV !== 'production',

  // Retries
  retryWrites: true,
  retryReads: true,
};

// ══════════════════════════════════════════════════════════════════
// ConnectionPoolManager
// ══════════════════════════════════════════════════════════════════
class ConnectionPoolManager extends EventEmitter {
  constructor() {
    super();
    this._connections = new Map(); // name -> { connection, config, status }
    this._primaryName = 'primary';
    this._reconnectAttempts = new Map();
    this._maxReconnectAttempts = 10;
    this._baseReconnectDelay = 1000;
    this._isShuttingDown = false;
    this._monitorInterval = null;
    this._stats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      reconnections: 0,
    };
  }

  // ────── Connect Primary ──────

  /**
   * Connect to the primary database
   * @param {string} uri - MongoDB connection URI
   * @param {Object} options - Override default pool config
   */
  async connectPrimary(uri, options = {}) {
    const config = { ...DEFAULT_POOL_CONFIG, ...options };

    // Apply config to default mongoose connection
    const mongooseOptions = {
      minPoolSize: config.minPoolSize,
      maxPoolSize: config.maxPoolSize,
      maxIdleTimeMS: config.maxIdleTimeMS,
      waitQueueTimeoutMS: config.waitQueueTimeoutMS,
      connectTimeoutMS: config.connectTimeoutMS,
      socketTimeoutMS: config.socketTimeoutMS,
      serverSelectionTimeoutMS: config.serverSelectionTimeoutMS,
      heartbeatFrequencyMS: config.heartbeatFrequencyMS,
      writeConcern: config.writeConcern,
      readPreference: config.readPreference,
      readConcern: config.readConcern,
      compressors: config.compressors,
      autoIndex: config.autoIndex,
      autoCreate: config.autoCreate,
      retryWrites: config.retryWrites,
      retryReads: config.retryReads,
    };

    try {
      await mongoose.connect(uri, mongooseOptions);

      this._registerConnection(this._primaryName, mongoose.connection, config);
      this._setupEventHandlers(this._primaryName, mongoose.connection, uri, config);

      logger.info('[PoolManager] Primary connection established', {
        poolSize: `${config.minPoolSize}-${config.maxPoolSize}`,
        readPreference: config.readPreference,
      });

      return mongoose.connection;
    } catch (err) {
      logger.error(`[PoolManager] Primary connection failed: ${err.message}`);
      this._stats.failedConnections++;
      throw err;
    }
  }

  // ────── Add Named Connection ──────

  /**
   * Create an additional named connection (e.g., for read replicas, analytics)
   * @param {string} name - Connection name
   * @param {string} uri - MongoDB URI
   * @param {Object} options - Connection options
   */
  async addConnection(name, uri, options = {}) {
    if (this._connections.has(name)) {
      logger.warn(`[PoolManager] Connection "${name}" already exists, closing old one`);
      await this.closeConnection(name);
    }

    const config = { ...DEFAULT_POOL_CONFIG, ...options };

    try {
      const connection = mongoose.createConnection(uri, {
        minPoolSize: config.minPoolSize,
        maxPoolSize: config.maxPoolSize,
        maxIdleTimeMS: config.maxIdleTimeMS,
        connectTimeoutMS: config.connectTimeoutMS,
        socketTimeoutMS: config.socketTimeoutMS,
        readPreference: config.readPreference,
        retryWrites: config.retryWrites,
        retryReads: config.retryReads,
      });

      // Wait for connection
      await new Promise((resolve, reject) => {
        connection.once('connected', resolve);
        connection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), config.connectTimeoutMS);
      });

      this._registerConnection(name, connection, config);
      this._setupEventHandlers(name, connection, uri, config);

      logger.info(`[PoolManager] Connection "${name}" established`);
      return connection;
    } catch (err) {
      logger.error(`[PoolManager] Connection "${name}" failed: ${err.message}`);
      this._stats.failedConnections++;
      throw err;
    }
  }

  // ────── Register Connection ──────

  _registerConnection(name, connection, config) {
    this._connections.set(name, {
      connection,
      config,
      status: 'connected',
      connectedAt: new Date(),
      lastActivity: new Date(),
    });
    this._stats.totalConnections++;
    this._stats.activeConnections++;
  }

  // ────── Event Handlers ──────

  _setupEventHandlers(name, connection, uri, config) {
    connection.on('disconnected', () => {
      logger.warn(`[PoolManager] Connection "${name}" disconnected`);
      const entry = this._connections.get(name);
      if (entry) entry.status = 'disconnected';
      this.emit('disconnected', { name });

      if (!this._isShuttingDown) {
        this._attemptReconnect(name, uri, config);
      }
    });

    connection.on('reconnected', () => {
      logger.info(`[PoolManager] Connection "${name}" reconnected`);
      const entry = this._connections.get(name);
      if (entry) {
        entry.status = 'connected';
        entry.connectedAt = new Date();
      }
      this._reconnectAttempts.delete(name);
      this._stats.reconnections++;
      this.emit('reconnected', { name });
    });

    connection.on('error', err => {
      logger.error(`[PoolManager] Connection "${name}" error: ${err.message}`);
      this.emit('error', { name, error: err });
    });

    connection.on('close', () => {
      const entry = this._connections.get(name);
      if (entry) entry.status = 'closed';
      this._stats.activeConnections = Math.max(0, this._stats.activeConnections - 1);
    });
  }

  // ────── Auto Reconnect ──────

  async _attemptReconnect(name, uri, config) {
    const attempts = (this._reconnectAttempts.get(name) || 0) + 1;
    this._reconnectAttempts.set(name, attempts);

    if (attempts > this._maxReconnectAttempts) {
      logger.error(`[PoolManager] Max reconnect attempts reached for "${name}"`);
      this.emit('maxReconnectAttemptsReached', { name, attempts });
      return;
    }

    const delay = Math.min(
      this._baseReconnectDelay * Math.pow(2, attempts - 1) * (0.5 + Math.random() * 0.5),
      30000
    );

    logger.info(
      `[PoolManager] Reconnecting "${name}" in ${Math.round(delay)}ms (attempt ${attempts})`
    );

    await new Promise(r => setTimeout(r, delay));

    if (this._isShuttingDown) return;

    try {
      if (name === this._primaryName) {
        // Mongoose auto-reconnects the default connection
        logger.info(`[PoolManager] Waiting for mongoose auto-reconnect for "${name}"`);
      } else {
        const entry = this._connections.get(name);
        if (entry && entry.connection.readyState !== 1) {
          // Try to reconnect
          await entry.connection.openUri(uri, config);
        }
      }
    } catch (err) {
      logger.warn(
        `[PoolManager] Reconnect attempt ${attempts} failed for "${name}": ${err.message}`
      );
      this._attemptReconnect(name, uri, config);
    }
  }

  // ────── Get Connections ──────

  /** Get the primary connection */
  getPrimary() {
    return mongoose.connection;
  }

  /** Get a named connection */
  getConnection(name) {
    const entry = this._connections.get(name);
    if (!entry) return null;
    entry.lastActivity = new Date();
    return entry.connection;
  }

  /** Get a read-optimized connection (read replica if available) */
  getReadConnection() {
    // Try to find a read replica
    for (const [name, entry] of this._connections) {
      if (
        name !== this._primaryName &&
        entry.status === 'connected' &&
        entry.config.readPreference === 'secondaryPreferred'
      ) {
        entry.lastActivity = new Date();
        return entry.connection;
      }
    }
    // Fallback to primary
    return this.getPrimary();
  }

  // ────── Close Connections ──────

  async closeConnection(name) {
    const entry = this._connections.get(name);
    if (!entry) return;

    try {
      if (name !== this._primaryName) {
        await entry.connection.close();
      }
      entry.status = 'closed';
      this._connections.delete(name);
      this._stats.activeConnections = Math.max(0, this._stats.activeConnections - 1);
      logger.info(`[PoolManager] Connection "${name}" closed`);
    } catch (err) {
      logger.error(`[PoolManager] Error closing "${name}": ${err.message}`);
    }
  }

  // ────── Graceful Shutdown ──────

  async shutdown(timeoutMs = 10000) {
    this._isShuttingDown = true;
    logger.info('[PoolManager] Shutting down all connections...');

    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
    }

    const timeout = setTimeout(() => {
      logger.warn('[PoolManager] Shutdown timeout — forcing close');
    }, timeoutMs);

    try {
      // Close named connections first
      for (const [name] of this._connections) {
        if (name !== this._primaryName) {
          await this.closeConnection(name);
        }
      }

      // Close primary last
      await mongoose.connection.close();
      logger.info('[PoolManager] All connections closed');
    } catch (err) {
      logger.error(`[PoolManager] Shutdown error: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  // ────── Health Monitoring ──────

  startMonitoring(intervalMs = 30000) {
    if (this._monitorInterval) return;

    this._monitorInterval = setInterval(() => {
      this._checkHealth();
    }, intervalMs);

    logger.info(`[PoolManager] Health monitoring started (${intervalMs / 1000}s interval)`);
  }

  _checkHealth() {
    for (const [name, entry] of this._connections) {
      const readyState = entry.connection.readyState;
      const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

      if (readyState !== 1) {
        logger.warn(`[PoolManager] Connection "${name}" is ${stateNames[readyState] || 'unknown'}`);
        entry.status = stateNames[readyState] || 'unknown';
        this.emit('unhealthy', { name, state: entry.status });
      }
    }
  }

  // ────── Diagnostics ──────

  /**
   * Get comprehensive pool diagnostics
   */
  getDiagnostics() {
    const connections = {};

    for (const [name, entry] of this._connections) {
      const conn = entry.connection;
      connections[name] = {
        status: entry.status,
        readyState: conn.readyState,
        connectedAt: entry.connectedAt,
        lastActivity: entry.lastActivity,
        host: conn.host,
        port: conn.port,
        dbName: conn.name,
        config: {
          minPoolSize: entry.config.minPoolSize,
          maxPoolSize: entry.config.maxPoolSize,
          readPreference: entry.config.readPreference,
        },
      };
    }

    return {
      stats: { ...this._stats },
      connections,
      isShuttingDown: this._isShuttingDown,
      reconnectAttempts: Object.fromEntries(this._reconnectAttempts),
    };
  }

  /**
   * Quick health check for all connections
   */
  async healthCheck() {
    const results = {};

    for (const [name, entry] of this._connections) {
      try {
        const startTime = Date.now();
        await entry.connection.db.admin().ping();
        const latency = Date.now() - startTime;

        results[name] = {
          healthy: true,
          latencyMs: latency,
          status: entry.status,
        };
      } catch (err) {
        results[name] = {
          healthy: false,
          error: err.message,
          status: entry.status,
        };
      }
    }

    const allHealthy = Object.values(results).every(r => r.healthy);
    return { healthy: allHealthy, connections: results };
  }
}

// Singleton
const connectionPoolManager = new ConnectionPoolManager();

module.exports = {
  ConnectionPoolManager,
  connectionPoolManager,
  DEFAULT_POOL_CONFIG,
};
