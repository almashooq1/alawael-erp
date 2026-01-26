const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const AuditLogger = require('../services/audit-logger');

/**
 * Get all active sessions for current user
 * @route GET /api/sessions
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.getActiveSessions(req.userId);

    res.json({
      success: true,
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s._id,
        device: s.device,
        ipAddress: s.ipAddress,
        location: s.location,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.token === req.headers['authorization']?.split(' ')[1],
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      message: error.message,
    });
  }
});

/**
 * Get session statistics for current user
 * @route GET /api/sessions/stats
 * @access Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const activeSessions = await Session.getActiveSessions(req.userId);
    const allSessions = await Session.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    // Calculate login history
    const last24h = allSessions.filter(s => {
      const hoursSince = (Date.now() - s.createdAt) / (1000 * 60 * 60);
      return hoursSince <= 24;
    }).length;

    const last7days = allSessions.filter(s => {
      const daysSince = (Date.now() - s.createdAt) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    }).length;

    // Unique devices
    const uniqueDevices = [...new Set(allSessions.map(s => s.device))];

    // Unique locations
    const uniqueLocations = [...new Set(allSessions.filter(s => s.location).map(s => s.location))];

    res.json({
      success: true,
      stats: {
        activeSessions: activeSessions.length,
        totalSessions: allSessions.length,
        loginsLast24h: last24h,
        loginsLast7days: last7days,
        uniqueDevices: uniqueDevices.length,
        uniqueLocations: uniqueLocations.length,
        devices: uniqueDevices,
        recentLocations: uniqueLocations.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error.message,
    });
  }
});

/**
 * Terminate a specific session
 * @route DELETE /api/sessions/:sessionId
 * @access Private
 */
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Users can only terminate their own sessions
    if (session.userId.toString() !== req.userId.toString() && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to terminate this session',
      });
    }

    await session.terminate();

    // Log audit event
    await AuditLogger.log({
      action: 'session.terminate',
      userId: req.userId,
      target: { sessionId: session._id },
      metadata: {
        device: session.device,
        ipAddress: session.ipAddress,
      },
    });

    res.json({
      success: true,
      message: 'Session terminated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session',
      message: error.message,
    });
  }
});

/**
 * Terminate all sessions except current one
 * @route POST /api/sessions/terminate-all
 * @access Private
 */
router.post('/terminate-all', authenticateToken, async (req, res) => {
  try {
    const currentToken = req.headers['authorization']?.split(' ')[1];
    const sessions = await Session.find({ userId: req.userId, isActive: true });

    let terminatedCount = 0;
    for (const session of sessions) {
      if (session.token !== currentToken) {
        await session.terminate();
        terminatedCount++;
      }
    }

    // Log audit event
    await AuditLogger.log({
      action: 'session.terminate_all',
      userId: req.userId,
      metadata: {
        terminatedCount,
        keepCurrent: true,
      },
    });

    res.json({
      success: true,
      message: `Terminated ${terminatedCount} sessions`,
      terminatedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to terminate sessions',
      message: error.message,
    });
  }
});

/**
 * Force logout (terminate ALL sessions including current)
 * @route POST /api/sessions/force-logout
 * @access Private
 */
router.post('/force-logout', authenticateToken, async (req, res) => {
  try {
    const result = await Session.terminateAllForUser(req.userId);

    // Log audit event
    await AuditLogger.log({
      action: 'session.force_logout',
      userId: req.userId,
      metadata: {
        terminatedCount: result.terminatedCount,
      },
    });

    res.json({
      success: true,
      message: 'All sessions terminated',
      terminatedCount: result.terminatedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to force logout',
      message: error.message,
    });
  }
});

/**
 * Cleanup expired sessions (Admin only)
 * @route POST /api/sessions/cleanup
 * @access Admin
 */
router.post('/cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await Session.cleanupExpired();

    res.json({
      success: true,
      message: 'Expired sessions cleaned up',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup sessions',
      message: error.message,
    });
  }
});

/**
 * Get all active sessions across all users (Admin only)
 * @route GET /api/sessions/admin/all
 * @access Admin
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const sessions = await Session.find({ isActive: true })
      .populate('userId', 'email username')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Session.countDocuments({ isActive: true });

    res.json({
      success: true,
      count: sessions.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      sessions: sessions.map(s => ({
        id: s._id,
        user: s.userId,
        device: s.device,
        ipAddress: s.ipAddress,
        location: s.location,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      message: error.message,
    });
  }
});

/**
 * Extend current session by N hours
 * @route POST /api/sessions/extend
 * @access Private
 */
router.post('/extend', authenticateToken, async (req, res) => {
  try {
    const currentToken = req.headers['authorization']?.split(' ')[1];
    const session = await Session.findOne({ token: currentToken, isActive: true });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    const hours = parseInt(req.body.hours) || 24;
    const maxHours = 72; // Max 3 days extension

    if (hours > maxHours) {
      return res.status(400).json({
        success: false,
        error: `Cannot extend more than ${maxHours} hours`,
      });
    }

    await session.extend(hours);

    res.json({
      success: true,
      message: `Session extended by ${hours} hours`,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to extend session',
      message: error.message,
    });
  }
});

module.exports = router;
