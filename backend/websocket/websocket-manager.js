/**
 * WebSocket Manager - مدير الاتصالات الفورية
 * Real-time Communication for Alawael ERP
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Emitter } = require('@socket.io/redis-emitter');

/**
 * WebSocket Configuration
 */
const wsConfig = {
  // Connection
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  
  // Authentication
  authTimeout: 10000,
  
  // Rooms & Namespaces
  maxRooms: 50,
  
  // Rate Limiting
  maxEventsPerSecond: 50,
};

/**
 * WebSocket Manager Class
 */
class WebSocketManager {
  constructor() {
    this.io = null;
    this.users = new Map(); // userId -> Set of socketIds
    this.sockets = new Map(); // socketId -> userId
    this.rooms = new Map(); // roomName -> Set of userIds
    this.emitter = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize WebSocket Server
   */
  initialize(httpServer, options = {}) {
    if (this.isInitialized) {
      console.log('⚠️ WebSocket already initialized');
      return this;
    }
    
    const config = { ...wsConfig, ...options };
    
    // Create Socket.IO server
    this.io = new Server(httpServer, {
      cors: {
        origin: options.corsOrigins || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: config.pingTimeout,
      pingInterval: config.pingInterval,
      connectTimeout: config.connectTimeout,
    });
    
    // Setup Redis adapter if available
    if (options.redisClient) {
      this.setupRedisAdapter(options.redisClient);
    }
    
    // Setup authentication middleware
    this.setupAuthentication(options.jwtSecret);
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Setup rate limiting
    this.setupRateLimiting(config.maxEventsPerSecond);
    
    this.isInitialized = true;
    console.log('✅ WebSocket server initialized');
    
    return this;
  }
  
  /**
   * Setup Redis Adapter for scaling
   */
  setupRedisAdapter(redisClient) {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    
    this.io.adapter(createAdapter(pubClient, subClient));
    this.emitter = new Emitter(redisClient);
    
    console.log('✅ WebSocket Redis adapter configured');
  }
  
  /**
   * Setup Authentication Middleware
   */
  setupAuthentication(jwtSecret) {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                      socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        // Verify JWT
        const decoded = jwt.verify(token, jwtSecret);
        
        // Attach user info to socket
        socket.user = {
          id: decoded.userId || decoded._id,
          email: decoded.email,
          role: decoded.role,
          organizationId: decoded.organizationId,
          permissions: decoded.permissions || [],
        };
        
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }
  
  /**
   * Setup Event Handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }
  
  /**
   * Handle New Connection
   */
  handleConnection(socket) {
    const userId = socket.user.id;
    
    // Track user sockets
    if (!this.users.has(userId)) {
      this.users.set(userId, new Set());
    }
    this.users.get(userId).add(socket.id);
    this.sockets.set(socket.id, userId);
    
    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Join organization room if exists
    if (socket.user.organizationId) {
      socket.join(`org:${socket.user.organizationId}`);
    }
    
    // Join role-based room
    socket.join(`role:${socket.user.role}`);
    
    console.log(`✅ User connected: ${userId} (${socket.id})`);
    
    // Send connection acknowledgment
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date().toISOString(),
    });
    
    // Setup event listeners
    this.setupSocketEvents(socket);
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
  }
  
  /**
   * Setup Socket Events
   */
  setupSocketEvents(socket) {
    // Join room
    socket.on('join:room', (roomName) => {
      if (this.isValidRoom(roomName, socket.user)) {
        socket.join(roomName);
        socket.emit('joined:room', { room: roomName });
      } else {
        socket.emit('error', { message: 'Cannot join room' });
      }
    });
    
    // Leave room
    socket.on('leave:room', (roomName) => {
      socket.leave(roomName);
      socket.emit('left:room', { room: roomName });
    });
    
    // Ping/Pong for keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Typing indicator
    socket.on('typing:start', (data) => {
      socket.to(data.room).emit('user:typing', {
        userId: socket.user.id,
        room: data.room,
      });
    });
    
    socket.on('typing:stop', (data) => {
      socket.to(data.room).emit('user:stopped_typing', {
        userId: socket.user.id,
        room: data.room,
      });
    });
    
    // Custom events
    socket.on('custom:event', (data) => {
      this.handleCustomEvent(socket, data);
    });
  }
  
  /**
   * Handle Disconnection
   */
  handleDisconnection(socket, reason) {
    const userId = socket.user?.id;
    
    if (userId) {
      // Remove from users map
      const userSockets = this.users.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.users.delete(userId);
        }
      }
      
      // Remove from sockets map
      this.sockets.delete(socket.id);
    }
    
    console.log(`👋 User disconnected: ${userId} (${reason})`);
  }
  
  /**
   * Setup Rate Limiting
   */
  setupRateLimiting(maxEvents) {
    const eventCounts = new Map();
    
    this.io.use((socket, next) => {
      const socketId = socket.id;
      const now = Date.now();
      const windowMs = 1000; // 1 second
      
      if (!eventCounts.has(socketId)) {
        eventCounts.set(socketId, { count: 1, windowStart: now });
        return next();
      }
      
      const record = eventCounts.get(socketId);
      
      if (now - record.windowStart > windowMs) {
        record.count = 1;
        record.windowStart = now;
        return next();
      }
      
      if (record.count >= maxEvents) {
        return next(new Error('Rate limit exceeded'));
      }
      
      record.count++;
      next();
    });
  }
  
  /**
   * Validate Room Access
   */
  isValidRoom(roomName, user) {
    // User can always join their personal room
    if (roomName === `user:${user.id}`) return true;
    
    // User can join their organization room
    if (roomName === `org:${user.organizationId}`) return true;
    
    // Admin can join any room
    if (user.role === 'admin') return true;
    
    // Check specific room patterns
    if (roomName.startsWith('department:')) {
      // Check if user belongs to department
      return true; // Implement actual check
    }
    
    if (roomName.startsWith('project:')) {
      // Check if user has access to project
      return true; // Implement actual check
    }
    
    return false;
  }
  
  /**
   * Handle Custom Event
   */
  handleCustomEvent(socket, data) {
    // Override this method to handle custom events
    console.log('Custom event:', data);
  }
  
  // ==================== Emission Methods ====================
  
  /**
   * Emit to specific user
   */
  emitToUser(userId, event, data) {
    if (this.emitter) {
      this.emitter.to(`user:${userId}`).emit(event, data);
    } else {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }
  
  /**
   * Emit to organization
   */
  emitToOrganization(orgId, event, data) {
    if (this.emitter) {
      this.emitter.to(`org:${orgId}`).emit(event, data);
    } else {
      this.io.to(`org:${orgId}`).emit(event, data);
    }
  }
  
  /**
   * Emit to role
   */
  emitToRole(role, event, data) {
    if (this.emitter) {
      this.emitter.to(`role:${role}`).emit(event, data);
    } else {
      this.io.to(`role:${role}`).emit(event, data);
    }
  }
  
  /**
   * Emit to room
   */
  emitToRoom(room, event, data) {
    if (this.emitter) {
      this.emitter.to(room).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }
  
  /**
   * Broadcast to all
   */
  broadcast(event, data) {
    if (this.emitter) {
      this.emitter.emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }
  
  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.users.has(userId);
  }
  
  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.users.keys());
  }
  
  /**
   * Get user's socket count
   */
  getUserSocketCount(userId) {
    return this.users.get(userId)?.size || 0;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      totalConnections: this.sockets.size,
      uniqueUsers: this.users.size,
      rooms: this.io?.sockets?.adapter?.rooms?.size || 0,
    };
  }
  
  /**
   * Disconnect user
   */
  disconnectUser(userId, reason = 'Server disconnect') {
    const userSockets = this.users.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
  }
  
  /**
   * Close WebSocket server
   */
  async close() {
    if (this.io) {
      await new Promise((resolve) => {
        this.io.close(() => {
          console.log('👋 WebSocket server closed');
          resolve();
        });
      });
    }
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

/**
 * Notification Events
 */
const NotificationEvents = {
  // System
  SYSTEM_ALERT: 'system:alert',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  
  // HR
  HR_NEW_EMPLOYEE: 'hr:new_employee',
  HR_LEAVE_REQUEST: 'hr:leave_request',
  HR_ATTENDANCE_ALERT: 'hr:attendance_alert',
  
  // Finance
  FINANCE_INVOICE_CREATED: 'finance:invoice_created',
  FINANCE_PAYMENT_RECEIVED: 'finance:payment_received',
  FINANCE_BUDGET_ALERT: 'finance:budget_alert',
  
  // Inventory
  INVENTORY_LOW_STOCK: 'inventory:low_stock',
  INVENTORY_REORDER: 'inventory:reorder',
  INVENTORY_UPDATED: 'inventory:updated',
  
  // Messages
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  
  // Tasks
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMPLETED: 'task:completed',
  TASK_COMMENT: 'task:comment',
  
  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
};

/**
 * WebSocket Express Middleware
 */
const websocketMiddleware = (req, res, next) => {
  req.wsManager = wsManager;
  next();
};

module.exports = {
  WebSocketManager,
  wsManager,
  NotificationEvents,
  websocketMiddleware,
  wsConfig,
};