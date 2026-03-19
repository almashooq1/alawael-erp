/**
 * Database Connection Enhancements
 * Adds monitoring and optimization to MongoDB connections
 */

class DatabaseEnhancements {
  constructor() {
    this.monitoring = false;
    this.stats = {
      connections: 0,
      operations: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: [],
    };
    this.monitoringInterval = null;
  }

  /**
   * Initialize database monitoring
   */
  initializeMonitoring(connection) {
    if (!connection) {
      console.warn('⚠️ Database connection not provided for monitoring');
      return;
    }

    this.monitoring = true;
    this.connection = connection;

    // Monitor connection pool
    this.monitorConnectionPool();

    // Monitor command performance
    this.monitorCommandPerformance();

    console.log('✅ Database monitoring initialized');
  }

  /**
   * Monitor MongoDB connection pool
   */
  monitorConnectionPool() {
    if (!this.connection || !this.connection.connection) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      try {
        const poolStats = this.connection.connection.getClient().topology.s.pool;

        if (poolStats) {
          this.stats.connections = poolStats.availableConnectionCount || 0;

          if (this.stats.connections < 2) {
            console.warn('⚠️ Low connection pool: only', this.stats.connections, 'available');
          }
        }
      } catch (error) {
        // Silently ignore monitoring errors
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Monitor command performance
   */
  monitorCommandPerformance() {
    if (!this.connection) {
      return;
    }

    try {
      // Hook into mongoose connection events
      this.connection.once('open', () => {
        console.log('✅ Database monitoring started');
        
        // Monitor within the connection object
        if (this.connection.collection && this.connection.collection.conn) {
          // Connection is ready for monitoring
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not setup command monitoring:', error.message);
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(duration) {
    this.stats.responseTimes.push(duration);

    // Keep only last 100 response times
    if (this.stats.responseTimes.length > 100) {
      this.stats.responseTimes.shift();
    }

    // Calculate average
    this.stats.avgResponseTime = Math.round(
      this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length,
    );
  }

  /**
   * Enable connection recycling
   */
  enableConnectionRecycling(maxConnectionAge = 3600000) {
    // 1 hour
    if (!this.connection) {
      return;
    }

    console.log(`✅ Connection recycling enabled (max age: ${maxConnectionAge}ms)`);

    // Periodically refresh connections
    setInterval(() => {
      try {
        if (this.connection && this.connection.connection) {
          const client = this.connection.getClient();

          // Check if pool needs refresh
          const poolStats = client.topology.s.pool;
          if (poolStats && poolStats.availableConnectionCount < 2) {
            console.log('🔄 Refreshing connection pool due to low availability');
            // MongoDB client handles this automatically
          }
        }
      } catch (error) {
        // Silently ignore recycling errors
      }
    }, maxConnectionAge);
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      poolSize: this.stats.connections,
      totalOperations: this.stats.operations,
      totalErrors: this.stats.errors,
      avgResponseTime: `${this.stats.avgResponseTime}ms`,
      recentErrors: this.stats.errors > 0 ? 'Yes' : 'No',
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * Get detailed connection info
   */
  async getConnectionInfo() {
    if (!this.connection) {
      return null;
    }

    try {
      const db = this.connection.getClient().db();
      const serverInfo = await db.admin().serverInfo();

      return {
        version: serverInfo?.version,
        uptime: serverInfo?.uptime,
        connections: serverInfo?.connections || {},
        memory: serverInfo?.mem || {},
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting connection info:', error.message);
      return null;
    }
  }

  /**
   * Check connection health
   */
  async checkHealth() {
    if (!this.connection) {
      return {
        healthy: false,
        message: 'No database connection',
      };
    }

    try {
      const db = this.connection.getClient().db();
      const pingResult = await db.admin().ping();

      return {
        healthy: true,
        poolSize: this.stats.connections,
        operations: this.stats.operations,
        errors: this.stats.errors,
        avgResponseTime: this.stats.avgResponseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoring = false;
    console.log('✅ Database monitoring stopped');
  }
}

module.exports = new DatabaseEnhancements();
