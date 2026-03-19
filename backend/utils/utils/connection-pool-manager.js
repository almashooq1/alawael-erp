/**
 * Connection Pool Manager
 * Manages and optimizes connection pooling across the application
 * Reduces memory usage and improves performance
 */

class ConnectionPoolManager {
  constructor() {
    this.pools = new Map();
    this.stats = {
      created: 0,
      closed: 0,
      active: 0,
      stale: 0,
    };
    this.cleanupInterval = null;
  }

  /**
   * Create a new connection pool
   */
  createPool(name, options = {}) {
    const pool = {
      name,
      connections: new Set(),
      maxSize: options.maxSize || 10,
      minSize: options.minSize || 2,
      idleTimeout: options.idleTimeout || 3600000, // 1 hour
      createdAt: Date.now(),
      config: options,
    };

    this.pools.set(name, pool);
    console.log(`✅ Connection pool "${name}" created (max: ${pool.maxSize})`);
    return pool;
  }

  /**
   * Register a connection in a pool
   */
  registerConnection(poolName, connection, metadata = {}) {
    const pool = this.pools.get(poolName);
    if (!pool) {
      console.warn(`⚠️ Pool "${poolName}" not found`);
      return null;
    }

    if (pool.connections.size >= pool.maxSize) {
      console.warn(`⚠️ Pool "${poolName}" is at max capacity (${pool.maxSize})`);
      return null;
    }

    const conn = {
      id: `${poolName}-${Date.now()}-${Math.random()}`,
      connection,
      metadata,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    pool.connections.add(conn);
    this.stats.created++;
    this.stats.active = Array.from(this.pools.values()).reduce(
      (sum, p) => sum + p.connections.size,
      0,
    );

    return conn.id;
  }

  /**
   * Get connection from pool
   */
  getConnection(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool || pool.connections.size === 0) {
      return null;
    }

    const conn = Array.from(pool.connections)[0];
    if (conn) {
      conn.lastUsed = Date.now();
    }
    return conn?.connection;
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(poolName, connId) {
    const pool = this.pools.get(poolName);
    if (!pool) return false;

    const conn = Array.from(pool.connections).find((c) => c.id === connId);
    if (conn) {
      conn.lastUsed = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Remove connection from pool
   */
  removeConnection(poolName, connId) {
    const pool = this.pools.get(poolName);
    if (!pool) return false;

    const conn = Array.from(pool.connections).find((c) => c.id === connId);
    if (conn) {
      pool.connections.delete(conn);

      // Try to close connection gracefully
      if (typeof conn.connection.close === 'function') {
        try {
          conn.connection.close();
        } catch (e) {
          // Ignore close errors
        }
      }

      this.stats.closed++;
      this.updateStats();
      return true;
    }
    return false;
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    let cleanedCount = 0;

    this.pools.forEach((pool) => {
      const now = Date.now();
      const staleConns = Array.from(pool.connections).filter(
        (conn) => now - conn.lastUsed > pool.idleTimeout,
      );

      staleConns.forEach((conn) => {
        pool.connections.delete(conn);
        if (typeof conn.connection.close === 'function') {
          try {
            conn.connection.close();
          } catch (e) {
            // Ignore
          }
        }
        cleanedCount++;
        this.stats.stale++;
      });
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} stale connections`);
    }

    this.updateStats();
  }

  /**
   * Start automatic cleanup
   */
  startAutoCleanup(interval = 600000) {
    // 10 minutes
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, interval);

    console.log(`✅ Auto-cleanup started (interval: ${interval}ms)`);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Update statistics
   */
  updateStats() {
    this.stats.active = Array.from(this.pools.values()).reduce(
      (sum, p) => sum + p.connections.size,
      0,
    );
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return null;

    return {
      name: pool.name,
      size: pool.connections.size,
      maxSize: pool.maxSize,
      minSize: pool.minSize,
      utilization: `${Math.round((pool.connections.size / pool.maxSize) * 100)}%`,
      idleTimeout: pool.idleTimeout,
      createdAt: new Date(pool.createdAt).toISOString(),
      connections: Array.from(pool.connections).map((c) => ({
        id: c.id,
        age: Date.now() - c.createdAt,
        lastUsed: Date.now() - c.lastUsed,
        metadata: c.metadata,
      })),
    };
  }

  /**
   * Get overall statistics
   */
  getStats() {
    const poolStats = {};
    this.pools.forEach((pool) => {
      poolStats[pool.name] = {
        size: pool.connections.size,
        maxSize: pool.maxSize,
        utilization: `${Math.round((pool.connections.size / pool.maxSize) * 100)}%`,
      };
    });

    return {
      pools: poolStats,
      totalActive: this.stats.active,
      totalCreated: this.stats.created,
      totalClosed: this.stats.closed,
      totalStale: this.stats.stale,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clean up all pools
   */
  cleanup() {
    this.stopAutoCleanup();

    this.pools.forEach((pool) => {
      pool.connections.forEach((conn) => {
        if (typeof conn.connection.close === 'function') {
          try {
            conn.connection.close();
          } catch (e) {
            // Ignore
          }
        }
      });
      pool.connections.clear();
    });

    this.pools.clear();
    console.log('✅ Connection pools cleaned up');
  }
}

// Export as singleton
module.exports = new ConnectionPoolManager();
