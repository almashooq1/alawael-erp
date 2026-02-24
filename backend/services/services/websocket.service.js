/**
 * WebSocket Service for Real-time Updates
 * Handles real-time communication for vehicles, trips, and tracking
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');

class WebSocketService {
  constructor() {
    this.io = null;
    this.activeConnections = new Map();
    this.vehicleSubscriptions = new Map();
    this.tripSubscriptions = new Map();
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3002',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Middleware for authentication
    this.io.use(this.authenticateSocket.bind(this));

    // Connection handler
    this.io.on('connection', this.handleConnection.bind(this));

    console.log('✅ WebSocket service initialized');
  }

  /**
   * Authenticate socket connections
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    console.log(`🔌 Client connected: ${socket.id} (User: ${socket.userId})`);

    // Store connection
    this.activeConnections.set(socket.id, {
      userId: socket.userId,
      userRole: socket.userRole,
      connectedAt: new Date(),
    });

    // Register event handlers
    this.registerVehicleHandlers(socket);
    this.registerTripHandlers(socket);
    this.registerTrackingHandlers(socket);
    this.registerNotificationHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      message: 'Connected to real-time server',
      timestamp: new Date(),
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    // Clean up subscriptions
    this.vehicleSubscriptions.delete(socket.id);
    this.tripSubscriptions.delete(socket.id);
    this.activeConnections.delete(socket.id);
  }

  /**
   * Register vehicle-related event handlers
   */
  registerVehicleHandlers(socket) {
    // Subscribe to vehicle updates
    socket.on('subscribe:vehicle', async vehicleId => {
      try {
        // Verify vehicle exists
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
          return socket.emit('error', { message: 'Vehicle not found' });
        }

        // Add to subscriptions
        if (!this.vehicleSubscriptions.has(socket.id)) {
          this.vehicleSubscriptions.set(socket.id, new Set());
        }
        this.vehicleSubscriptions.get(socket.id).add(vehicleId);

        // Join room
        socket.join(`vehicle:${vehicleId}`);

        socket.emit('subscribed:vehicle', {
          vehicleId,
          message: 'Subscribed to vehicle updates',
        });

        console.log(`📡 Socket ${socket.id} subscribed to vehicle ${vehicleId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to subscribe to vehicle' });
      }
    });

    // Unsubscribe from vehicle updates
    socket.on('unsubscribe:vehicle', vehicleId => {
      if (this.vehicleSubscriptions.has(socket.id)) {
        this.vehicleSubscriptions.get(socket.id).delete(vehicleId);
      }
      socket.leave(`vehicle:${vehicleId}`);
      socket.emit('unsubscribed:vehicle', { vehicleId });
    });

    // Request current vehicle status
    socket.on('request:vehicle-status', async vehicleId => {
      try {
        const vehicle = await Vehicle.findById(vehicleId).populate('driver', 'name email').lean();

        if (!vehicle) {
          return socket.emit('error', { message: 'Vehicle not found' });
        }

        socket.emit('vehicle:status', vehicle);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch vehicle status' });
      }
    });
  }

  /**
   * Register trip-related event handlers
   */
  registerTripHandlers(socket) {
    // Subscribe to trip updates
    socket.on('subscribe:trip', async tripId => {
      try {
        const trip = await Trip.findById(tripId);
        if (!trip) {
          return socket.emit('error', { message: 'Trip not found' });
        }

        if (!this.tripSubscriptions.has(socket.id)) {
          this.tripSubscriptions.set(socket.id, new Set());
        }
        this.tripSubscriptions.get(socket.id).add(tripId);

        socket.join(`trip:${tripId}`);
        socket.emit('subscribed:trip', { tripId });

        console.log(`📡 Socket ${socket.id} subscribed to trip ${tripId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to subscribe to trip' });
      }
    });

    // Unsubscribe from trip updates
    socket.on('unsubscribe:trip', tripId => {
      if (this.tripSubscriptions.has(socket.id)) {
        this.tripSubscriptions.get(socket.id).delete(tripId);
      }
      socket.leave(`trip:${tripId}`);
      socket.emit('unsubscribed:trip', { tripId });
    });

    // Request current trip status
    socket.on('request:trip-status', async tripId => {
      try {
        const trip = await Trip.findById(tripId)
          .populate('route')
          .populate('vehicle')
          .populate('driver', 'name email')
          .lean();

        if (!trip) {
          return socket.emit('error', { message: 'Trip not found' });
        }

        socket.emit('trip:status', trip);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch trip status' });
      }
    });
  }

  /**
   * Register GPS tracking handlers
   */
  registerTrackingHandlers(socket) {
    // Subscribe to all vehicles tracking
    socket.on('subscribe:tracking', () => {
      socket.join('tracking:all');
      socket.emit('subscribed:tracking', { message: 'Subscribed to all vehicle tracking' });
    });

    // Unsubscribe from tracking
    socket.on('unsubscribe:tracking', () => {
      socket.leave('tracking:all');
      socket.emit('unsubscribed:tracking', { message: 'Unsubscribed from tracking' });
    });

    // Request all active vehicles
    socket.on('request:active-vehicles', async () => {
      try {
        const vehicles = await Vehicle.find({ status: 'active' })
          .select('plateNumber type currentLocation currentSpeed status')
          .lean();

        socket.emit('active-vehicles', vehicles);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch active vehicles' });
      }
    });
  }

  /**
   * Emit vehicle update to subscribed clients
   */
  emitVehicleUpdate(vehicleId, updateData) {
    if (!this.io) return;

    this.io.to(`vehicle:${vehicleId}`).emit('vehicle:updated', {
      vehicleId,
      data: updateData,
      timestamp: new Date(),
    });

    console.log(`📤 Emitted vehicle update for ${vehicleId}`);
  }

  /**
   * Emit GPS location update
   */
  emitGPSUpdate(vehicleId, locationData) {
    if (!this.io) return;

    // Emit to vehicle subscribers
    this.io.to(`vehicle:${vehicleId}`).emit('vehicle:location', {
      vehicleId,
      location: locationData,
      timestamp: new Date(),
    });

    // Emit to tracking subscribers
    this.io.to('tracking:all').emit('tracking:update', {
      vehicleId,
      location: locationData,
      timestamp: new Date(),
    });

    console.log(`📍 Emitted GPS update for vehicle ${vehicleId}`);
  }

  /**
   * Emit trip status update
   */
  emitTripUpdate(tripId, updateData) {
    if (!this.io) return;

    this.io.to(`trip:${tripId}`).emit('trip:updated', {
      tripId,
      data: updateData,
      timestamp: new Date(),
    });

    console.log(`📤 Emitted trip update for ${tripId}`);
  }

  /**
   * Emit trip started event
   */
  emitTripStarted(tripId, tripData) {
    if (!this.io) return;

    this.io.to(`trip:${tripId}`).emit('trip:started', {
      tripId,
      data: tripData,
      timestamp: new Date(),
    });
  }

  /**
   * Emit trip completed event
   */
  emitTripCompleted(tripId, tripData) {
    if (!this.io) return;

    this.io.to(`trip:${tripId}`).emit('trip:completed', {
      tripId,
      data: tripData,
      timestamp: new Date(),
    });
  }

  /**
   * Emit trip cancelled event
   */
  emitTripCancelled(tripId, reason) {
    if (!this.io) return;

    this.io.to(`trip:${tripId}`).emit('trip:cancelled', {
      tripId,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Emit emergency alert
   */
  emitEmergencyAlert(vehicleId, alertData) {
    if (!this.io) return;

    // Emit to all admin users
    this.io.emit('emergency:alert', {
      vehicleId,
      alert: alertData,
      priority: 'high',
      timestamp: new Date(),
    });

    console.log(`🚨 Emergency alert emitted for vehicle ${vehicleId}`);
  }

  /**
   * Emit low fuel warning
   */
  emitLowFuelWarning(vehicleId, fuelLevel) {
    if (!this.io) return;

    this.io.to(`vehicle:${vehicleId}`).emit('vehicle:low-fuel', {
      vehicleId,
      fuelLevel,
      timestamp: new Date(),
    });

    console.log(`⚠️ Low fuel warning emitted for vehicle ${vehicleId}`);
  }

  /**
   * Broadcast system notification
   */
  broadcastNotification(message, type = 'info') {
    if (!this.io) return;

    this.io.emit('notification', {
      message,
      type,
      timestamp: new Date(),
    });
  }

  /**
   * Get active connections count
   */
  getConnectionsCount() {
    return this.activeConnections.size;
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    return Array.from(this.activeConnections.entries()).map(([socketId, data]) => ({
      socketId,
      ...data,
    }));
  }

  /**
   * Disconnect all clients
   */
  disconnectAll() {
    if (!this.io) return;

    this.io.disconnectSockets();
    this.activeConnections.clear();
    this.vehicleSubscriptions.clear();
    this.tripSubscriptions.clear();
  }

  /**
   * Register notification event handlers
   */
  registerNotificationHandlers(socket) {
    // Join user's notification room
    socket.join(`user:${socket.userId}`);
    console.log(`📢 Socket ${socket.id} joined notification room for user ${socket.userId}`);

    // Request unread count
    socket.on('notification:request-count', async () => {
      try {
        const Notification = require('../models/Notification');
        const count = await Notification.countDocuments({
          userId: socket.userId,
          isRead: false,
        });
        socket.emit('notification:count', { count });
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch notification count' });
      }
    });

    // Mark notification as read
    socket.on('notification:mark-read', async notificationId => {
      try {
        const Notification = require('../models/Notification');
        const notification = await Notification.findOne({
          _id: notificationId,
          userId: socket.userId,
        });

        if (notification) {
          await notification.markAsRead();
          socket.emit('notification:marked-read', { notificationId });

          // Send updated count
          const count = await Notification.countDocuments({
            userId: socket.userId,
            isRead: false,
          });
          socket.emit('notification:count', { count });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });
  }

  /**
   * Send notification to specific user
   */
  async sendNotificationToUser(userId, notification) {
    if (!this.io) return;

    try {
      // Send to user's room
      this.io.to(`user:${userId}`).emit('notification:new', notification);

      // Update unread count
      const Notification = require('../models/Notification');
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });
      this.io.to(`user:${userId}`).emit('notification:count', { count });

      console.log(`📢 Notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(userIds, notification) {
    if (!this.io) return;

    try {
      for (const userId of userIds) {
        await this.sendNotificationToUser(userId, notification);
      }
      console.log(`📢 Bulk notification sent to ${userIds.length} users`);
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
    }
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastNotification(notification) {
    if (!this.io) return;

    try {
      this.io.emit('notification:broadcast', notification);
      console.log('📢 Notification broadcast to all users');
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }
}

// Export singleton instance
module.exports = new WebSocketService();
