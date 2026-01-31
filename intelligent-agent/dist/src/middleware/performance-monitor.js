"use strict";
// Performance Monitoring Module
// Tracks API response times, memory usage, and system health
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = void 0;
const logger_1 = require("../modules/logger");
const os_1 = __importDefault(require("os"));
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 1000;
    }
    // Request timing middleware
    requestTimer() {
        return (req, res, next) => {
            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            // Override res.json to capture response
            const originalJson = res.json.bind(res);
            res.json = function (data) {
                const duration = Date.now() - startTime;
                const endMemory = process.memoryUsage();
                // Record metric
                const metric = {
                    timestamp: new Date().toISOString(),
                    endpoint: req.path,
                    method: req.method,
                    duration,
                    statusCode: res.statusCode,
                    memoryUsage: {
                        rss: endMemory.rss - startMemory.rss,
                        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                        external: endMemory.external - startMemory.external,
                        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
                    },
                };
                PerformanceMonitor.getInstance().addMetric(metric);
                // Log slow requests
                if (duration > 1000) {
                    logger_1.logger.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
                }
                return originalJson(data);
            };
            next();
        };
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    addMetric(metric) {
        this.metrics.push(metric);
        // Keep only last N metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
    }
    getMetrics() {
        return this.metrics;
    }
    getStats() {
        if (this.metrics.length === 0) {
            return { message: 'No metrics available' };
        }
        const durations = this.metrics.map(m => m.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        // Group by endpoint
        const endpointStats = {};
        this.metrics.forEach(m => {
            const key = `${m.method} ${m.endpoint}`;
            if (!endpointStats[key]) {
                endpointStats[key] = { count: 0, avgDuration: 0 };
            }
            endpointStats[key].count++;
            endpointStats[key].avgDuration += m.duration;
        });
        // Calculate averages
        Object.keys(endpointStats).forEach(key => {
            endpointStats[key].avgDuration /= endpointStats[key].count;
            endpointStats[key].avgDuration = Math.round(endpointStats[key].avgDuration);
        });
        return {
            totalRequests: this.metrics.length,
            avgDuration: Math.round(avgDuration),
            maxDuration,
            minDuration,
            endpointStats,
            systemInfo: this.getSystemInfo(),
        };
    }
    getSystemInfo() {
        const memUsage = process.memoryUsage();
        return {
            platform: os_1.default.platform(),
            arch: os_1.default.arch(),
            cpus: os_1.default.cpus().length,
            totalMemory: Math.round(os_1.default.totalmem() / 1024 / 1024),
            freeMemory: Math.round(os_1.default.freemem() / 1024 / 1024),
            uptime: Math.round(os_1.default.uptime()),
            processMemory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            },
        };
    }
    clearMetrics() {
        this.metrics = [];
    }
}
exports.performanceMonitor = PerformanceMonitor.getInstance();
