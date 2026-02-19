/**
 * 🔄 Database Replication System
 *
 * Master-slave replication for high availability
 * - Read replicas for scalability
 * - Replication lag tracking
 * - Failover handling
 */

const mongoose = require('mongoose');

class DatabaseReplicationManager {
  constructor(options = {}) {
    this.options = {
      masterUrl: options.masterUrl || process.env.MONGO_URI,
      replicas: options.replicas || [], // Array of replica URLs
      replicationLag: options.replicationLag || 100, // ms
      healthCheckInterval: options.healthCheckInterval || 30000, // 30s
      preferReadReplica: options.preferReadReplica || false,
    };

    this.connections = {
      master: null,
      replicas: new Map(),
    };

    this.stats = {
      readsFromMaster: 0,
      readsFromReplica: 0,
      replicaFailures: 0,
      failovers: 0,
      replicationLags: new Map(),
    };

    this.replicaHealth = new Map();
    this.initializeConnections();
  }

  /**
   * Initialize master and replica connections
   */
  async initializeConnections() {
    try {
      // Master connection
      this.connections.master = await mongoose.connect(this.options.masterUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 50,
        minPoolSize: 10,
      });

      console.log('[DBReplication] Master connected');

      // Replica connections
      for (const replicaUrl of this.options.replicas) {
        try {
          const replicaConn = await mongoose.createConnection(replicaUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 30,
            minPoolSize: 5,
          });

          this.connections.replicas.set(replicaUrl, replicaConn);
          this.replicaHealth.set(replicaUrl, { healthy: true, lastCheck: Date.now() });

          console.log(`[DBReplication] Replica connected: ${replicaUrl}`);
        } catch (error) {
          console.error(`[DBReplication] Failed to connect replica: ${replicaUrl}`, error.message);
          this.replicaHealth.set(replicaUrl, { healthy: false, lastCheck: Date.now() });
        }
      }

      // Start health checks
      this.startHealthChecks();
    } catch (error) {
      console.error('[DBReplication] Master connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get connection for read operation
   */
  getReadConnection() {
    // If read preference is replicas and healthy replicas exist
    if (this.options.preferReadReplica) {
      const healthyReplicas = Array.from(this.replicaHealth.entries())
        .filter(([_, health]) => health.healthy)
        .map(([url, _]) => url);

      if (healthyReplicas.length > 0) {
        // Round-robin selection
        const replicaUrl = healthyReplicas[Math.floor(Math.random() * healthyReplicas.length)];
        this.stats.readsFromReplica++;
        return this.connections.replicas.get(replicaUrl);
      }
    }

    // Fall back to master
    this.stats.readsFromMaster++;
    return this.connections.master;
  }

  /**
   * Get connection for write operation (always master)
   */
  getWriteConnection() {
    return this.connections.master;
  }

  /**
   * Execute read operation
   */
  async executeRead(model, query = {}, options = {}) {
    const conn = this.getReadConnection();
    const Model = conn.model(model.collection.name, model.schema);

    try {
      if (options.findOne) {
        return await Model.findOne(query);
      } else if (options.findById) {
        return await Model.findById(query._id);
      } else {
        return await Model.find(query).limit(options.limit || 100);
      }
    } catch (error) {
      // Fall back to master on replica failure
      if (conn !== this.connections.master) {
        this.stats.replicaFailures++;
        this.replicaHealth.set(this.getReplicaUrl(conn), { healthy: false, lastCheck: Date.now() });
        console.log('[DBReplication] Replica failed, falling back to master');
        return this.executeRead(model, query, options);
      }
      throw error;
    }
  }

  /**
   * Execute write operation
   */
  async executeWrite(model, operation, data) {
    const conn = this.getWriteConnection();
    const Model = conn.model(model.collection.name, model.schema);

    try {
      if (operation === 'create') {
        return await Model.create(data);
      } else if (operation === 'updateOne') {
        return await Model.updateOne(data.filter, data.update);
      } else if (operation === 'deleteOne') {
        return await Model.deleteOne(data);
      }
    } catch (error) {
      console.error(`[DBReplication] Write operation failed: ${operation}`, error.message);
      throw error;
    }
  }

  /**
   * Get replica URL from connection
   */
  getReplicaUrl(conn) {
    for (const [url, replicaConn] of this.connections.replicas.entries()) {
      if (replicaConn === conn) {
        return url;
      }
    }
    return null;
  }

  /**
   * Monitor replication lag
   */
  async checkReplicationLag(replicaUrl) {
    try {
      const replicaConn = this.connections.replicas.get(replicaUrl);
      if (!replicaConn) return null;

      // Get write timestamp from master
      const masterDb = this.connections.master.db;
      const masterStatus = await masterDb
        .admin()
        .replSetGetStatus()
        .catch(() => null);

      // Get read timestamp from replica
      const replicaDb = replicaConn.db;
      const replicaStatus = await replicaDb
        .admin()
        .replSetGetStatus()
        .catch(() => null);

      if (!masterStatus || !replicaStatus) return null;

      // Calculate lag
      const masterTime = masterStatus.date || Date.now();
      const replicaTime = replicaStatus.date || Date.now();

      return Math.max(0, masterTime - replicaTime);
    } catch (error) {
      console.error('[DBReplication] Lag check failed:', error.message);
      return null;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      for (const [replicaUrl, health] of this.replicaHealth.entries()) {
        try {
          const replicaConn = this.connections.replicas.get(replicaUrl);
          const db = replicaConn?.db;

          // Simple ping to check health
          if (db) {
            await db.admin().ping();
            this.replicaHealth.set(replicaUrl, { healthy: true, lastCheck: Date.now() });

            // Check replication lag
            const lag = await this.checkReplicationLag(replicaUrl);
            if (lag !== null) {
              this.stats.replicationLags.set(replicaUrl, lag);
            }
          }
        } catch (error) {
          this.replicaHealth.set(replicaUrl, {
            healthy: false,
            lastCheck: Date.now(),
            error: error.message,
          });
          console.error(`[DBReplication] Health check failed for ${replicaUrl}:`, error.message);
        }
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Get replication statistics
   */
  getStats() {
    return {
      readsFromMaster: this.stats.readsFromMaster,
      readsFromReplica: this.stats.readsFromReplica,
      replicaFailures: this.stats.replicaFailures,
      failovers: this.stats.failovers,
      replicationLags: Object.fromEntries(this.stats.replicationLags),
      replicaHealth: Object.fromEntries(this.replicaHealth),
    };
  }

  /**
   * Get healthy replicas
   */
  getHealthyReplicas() {
    return Array.from(this.replicaHealth.entries())
      .filter(([_, health]) => health.healthy)
      .map(([url, _]) => url);
  }

  /**
   * Perform failover to replica
   */
  async performFailover() {
    const healthyReplicas = this.getHealthyReplicas();

    if (healthyReplicas.length > 0) {
      const newMasterUrl = healthyReplicas[0];
      console.log(`[DBReplication] Failover triggered: promoting ${newMasterUrl}`);

      this.options.masterUrl = newMasterUrl;
      this.stats.failovers++;

      // Reconnect master
      if (this.connections.master) {
        await this.connections.master.disconnect();
      }

      try {
        this.connections.master = await mongoose.connect(newMasterUrl, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 50,
          minPoolSize: 10,
        });

        console.log('[DBReplication] Failover complete');
        return true;
      } catch (error) {
        console.error('[DBReplication] Failover failed:', error.message);
        return false;
      }
    }

    return false;
  }

  /**
   * Close all connections
   */
  async closeConnections() {
    if (this.connections.master) {
      await this.connections.master.disconnect();
    }

    for (const [_, replicaConn] of this.connections.replicas.entries()) {
      await replicaConn.disconnect();
    }

    this.stopHealthChecks();
  }
}

/**
 * Read/Write splitting middleware
 */
function replicationMiddleware(dbManager) {
  return (req, res, next) => {
    // Attach manager to request
    req.dbManager = dbManager;

    // For read operations, prefer replicas
    if (['GET', 'HEAD'].includes(req.method)) {
      req.preferReplica = true;
    } else {
      // Ensure writes go to master
      req.preferReplica = false;
    }

    next();
  };
}

module.exports = {
  DatabaseReplicationManager,
  replicationMiddleware,
};
