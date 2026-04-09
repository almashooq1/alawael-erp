'use strict';

/**
 * DDD Session Manager
 * ═══════════════════════════════════════════════════════════════════════
 * Advanced session management with device tracking, concurrent session
 * control, activity monitoring, and forced logout.
 *
 * Features:
 *  - Server-side session state tracking
 *  - Device fingerprinting & management
 *  - Concurrent session limits
 *  - Activity heartbeat & idle detection
 *  - Forced session termination
 *  - Session analytics & history
 *  - Geo-location awareness
 *
 * @module dddSessionManager
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */
const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId },

    /* Device info */
    device: {
      fingerprint: String,
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'api', 'unknown'],
        default: 'unknown',
      },
      os: String,
      browser: String,
      name: String,
    },

    /* Network */
    ip: String,
    geo: {
      country: String,
      city: String,
      lat: Number,
      lng: Number,
    },

    /* Status */
    status: {
      type: String,
      enum: ['active', 'idle', 'expired', 'terminated', 'locked'],
      default: 'active',
      index: true,
    },

    /* Timing */
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    idleTimeoutMinutes: { type: Number, default: 30 },
    absoluteTimeoutHours: { type: Number, default: 12 },

    /* Token tracking */
    tokenHash: String,
    refreshTokenHash: String,

    /* Termination */
    terminatedAt: Date,
    terminatedBy: { type: mongoose.Schema.Types.ObjectId },
    terminationReason: String,

    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ 'device.fingerprint': 1, userId: 1 });

const DDDSession = mongoose.models.DDDSession || mongoose.model('DDDSession', sessionSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Session Configuration
   ═══════════════════════════════════════════════════════════════════════ */
const SESSION_DEFAULTS = {
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 12,
  maxConcurrentSessions: 3,
  enableDeviceTracking: true,
  enableGeoTracking: false,
  alertOnNewDevice: true,
  alertOnNewLocation: true,
};

const DEVICE_TYPES = ['desktop', 'mobile', 'tablet', 'api', 'unknown'];

/* ═══════════════════════════════════════════════════════════════════════
   3. Device Fingerprinting
   ═══════════════════════════════════════════════════════════════════════ */
function generateDeviceFingerprint(req) {
  const parts = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || '',
  ];
  return crypto.createHash('md5').update(parts.join('|')).digest('hex');
}

function parseUserAgent(ua) {
  if (!ua) return { type: 'unknown', os: 'unknown', browser: 'unknown' };

  let type = 'desktop';
  if (/mobile/i.test(ua)) type = 'mobile';
  else if (/tablet|ipad/i.test(ua)) type = 'tablet';

  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';

  return { type, os, browser };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Session Lifecycle
   ═══════════════════════════════════════════════════════════════════════ */
async function createSession(data) {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const idleTimeout = data.idleTimeoutMinutes || SESSION_DEFAULTS.idleTimeoutMinutes;
  const absoluteTimeout = data.absoluteTimeoutHours || SESSION_DEFAULTS.absoluteTimeoutHours;

  const session = await DDDSession.create({
    sessionId,
    userId: data.userId,
    branchId: data.branchId,
    device: data.device || {},
    ip: data.ip,
    geo: data.geo,
    lastActivityAt: now,
    expiresAt: new Date(now.getTime() + absoluteTimeout * 3600000),
    idleTimeoutMinutes: idleTimeout,
    absoluteTimeoutHours: absoluteTimeout,
    tokenHash: data.tokenHash,
    refreshTokenHash: data.refreshTokenHash,
  });

  return session.toObject();
}

async function touchSession(sessionId) {
  const session = await DDDSession.findOne({ sessionId, status: 'active' });
  if (!session) return null;

  const idleExpiry = new Date(
    session.lastActivityAt.getTime() + session.idleTimeoutMinutes * 60000
  );
  if (new Date() > idleExpiry) {
    session.status = 'idle';
    await session.save();
    return session.toObject();
  }

  session.lastActivityAt = new Date();
  await session.save();
  return session.toObject();
}

async function terminateSession(sessionId, terminatedBy, reason = 'manual') {
  return DDDSession.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        status: 'terminated',
        terminatedAt: new Date(),
        terminatedBy,
        terminationReason: reason,
      },
    },
    { new: true }
  ).lean();
}

async function terminateAllUserSessions(userId, exceptSessionId, terminatedBy) {
  const query = { userId, status: 'active' };
  if (exceptSessionId) query.sessionId = { $ne: exceptSessionId };
  const result = await DDDSession.updateMany(query, {
    $set: {
      status: 'terminated',
      terminatedAt: new Date(),
      terminatedBy,
      terminationReason: 'force-logout-all',
    },
  });
  return { terminated: result.modifiedCount };
}

async function getActiveSessions(userId) {
  return DDDSession.find({ userId, status: { $in: ['active', 'idle'] }, isDeleted: { $ne: true } })
    .sort({ lastActivityAt: -1 })
    .lean();
}

async function enforceSessionLimits(userId, maxSessions) {
  const max = maxSessions || SESSION_DEFAULTS.maxConcurrentSessions;
  const activeSessions = await DDDSession.find({ userId, status: 'active' })
    .sort({ lastActivityAt: -1 })
    .lean();

  if (activeSessions.length <= max) return { enforced: false, count: activeSessions.length };

  const toTerminate = activeSessions.slice(max);
  for (const s of toTerminate) {
    await DDDSession.updateOne(
      { _id: s._id },
      {
        $set: {
          status: 'terminated',
          terminatedAt: new Date(),
          terminationReason: 'concurrent-limit',
        },
      }
    );
  }
  return { enforced: true, terminated: toTerminate.length, remaining: max };
}

async function cleanExpiredSessions() {
  const now = new Date();
  const result = await DDDSession.updateMany(
    { status: { $in: ['active', 'idle'] }, expiresAt: { $lt: now } },
    { $set: { status: 'expired' } }
  );
  return { expired: result.modifiedCount };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Session Middleware
   ═══════════════════════════════════════════════════════════════════════ */
function sessionTrackingMiddleware() {
  return async (req, _res, next) => {
    if (req.headers['x-session-id']) {
      const session = await touchSession(req.headers['x-session-id']);
      if (session) req.dddSession = session;
    }
    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Session Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getSessionDashboard() {
  const [total, byStatus, byDevice, recentSessions] = await Promise.all([
    DDDSession.countDocuments({ isDeleted: { $ne: true } }),
    DDDSession.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    DDDSession.aggregate([
      { $match: { isDeleted: { $ne: true }, status: 'active' } },
      { $group: { _id: '$device.type', count: { $sum: 1 } } },
    ]),
    DDDSession.find({ isDeleted: { $ne: true } })
      .sort({ lastActivityAt: -1 })
      .limit(15)
      .select('sessionId userId device.type device.browser ip status lastActivityAt')
      .lean(),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    byDevice: byDevice.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    recentSessions,
    defaults: SESSION_DEFAULTS,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createSessionManagerRouter() {
  const router = Router();

  router.get('/sessions-mgmt/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getSessionDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/sessions-mgmt/active', async (req, res) => {
    try {
      const userId = req.query.userId || req.user?._id;
      if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
      const sessions = await getActiveSessions(userId);
      res.json({ success: true, count: sessions.length, sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/sessions-mgmt/create', async (req, res) => {
    try {
      const ua = parseUserAgent(req.headers['user-agent']);
      const session = await createSession({
        ...req.body,
        userId: req.body.userId || req.user?._id,
        ip: req.ip,
        device: { ...ua, fingerprint: generateDeviceFingerprint(req), name: req.body.deviceName },
      });
      res.status(201).json({ success: true, session });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/sessions-mgmt/:sessionId/terminate', async (req, res) => {
    try {
      const result = await terminateSession(req.params.sessionId, req.user?._id, req.body.reason);
      res.json({ success: true, session: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/sessions-mgmt/terminate-all', async (req, res) => {
    try {
      const userId = req.body.userId || req.user?._id;
      const result = await terminateAllUserSessions(
        userId,
        req.body.exceptSessionId,
        req.user?._id
      );
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/sessions-mgmt/enforce-limits', async (req, res) => {
    try {
      const userId = req.body.userId || req.user?._id;
      const result = await enforceSessionLimits(userId, req.body.maxSessions);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/sessions-mgmt/clean-expired', async (_req, res) => {
    try {
      res.json({ success: true, ...(await cleanExpiredSessions()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDSession,
  SESSION_DEFAULTS,
  DEVICE_TYPES,
  generateDeviceFingerprint,
  parseUserAgent,
  createSession,
  touchSession,
  terminateSession,
  terminateAllUserSessions,
  getActiveSessions,
  enforceSessionLimits,
  cleanExpiredSessions,
  sessionTrackingMiddleware,
  getSessionDashboard,
  createSessionManagerRouter,
};
