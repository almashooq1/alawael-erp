/**
 * Resource Cleanup Utility
 * Manages proper cleanup of resources to prevent memory leaks
 */

class ResourceManager {
  constructor() {
    this.timers = new Set();
    this.intervals = new Set();
    this.connections = new Map();
    this.streams = new Set();
    this.cleanupInterval = null;
  }

  /**
   * Register a timer
   */
  setTimer(callback, delay) {
    const timerId = setTimeout(callback, delay);
    this.timers.add(timerId);
    return timerId;
  }

  /**
   * Register an interval
   */
  setInterval(callback, interval) {
    const intervalId = setInterval(callback, interval);
    this.intervals.add(intervalId);
    return intervalId;
  }

  /**
   * Register a connection
   */
  registerConnection(id, connection) {
    this.connections.set(id, {
      connection,
      createdAt: Date.now(),
    });
  }

  /**
   * Unregister a connection
   */
  unregisterConnection(id) {
    const conn = this.connections.get(id);
    if (conn && typeof conn.connection.close === 'function') {
      try {
        conn.connection.close();
      } catch (error) {
        console.warn(`Error closing connection ${id}:`, error.message);
      }
    }
    this.connections.delete(id);
  }

  /**
   * Start automatic cleanup
   */
  startAutoCleanup() {
    // Clean up old connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000); // 5 minutes

    // Also force garbage collection
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 10 * 60 * 1000); // 10 minutes
    }

    console.log('✅ Auto-cleanup started');
  }

  /**
   * Clean up stale connections (older than 1 hour)
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [id, { connection, createdAt }] of this.connections.entries()) {
      if (now - createdAt > maxAge) {
        console.log(`🧹 Cleaning up stale connection: ${id}`);
        this.unregisterConnection(id);
      }
    }
  }

  /**
   * Clear all timers
   */
  clearAllTimers() {
    for (const timerId of this.timers) {
      clearTimeout(timerId);
    }
    this.timers.clear();
    console.log('✓ All timers cleared');
  }

  /**
   * Clear all intervals
   */
  clearAllIntervals() {
    for (const intervalId of this.intervals) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
    console.log('✓ All intervals cleared');
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    console.log('🧹 Starting full resource cleanup...');

    // Clear intervals first (prevent new callbacks)
    this.clearAllIntervals();

    // Clear timers
    this.clearAllTimers();

    // Close all connections
    for (const [id] of this.connections.entries()) {
      this.unregisterConnection(id);
    }

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('✅ Resource cleanup completed');
  }

  /**
   * Get status report
   */
  getStatus() {
    return {
      activeTimers: this.timers.size,
      activeIntervals: this.intervals.size,
      activeConnections: this.connections.size,
      memoryUsage: process.memoryUsage(),
    };
  }
}

module.exports = new ResourceManager();
