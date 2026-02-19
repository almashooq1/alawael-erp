/**
 * 🔬 Performance Profiling System
 *
 * CPU, memory, and GC profiling
 * - Function-level profiling
 * - Memory allocation tracking
 * - Garbage collection analysis
 * - Performance bottleneck detection
 */

const v8 = require('v8');

class PerformanceProfiler {
  constructor(options = {}) {
    this.profileInterval = options.profileInterval || 1000; // 1 second
    this.maxProfiles = options.maxProfiles || 1000;
    this.profiles = [];
    this.functionMetrics = new Map();
    this.memorySnapshots = [];
    this.gcEvents = [];
    this.startTime = Date.now();
    this.isRunning = false;
    this.profiling = null;
  }

  /**
   * Start profiling
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    // Start periodic profiling
    this.profiling = setInterval(() => {
      this._captureProfile();
    }, this.profileInterval);

    // Hook into GC if possible
    try {
      if (global.gc) {
        this._setupGCTracking();
      }
    } catch (e) {
      console.log('[Profiler] GC tracking not available');
    }
  }

  /**
   * Stop profiling
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.profiling) {
      clearInterval(this.profiling);
      this.profiling = null;
    }
  }

  /**
   * Capture current profile
   */
  _captureProfile() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const profile = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers || 0,
      },
      cpu: {
        user: cpuUsage.user / 1000000, // Convert to seconds
        system: cpuUsage.system / 1000000,
      },
      uptime: process.uptime(),
    };

    this.profiles.push(profile);

    // Enforce max profiles
    if (this.profiles.length > this.maxProfiles) {
      this.profiles.shift();
    }

    return profile;
  }

  /**
   * Wrap function for profiling
   */
  profileFunction(fn, name = fn.name) {
    const self = this;

    return function (...args) {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage().heapUsed;

      let result;
      let error = null;

      try {
        result = fn.apply(this, args);
      } catch (e) {
        error = e;
      }

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;

      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      const memDelta = endMemory - startMemory;

      self._recordFunctionMetric(name, {
        duration,
        memoryDelta: memDelta,
        error: error ? error.message : null,
      });

      if (error) throw error;
      return result;
    };
  }

  /**
   * Wrap async function for profiling
   */
  profileAsyncFunction(fn, name = fn.name) {
    const self = this;

    return async function (...args) {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage().heapUsed;

      let result;
      let error = null;

      try {
        result = await fn.apply(this, args);
      } catch (e) {
        error = e;
      }

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;

      const duration = Number(endTime - startTime) / 1000000;
      const memDelta = endMemory - startMemory;

      self._recordFunctionMetric(name, {
        duration,
        memoryDelta: memDelta,
        error: error ? error.message : null,
      });

      if (error) throw error;
      return result;
    };
  }

  /**
   * Record function metric
   */
  _recordFunctionMetric(name, metric) {
    if (!this.functionMetrics.has(name)) {
      this.functionMetrics.set(name, {
        name,
        calls: 0,
        duration: { sum: 0, min: Infinity, max: 0, values: [] },
        memory: { sum: 0, min: Infinity, max: 0, values: [] },
        errors: 0,
      });
    }

    const fnMetric = this.functionMetrics.get(name);
    fnMetric.calls += 1;

    // Duration metrics
    fnMetric.duration.sum += metric.duration;
    fnMetric.duration.min = Math.min(fnMetric.duration.min, metric.duration);
    fnMetric.duration.max = Math.max(fnMetric.duration.max, metric.duration);
    fnMetric.duration.values.push(metric.duration);
    if (fnMetric.duration.values.length > 1000) fnMetric.duration.values.shift();

    // Memory metrics
    fnMetric.memory.sum += metric.memoryDelta;
    fnMetric.memory.min = Math.min(fnMetric.memory.min, metric.memoryDelta);
    fnMetric.memory.max = Math.max(fnMetric.memory.max, metric.memoryDelta);
    fnMetric.memory.values.push(metric.memoryDelta);
    if (fnMetric.memory.values.length > 1000) fnMetric.memory.values.shift();

    // Error tracking
    if (metric.error) fnMetric.errors += 1;
  }

  /**
   * Setup GC tracking
   */
  _setupGCTracking() {
    if (!global.gc) return;

    const originalGc = global.gc;
    const self = this;

    global.gc = function (...args) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      originalGc.call(this, ...args);

      const duration = Date.now() - startTime;
      const memFreed = startMemory - process.memoryUsage().heapUsed;

      self.gcEvents.push({
        timestamp: Date.now(),
        duration,
        memoryFreed: memFreed,
      });

      if (self.gcEvents.length > 1000) {
        self.gcEvents.shift();
      }
    };
  }

  /**
   * Take heap snapshot
   */
  takeHeapSnapshot() {
    const snapshot = v8.writeHeapSnapshot();
    this.memorySnapshots.push({
      timestamp: Date.now(),
      filename: snapshot,
    });
    return snapshot;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (this.profiles.length === 0) return null;

    const latestProfile = this.profiles[this.profiles.length - 1];
    const avgMemory =
      this.profiles.reduce((sum, p) => sum + p.memory.heapUsed, 0) / this.profiles.length;
    const maxMemory = Math.max(...this.profiles.map(p => p.memory.heapUsed));
    const minMemory = Math.min(...this.profiles.map(p => p.memory.heapUsed));

    return {
      current: latestProfile.memory,
      average: {
        heapUsed: avgMemory,
      },
      peak: {
        heapUsed: maxMemory,
      },
      minimum: {
        heapUsed: minMemory,
      },
    };
  }

  /**
   * Get CPU statistics
   */
  getCpuStats() {
    if (this.profiles.length === 0) return null;

    const totalCpu = this.profiles.reduce(
      (sum, p) => ({
        user: sum.user + p.cpu.user,
        system: sum.system + p.cpu.system,
      }),
      { user: 0, system: 0 }
    );

    return {
      totalUser: totalCpu.user,
      totalSystem: totalCpu.system,
      avgUser: totalCpu.user / this.profiles.length,
      avgSystem: totalCpu.system / this.profiles.length,
    };
  }

  /**
   * Get function metrics sorted by duration
   */
  getSlowFunctions(limit = 10) {
    const metrics = Array.from(this.functionMetrics.values());
    return metrics
      .sort((a, b) => b.duration.sum / b.calls - a.duration.sum / a.calls)
      .slice(0, limit)
      .map(m => ({
        name: m.name,
        calls: m.calls,
        avgDuration: m.duration.sum / m.calls,
        maxDuration: m.duration.max,
        minDuration: m.duration.min,
        totalDuration: m.duration.sum,
        errors: m.errors,
      }));
  }

  /**
   * Get memory-heavy functions
   */
  getMemoryHeavyFunctions(limit = 10) {
    const metrics = Array.from(this.functionMetrics.values());
    return metrics
      .sort((a, b) => Math.abs(b.memory.sum) - Math.abs(a.memory.sum))
      .slice(0, limit)
      .map(m => ({
        name: m.name,
        calls: m.calls,
        avgMemory: m.memory.sum / m.calls,
        maxMemory: m.memory.max,
        minMemory: m.memory.min,
        totalMemory: m.memory.sum,
      }));
  }

  /**
   * Get GC statistics
   */
  getGcStats() {
    if (this.gcEvents.length === 0) return null;

    const totalDuration = this.gcEvents.reduce((sum, e) => sum + e.duration, 0);
    const totalMemFreed = this.gcEvents.reduce((sum, e) => sum + e.memoryFreed, 0);

    return {
      totalCollections: this.gcEvents.length,
      totalDuration,
      avgDuration: totalDuration / this.gcEvents.length,
      maxDuration: Math.max(...this.gcEvents.map(e => e.duration)),
      totalMemoryFreed: totalMemFreed,
      avgMemoryFreed: totalMemFreed / this.gcEvents.length,
    };
  }

  /**
   * Get profile summary
   */
  getSummary() {
    return {
      uptime: process.uptime(),
      profiles: this.profiles.length,
      memory: this.getMemoryStats(),
      cpu: this.getCpuStats(),
      gc: this.getGcStats(),
      functionCount: this.functionMetrics.size,
      slowFunctions: this.getSlowFunctions(5),
      memoryHeavyFunctions: this.getMemoryHeavyFunctions(5),
    };
  }

  /**
   * Clear all profile data
   */
  clear() {
    this.profiles = [];
    this.functionMetrics.clear();
    this.memorySnapshots = [];
    this.gcEvents = [];
  }
}

module.exports = { PerformanceProfiler };
