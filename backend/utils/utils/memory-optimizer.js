/**
 * Memory Optimization Middleware
 * Monitors and optimizes memory usage
 */

const os = require('os');

class MemoryOptimizer {
  constructor() {
    this.warningThreshold = 0.8; // 80%
    this.criticalThreshold = 0.90; // 90%
    this.checkInterval = null;
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercent() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return usedMemory / totalMemory;
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    this.checkInterval = setInterval(() => {
      const usage = this.getMemoryUsagePercent();

      if (usage > this.criticalThreshold) {
        console.warn(`🚨 CRITICAL: Memory usage at ${(usage * 100).toFixed(2)}%`);
        this.triggerCleanup();
      } else if (usage > this.warningThreshold) {
        console.warn(`⚠️  WARNING: Memory usage at ${(usage * 100).toFixed(2)}%`);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Trigger emergency cleanup
   */
  triggerCleanup() {
    console.log('🧹 Triggering emergency cleanup...');

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('✓ Garbage collection triggered');
    }

    // Clear caches if available
    if (global.cacheManager) {
      global.cacheManager.clear();
      console.log('✓ Cache cleared');
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('✓ Memory monitoring stopped');
    }
  }

  /**
   * Get detailed report
   */
  getReport() {
    const usage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    return {
      processMemory: {
        rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
      },
      systemMemory: {
        total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${(this.getMemoryUsagePercent() * 100).toFixed(2)}%`,
      },
    };
  }
}

module.exports = new MemoryOptimizer();
