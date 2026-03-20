/**
 * ═════════════════════════════════════════════════════════════
 * Al-Awael ERP — Log Aggregator Service
 * خدمة تجميع وتحليل السجلات المركزية
 *
 * Features:
 *  - Collect logs from all microservices via HTTP & WebSocket
 *  - Store in MongoDB with TTL auto-cleanup
 *  - Real-time log streaming via WebSocket
 *  - Search & filter logs by service, level, time
 *  - Error rate monitoring & alerting
 *  - Log statistics & dashboards API
 * ═════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer } = require('ws');
const Redis = require('ioredis');
const cron = require('node-cron');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'log-aggregator' },
  transports: [new winston.transports.Console()],
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/logs' });
const PORT = process.env.PORT || 3095;

app.use(express.json({ limit: '5mb' }));

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_logs';

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
});

// ─── Log Entry Schema ────────────────────────────────────────────────────────
const logSchema = new mongoose.Schema(
  {
    service: { type: String, required: true, index: true },
    level: { type: String, enum: ['error', 'warn', 'info', 'debug', 'trace'], index: true },
    message: { type: String, required: true },
    meta: mongoose.Schema.Types.Mixed,
    traceId: { type: String, index: true },
    userId: { type: String, index: true },
    requestId: { type: String },
    ip: String,
    userAgent: String,
    duration: Number,
    statusCode: Number,
    method: String,
    path: String,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    // Auto-delete logs after 90 days
    expireAfterSeconds: 90 * 24 * 60 * 60,
  },
);

logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
logSchema.index({ service: 1, level: 1, timestamp: -1 });
logSchema.index({ message: 'text' });

const LogEntry = mongoose.model('LogEntry', logSchema);

// ─── Redis for rate tracking ─────────────────────────────────────────────────
let redis;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
} catch (e) {
  logger.warn('Redis not available, operating without cache');
}

// ─── WebSocket — Real-time log streaming ─────────────────────────────────────
const wsClients = new Set();

wss.on('connection', (ws, req) => {
  const filters = {};
  ws.filters = filters;
  wsClients.add(ws);
  logger.info(`WebSocket client connected (${wsClients.size} total)`);

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      // Allow clients to set filters
      if (msg.type === 'filter') {
        ws.filters = msg.filters || {};
      }
    } catch (e) {
      /* ignore */
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });
});

function broadcastLog(logEntry) {
  const data = JSON.stringify(logEntry);
  for (const client of wsClients) {
    if (client.readyState !== 1) continue;
    // Apply filters
    const f = client.filters || {};
    if (f.service && f.service !== logEntry.service) continue;
    if (f.level && f.level !== logEntry.level) continue;
    client.send(data);
  }
}

// ─── Ingest endpoint — Collect logs from services ────────────────────────────
app.post('/api/logs', async (req, res) => {
  try {
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    const docs = entries.map(e => ({
      service: e.service || 'unknown',
      level: e.level || 'info',
      message: e.message || '',
      meta: e.meta,
      traceId: e.traceId,
      userId: e.userId,
      requestId: e.requestId,
      ip: e.ip || req.ip,
      userAgent: e.userAgent,
      duration: e.duration,
      statusCode: e.statusCode,
      method: e.method,
      path: e.path,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

    await LogEntry.insertMany(docs, { ordered: false });

    // Track error rates in Redis
    for (const doc of docs) {
      broadcastLog(doc);
      if (redis && doc.level === 'error') {
        const key = `errors:${doc.service}:${new Date().toISOString().slice(0, 13)}`;
        await redis.incr(key);
        await redis.expire(key, 86400);
      }
    }

    res.status(201).json({ received: docs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Search logs ─────────────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const { service, level, search, from, to, traceId, userId, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (service) filter.service = service;
    if (level) filter.level = level;
    if (traceId) filter.traceId = traceId;
    if (userId) filter.userId = userId;
    if (search) filter.$text = { $search: search };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      LogEntry.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      LogEntry.countDocuments(filter),
    ]);

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Statistics ──────────────────────────────────────────────────────────────
app.get('/api/logs/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '24');
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [byService, byLevel, totalCount, errorRate] = await Promise.all([
      LogEntry.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      LogEntry.aggregate([{ $match: { timestamp: { $gte: since } } }, { $group: { _id: '$level', count: { $sum: 1 } } }]),
      LogEntry.countDocuments({ timestamp: { $gte: since } }),
      LogEntry.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              service: '$service',
              hour: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } },
            },
            total: { $sum: 1 },
            errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.hour': -1 } },
      ]),
    ]);

    res.json({
      period: `${hours}h`,
      totalLogs: totalCount,
      byService: byService.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byLevel: byLevel.reduce((acc, l) => ({ ...acc, [l._id]: l.count }), {}),
      errorRate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Error spike detection ───────────────────────────────────────────────────
app.get('/api/logs/alerts', async (req, res) => {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000); // last hour
    const errors = await LogEntry.aggregate([
      { $match: { level: 'error', timestamp: { $gte: since } } },
      { $group: { _id: '$service', count: { $sum: 1 }, lastError: { $last: '$message' } } },
      { $sort: { count: -1 } },
    ]);

    const alerts = errors
      .filter(e => e.count > 10)
      .map(e => ({
        service: e._id,
        errorCount: e.count,
        severity: e.count > 50 ? 'critical' : e.count > 25 ? 'high' : 'medium',
        lastError: e.lastError,
      }));

    res.json({ alerts, checked: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'log-aggregator',
    version: '1.0.0',
    uptime: process.uptime(),
    websocketClients: wsClients.size,
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ─── Scheduled cleanup of old logs ───────────────────────────────────────────
cron.schedule('0 3 * * *', async () => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await LogEntry.deleteMany({ timestamp: { $lt: cutoff } });
  logger.info(`Cleaned up ${result.deletedCount} old log entries`);
});

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`📋 Log Aggregator running on port ${PORT}`);
  logger.info(`   WebSocket: ws://0.0.0.0:${PORT}/ws/logs`);
});

module.exports = app;
