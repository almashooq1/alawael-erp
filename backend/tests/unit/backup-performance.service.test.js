/**
 * Unit Tests — BackupPerformanceService (PerformanceOptimization)
 * P#68 - Batch 29
 *
 * Singleton (EventEmitter + crypto + os + fs + logger). Mock fs + logger.
 * Covers: detectBottlenecks, autoOptimize, shouldOptimize,
 *         generatePerformanceReport, generateOptimizationRecommendations,
 *         getCurrentUtilization, calculateHealthStatus, getMemoryMetrics,
 *         getProcessMetrics, estimateCPUUsage, shutdown
 */

'use strict';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('BackupPerformanceService', () => {
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      service = require('../../services/backup-performance.service');
    });
  });

  afterEach(() => {
    if (service && service.shutdown) service.shutdown();
    jest.useRealTimers();
  });

  /* helper: build a metrics object matching monitorPerformance shape */
  function mkMetrics(overrides = {}) {
    return {
      timestamp: overrides.timestamp || new Date(),
      cpu: { cores: 4, model: 'Test', usage: overrides.cpuUsage ?? 30 },
      memory: {
        total: '16000.00',
        used: '8000.00',
        free: '8000.00',
        usagePercent: String(overrides.memUsage ?? 50),
      },
      disk: {
        total: 500,
        used: 350,
        free: 150,
        usagePercent: overrides.diskUsage ?? 70,
        ioWait: overrides.ioWait ?? 15,
        readSpeed: 250,
        writeSpeed: 200,
      },
      process: { uptime: 10, memoryHeap: '50.00', memoryRss: '100.00', cpuUsage: {} },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty arrays', () => {
      expect(service.performanceMetrics).toEqual([]);
      expect(service.optimizationHistory).toEqual([]);
      expect(service.bottlenecks).toEqual([]);
    });

    it('has default config', () => {
      expect(service.dataPath).toBe('./data/performance');
      expect(service.optimizationThreshold).toBe(0.7);
    });

    it('has resourceAllocation with cpu/memory/disk/bandwidth', () => {
      expect(service.resourceAllocation.cpu).toBeDefined();
      expect(service.resourceAllocation.memory).toBeDefined();
      expect(service.resourceAllocation.disk).toBeDefined();
      expect(service.resourceAllocation.bandwidth).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  detectBottlenecks                                                   */
  /* ------------------------------------------------------------------ */
  describe('detectBottlenecks', () => {
    it('detects CPU bottleneck when usage > 80', () => {
      const m = mkMetrics({ cpuUsage: 85 });
      const res = service.detectBottlenecks(m);
      const cpu = res.find(b => b.type === 'CPU');
      expect(cpu).toBeDefined();
      expect(cpu.severity).toBe('WARNING');
    });

    it('CRITICAL CPU at > 95', () => {
      const m = mkMetrics({ cpuUsage: 96 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'CPU').severity).toBe('CRITICAL');
    });

    it('detects MEMORY bottleneck when usagePercent > 85', () => {
      const m = mkMetrics({ memUsage: 90 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'MEMORY')).toBeDefined();
    });

    it('CRITICAL MEMORY at > 95', () => {
      const m = mkMetrics({ memUsage: 96 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'MEMORY').severity).toBe('CRITICAL');
    });

    it('detects DISK bottleneck when usagePercent > 90', () => {
      const m = mkMetrics({ diskUsage: 95 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'DISK')).toBeDefined();
    });

    it('CRITICAL DISK at > 98', () => {
      const m = mkMetrics({ diskUsage: 99 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'DISK').severity).toBe('CRITICAL');
    });

    it('detects IO bottleneck when ioWait > 30', () => {
      const m = mkMetrics({ ioWait: 40 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'IO')).toBeDefined();
    });

    it('CRITICAL IO at > 50', () => {
      const m = mkMetrics({ ioWait: 55 });
      const res = service.detectBottlenecks(m);
      expect(res.find(b => b.type === 'IO').severity).toBe('CRITICAL');
    });

    it('returns empty when all within limits', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 50, ioWait: 10 });
      expect(service.detectBottlenecks(m)).toEqual([]);
    });

    it('detects multiple bottlenecks simultaneously', () => {
      const m = mkMetrics({ cpuUsage: 96, memUsage: 96, diskUsage: 99, ioWait: 55 });
      expect(service.detectBottlenecks(m)).toHaveLength(4);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  autoOptimize (async)                                                */
  /* ------------------------------------------------------------------ */
  describe('autoOptimize', () => {
    it('adds CPU_OPTIMIZATION when cpu > threshold*100', async () => {
      const m = mkMetrics({ cpuUsage: 80, memUsage: 50, diskUsage: 50, ioWait: 10 });
      const res = await service.autoOptimize(m);
      const cpuOpt = res.actions.find(a => a.type === 'CPU_OPTIMIZATION');
      expect(cpuOpt).toBeDefined();
    });

    it('adds MEMORY_OPTIMIZATION when memory > threshold*100', async () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 80, diskUsage: 50, ioWait: 10 });
      const res = await service.autoOptimize(m);
      const memOpt = res.actions.find(a => a.type === 'MEMORY_OPTIMIZATION');
      expect(memOpt).toBeDefined();
    });

    it('adds DISK_OPTIMIZATION when disk > threshold*100', async () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 80, ioWait: 10 });
      const res = await service.autoOptimize(m);
      const diskOpt = res.actions.find(a => a.type === 'DISK_OPTIMIZATION');
      expect(diskOpt).toBeDefined();
    });

    it('adds IO_OPTIMIZATION when ioWait > 30', async () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 50, ioWait: 40 });
      const res = await service.autoOptimize(m);
      const ioOpt = res.actions.find(a => a.type === 'IO_OPTIMIZATION');
      expect(ioOpt).toBeDefined();
    });

    it('returns optimization with id, timestamp, actions', async () => {
      const m = mkMetrics({ cpuUsage: 80 });
      const res = await service.autoOptimize(m);
      expect(res.id).toMatch(/^opt-/);
      expect(res.timestamp).toBeDefined();
      expect(Array.isArray(res.actions)).toBe(true);
    });

    it('stores optimization in history', async () => {
      const m = mkMetrics({ cpuUsage: 80 });
      await service.autoOptimize(m);
      expect(service.optimizationHistory).toHaveLength(1);
    });

    it('emits performance:optimization-applied', async () => {
      const spy = jest.fn();
      service.on('performance:optimization-applied', spy);
      const m = mkMetrics({ cpuUsage: 80 });
      await service.autoOptimize(m);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('returns empty actions when nothing to optimize', async () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 50, ioWait: 10 });
      const res = await service.autoOptimize(m);
      expect(res.actions).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  shouldOptimize                                                      */
  /* ------------------------------------------------------------------ */
  describe('shouldOptimize', () => {
    it('returns true when CPU exceeds threshold*100', () => {
      const m = mkMetrics({ cpuUsage: 80, memUsage: 50, diskUsage: 50 });
      expect(service.shouldOptimize(m)).toBe(true);
    });

    it('returns true when memory exceeds threshold*100', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 80, diskUsage: 50 });
      expect(service.shouldOptimize(m)).toBe(true);
    });

    it('returns true when disk exceeds threshold*100', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 80 });
      expect(service.shouldOptimize(m)).toBe(true);
    });

    it('returns false when all below threshold', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 50 });
      expect(service.shouldOptimize(m)).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateHealthStatus                                               */
  /* ------------------------------------------------------------------ */
  describe('calculateHealthStatus', () => {
    it('returns HEALTHY for good metrics', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 50 });
      const res = service.calculateHealthStatus(m);
      expect(res.status).toBe('HEALTHY');
      expect(res.score).toBe(100);
    });

    it('penalizes high CPU (>80 → -20)', () => {
      const m = mkMetrics({ cpuUsage: 85, memUsage: 50, diskUsage: 50 });
      const res = service.calculateHealthStatus(m);
      expect(res.score).toBe(80);
    });

    it('penalizes high memory (>85 → -20)', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 90, diskUsage: 50 });
      const res = service.calculateHealthStatus(m);
      expect(res.score).toBe(80);
    });

    it('penalizes high disk (>90 → -30)', () => {
      const m = mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 95 });
      const res = service.calculateHealthStatus(m);
      expect(res.score).toBe(70);
    });

    it('returns WARNING when score 50-69', () => {
      const m = mkMetrics({ cpuUsage: 85, memUsage: 90, diskUsage: 50 });
      const res = service.calculateHealthStatus(m);
      expect(res.score).toBe(60);
      expect(res.status).toBe('WARNING');
    });

    it('returns CRITICAL when score < 50', () => {
      const m = mkMetrics({ cpuUsage: 85, memUsage: 90, diskUsage: 95 });
      const res = service.calculateHealthStatus(m);
      expect(res.score).toBe(30);
      expect(res.status).toBe('CRITICAL');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generatePerformanceReport                                           */
  /* ------------------------------------------------------------------ */
  describe('generatePerformanceReport', () => {
    it('returns error when no metrics', () => {
      const res = service.generatePerformanceReport(24);
      expect(res.error).toBeDefined();
    });

    it('defaults to 24 hours', () => {
      service.performanceMetrics.push(mkMetrics());
      const res = service.generatePerformanceReport();
      expect(res.timeWindow).toBe('24 hours');
    });

    it('includes summary with avg and peak values', () => {
      service.performanceMetrics.push(
        mkMetrics({ cpuUsage: 50, memUsage: 60, diskUsage: 70 }),
        mkMetrics({ cpuUsage: 80, memUsage: 40, diskUsage: 50 })
      );
      const res = service.generatePerformanceReport();
      expect(res.summary.avgCPUUsage).toBeDefined();
      expect(res.summary.peakCPUUsage).toBeDefined();
      expect(res.summary.avgMemoryUsage).toBeDefined();
      expect(res.summary.peakMemoryUsage).toBeDefined();
      expect(res.summary.avgDiskUsage).toBeDefined();
      expect(res.summary.peakDiskUsage).toBeDefined();
    });

    it('includes bottlenecks and recommendations', () => {
      service.performanceMetrics.push(mkMetrics());
      const res = service.generatePerformanceReport();
      expect(res.bottlenecks).toBeDefined();
      expect(res.recommendations).toBeDefined();
      expect(res.resourceAllocation).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateOptimizationRecommendations                                 */
  /* ------------------------------------------------------------------ */
  describe('generateOptimizationRecommendations', () => {
    it('recommends CPU when avgCPU > 70', () => {
      const metrics = [mkMetrics({ cpuUsage: 80, memUsage: 50, diskUsage: 50 })];
      const res = service.generateOptimizationRecommendations(metrics);
      expect(res.find(r => r.area === 'CPU')).toBeDefined();
    });

    it('recommends MEMORY when avgMemory > 75', () => {
      const metrics = [mkMetrics({ cpuUsage: 50, memUsage: 80, diskUsage: 50 })];
      const res = service.generateOptimizationRecommendations(metrics);
      expect(res.find(r => r.area === 'MEMORY')).toBeDefined();
    });

    it('recommends DISK_SPACE when avgDisk > 80', () => {
      const metrics = [mkMetrics({ cpuUsage: 50, memUsage: 50, diskUsage: 90 })];
      const res = service.generateOptimizationRecommendations(metrics);
      expect(res.find(r => r.area === 'DISK_SPACE')).toBeDefined();
    });

    it('returns empty for healthy metrics', () => {
      const metrics = [mkMetrics({ cpuUsage: 30, memUsage: 30, diskUsage: 30 })];
      expect(service.generateOptimizationRecommendations(metrics)).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getCurrentUtilization                                               */
  /* ------------------------------------------------------------------ */
  describe('getCurrentUtilization', () => {
    it('returns error when no metrics yet', () => {
      const res = service.getCurrentUtilization();
      expect(res.error).toBeDefined();
    });

    it('returns cpu, memory, disk, healthStatus when metrics exist', () => {
      service.performanceMetrics.push(mkMetrics());
      const res = service.getCurrentUtilization();
      expect(res.cpu).toBeDefined();
      expect(res.memory).toBeDefined();
      expect(res.disk).toBeDefined();
      expect(res.healthStatus).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getMemoryMetrics                                                    */
  /* ------------------------------------------------------------------ */
  describe('getMemoryMetrics', () => {
    it('returns total, used, free, usagePercent', () => {
      const res = service.getMemoryMetrics();
      expect(res.total).toBeDefined();
      expect(res.used).toBeDefined();
      expect(res.free).toBeDefined();
      expect(res.usagePercent).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getProcessMetrics                                                   */
  /* ------------------------------------------------------------------ */
  describe('getProcessMetrics', () => {
    it('returns uptime, memoryHeap, memoryRss, cpuUsage', () => {
      const res = service.getProcessMetrics();
      expect(res.uptime).toBeDefined();
      expect(res.memoryHeap).toBeDefined();
      expect(res.memoryRss).toBeDefined();
      expect(res.cpuUsage).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  estimateCPUUsage                                                    */
  /* ------------------------------------------------------------------ */
  describe('estimateCPUUsage', () => {
    it('returns a number 0-100', () => {
      const res = service.estimateCPUUsage();
      expect(typeof res).toBe('number');
      expect(res).toBeGreaterThanOrEqual(0);
      expect(res).toBeLessThanOrEqual(100);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  shutdown                                                            */
  /* ------------------------------------------------------------------ */
  describe('shutdown', () => {
    it('clears monitor interval without error', () => {
      expect(() => service.shutdown()).not.toThrow();
    });

    it('sets _monitorInterval to null', () => {
      service.shutdown();
      expect(service._monitorInterval).toBeNull();
    });

    it('safe to call multiple times', () => {
      service.shutdown();
      service.shutdown();
      expect(service._monitorInterval).toBeNull();
    });
  });
});
