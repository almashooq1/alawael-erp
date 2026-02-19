/**
 * WebSocket Real-time Updates Service
 * خدمة تحديثات الوقت الفعلي
 *
 * Real-time session updates and notifications
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * WebSocket Service for Real-time Updates
 */
class RealTimeService {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.userConnections = new Map(); // userId -> [socketId]
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[SOCKET] User ${socket.userId} connected: ${socket.id}`);

      // Track user connection
      if (!this.userConnections.has(socket.userId)) {
        this.userConnections.set(socket.userId, []);
      }
      this.userConnections.get(socket.userId).push(socket.id);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Join role-specific room
      socket.join(`role:${socket.userRole}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`[SOCKET] User ${socket.userId} disconnected: ${socket.id}`);
        const connections = this.userConnections.get(socket.userId);
        if (connections) {
          const index = connections.indexOf(socket.id);
          if (index > -1) {
            connections.splice(index, 1);
          }
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`[SOCKET ERROR] ${socket.userId}:`, error);
      });
    });
  }

  /**
   * Emit session scheduled event
   */
  emitSessionScheduled(session) {
    const event = {
      type: 'session:scheduled',
      session: {
        _id: session._id,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        beneficiary: session.beneficiary.name,
        therapist: session.therapist.name,
        room: session.room
      },
      timestamp: new Date()
    };

    // Send to therapist
    this.emitToUser(session.therapist._id, 'session:scheduled', event);

    // Send to patient
    this.emitToUser(session.beneficiary._id, 'session:scheduled', event);

    // Send to supervisors
    if (session.plan?.assignedSupervisor) {
      this.emitToUser(session.plan.assignedSupervisor._id, 'session:scheduled', event);
    }

    // Broadcast to clinic staff
    this.emitToRole('admin', 'session:scheduled', event);
  }

  /**
   * Emit session reminder event
   */
  emitSessionReminder(session, reminderType = '1day') {
    const event = {
      type: 'session:reminder',
      reminderType,
      session: {
        _id: session._id,
        date: session.date,
        startTime: session.startTime,
        therapist: session.therapist.name
      },
      timestamp: new Date()
    };

    this.emitToUser(session.beneficiary._id, 'session:reminder', event);
    this.emitToUser(session.therapist._id, 'session:reminder', event);
  }

  /**
   * Emit session status update
   */
  emitSessionStatusUpdate(session, oldStatus, newStatus) {
    const event = {
      type: 'session:status-updated',
      session: {
        _id: session._id,
        oldStatus,
        newStatus,
        date: session.date
      },
      timestamp: new Date()
    };

    this.emitToUser(session.beneficiary._id, 'session:status-updated', event);
    this.emitToUser(session.therapist._id, 'session:status-updated', event);
    this.emitToRole('admin', 'session:status-updated', event);
  }

  /**
   * Emit documentation submitted event
   */
  emitDocumentationSubmitted(documentation) {
    const event = {
      type: 'documentation:submitted',
      documentation: {
        _id: documentation._id,
        session: documentation.session._id,
        beneficiary: documentation.beneficiary.name,
        therapist: documentation.therapist.name,
        status: 'submitted'
      },
      timestamp: new Date()
    };

    this.emitToRole('supervisor', 'documentation:submitted', event);
    this.emitToRole('admin', 'documentation:submitted', event);
  }

  /**
   * Emit documentation review feedback
   */
  emitDocumentationFeedback(documentation, feedback, reviewedBy) {
    const event = {
      type: 'documentation:reviewed',
      documentation: {
        _id: documentation._id,
        status: feedback.status,
        score: feedback.qualityScore
      },
      feedback: {
        issues: feedback.issues,
        suggestions: feedback.suggestions
      },
      timestamp: new Date()
    };

    this.emitToUser(documentation.therapist._id, 'documentation:reviewed', event);
  }

  /**
   * Emit real-time availability update
   */
  emitAvailabilityUpdate(therapistId, availability) {
    const event = {
      type: 'availability:updated',
      therapist: therapistId,
      availability,
      timestamp: new Date()
    };

    this.emitToRole('admin', 'availability:updated', event);
    this.emitToRole('scheduler', 'availability:updated', event);
  }

  /**
   * Emit attendees list update (who's attending a session)
   */
  emitSessionAttendance(session, attendanceStatus) {
    const event = {
      type: 'session:attendance',
      session: session._id,
      status: attendanceStatus, // 'attended', 'no-show', 'late'
      timestamp: new Date()
    };

    this.emitToUser(session.therapist._id, 'session:attendance', event);
    this.emitToRole('admin', 'session:attendance', event);
  }

  /**
   * Emit performance metrics update
   */
  emitMetricsUpdate(therapistId, metrics) {
    const event = {
      type: 'metrics:updated',
      therapist: therapistId,
      metrics: {
        completionRate: metrics.completionRate,
        averageRating: metrics.averageRating,
        noShowRate: metrics.noShowRate
      },
      timestamp: new Date()
    };

    this.emitToUser(therapistId, 'metrics:updated', event);
    this.emitToRole('admin', 'metrics:updated', event);
  }

  /**
   * Emit chat/messaging event for session coordination
   */
  emitSessionChat(sessionId, from, message) {
    const event = {
      type: 'session:chat',
      sessionId,
      from,
      message,
      timestamp: new Date()
    };

    this.io.to(`session:${sessionId}`).emit('session:message', event);
  }

  /**
   * Emit live session progress update
   */
  emitLiveSessionUpdate(sessionId, progress) {
    const event = {
      type: 'session:live-update',
      sessionId,
      progress,
      timestamp: new Date()
    };

    this.io.to(`session:${sessionId}`).emit('session:live-update', event);
  }

  /**
   * Helper: Emit to specific user
   */
  emitToUser(userId, event, data) {
    const socketIds = this.userConnections.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Helper: Emit to role
   */
  emitToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  /**
   * Helper: Emit to all connected clients
   */
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    const onlineUsers = [];
    this.userConnections.forEach((socketIds, userId) => {
      if (socketIds.length > 0) {
        onlineUsers.push(userId);
      }
    });
    return onlineUsers;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    const socketIds = this.userConnections.get(userId);
    return socketIds && socketIds.length > 0;
  }
}

module.exports = RealTimeService;

/**
 * FRONTEND INTEGRATION EXAMPLE
 *
 * import io from 'socket.io-client';
 *
 * const socket = io('http://localhost:3001', {
 *   auth: {
 *     token: authToken
 *   }
 * });
 *
 * // Listen for session scheduled
 * socket.on('session:scheduled', (event) => {
 *   console.log('Session scheduled:', event.session);
 *   // Update UI
 * });
 *
 * // Listen for session reminder
 * socket.on('session:reminder', (event) => {
 *   console.log('Session reminder:', event.session);
 *   // Show notification
 * });
 *
 * // Listen for documentation feedback
 * socket.on('documentation:reviewed', (event) => {
 *   console.log('Documentation reviewed:', event);
 *   // Show feedback to therapist
 * });
 *
 * // Listen for live session updates
 * socket.on('session:live-update', (event) => {
 *   console.log('Session progress:', event.progress);
 *   // Update dashboard in real-time
 * });
 */
