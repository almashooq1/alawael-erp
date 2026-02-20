/**
 * WebSocket Real-time Dashboard Service
 * Enables live streaming of dashboard data and KPI updates
 */

const logger = require('../utils/logger');

class WebSocketDashboardService {
  constructor() {
    this.connections = new Map();
    this.subscriptions = new Map();
    this.messageBuffer = [];
    this.maxBufferSize = 1000;
  }

  /**
   * Initialize WebSocket service
   */
  async initialize(io) {
    try {
      logger.info('🚀 WebSocket Dashboard Service: Initializing...');

      io.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      logger.info('✅ WebSocket Dashboard Service: Initialized');
      return true;
    } catch (error) {
      logger.error('❌ WebSocket Dashboard Service: Initialization failed', error);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(socket) {
    const userId = socket.handshake.auth?.userId || socket.id;
    
    logger.info(`👤 User connected: ${userId}`);
    this.connections.set(socket.id, {
      userId,
      socket,
      subscriptions: new Set(),
      connectedAt: new Date(),
    });

    // Setup event handlers
    socket.on('subscribe', (data) => this.handleSubscription(socket, data));
    socket.on('unsubscribe', (data) => this.handleUnsubscription(socket, data));
    socket.on('request_refresh', (data) => this.handleRefreshRequest(socket, data));
    socket.on('disconnect', () => this.handleDisconnection(socket));

    // Send connection confirmation
    socket.emit('connected', {
      status: 'success',
      socketId: socket.id,
      message: 'Connected to dashboard updates',
    });
  }

  /**
   * Handle subscription to KPI updates
   */
  handleSubscription(socket, data) {
    const { kpiId, dashboardId } = data;
    const connection = this.connections.get(socket.id);

    if (!connection) return;

    if (kpiId) {
      connection.subscriptions.add(`kpi:${kpiId}`);
      socket.emit('subscribed', { status: 'success', target: kpiId });
    }

    if (dashboardId) {
      connection.subscriptions.add(`dashboard:${dashboardId}`);
      socket.emit('subscribed', { status: 'success', target: dashboardId });
    }

    logger.debug(`Subscribed: ${userId} to ${kpiId || dashboardId}`);
  }

  /**
   * Handle unsubscription
   */
  handleUnsubscription(socket, data) {
    const { kpiId, dashboardId } = data;
    const connection = this.connections.get(socket.id);

    if (!connection) return;

    if (kpiId) {
      connection.subscriptions.delete(`kpi:${kpiId}`);
    }
    if (dashboardId) {
      connection.subscriptions.delete(`dashboard:${dashboardId}`);
    }

    socket.emit('unsubscribed', { status: 'success' });
  }

  /**
   * Handle refresh request
   */
  handleRefreshRequest(socket, data) {
    const { kpiId } = data;
    socket.emit('refresh_requested', {
      status: 'pending',
      target: kpiId,
      timestamp: new Date(),
    });
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket) {
    const connection = this.connections.get(socket.id);
    if (connection) {
      logger.info(`👤 User disconnected: ${connection.userId}`);
      this.connections.delete(socket.id);
    }
  }

  /**
   * Broadcast KPI update to all subscribers
   */
  broadcastKPIUpdate(kpiId, kpiData) {
    const message = {
      type: 'kpi_update',
      kpiId,
      data: kpiData,
      timestamp: new Date(),
    };

    this.connections.forEach((connection) => {
      if (connection.subscriptions.has(`kpi:${kpiId}`)) {
        connection.socket.emit('kpi_updated', message);
      }
    });

    this.addToBuffer(message);
  }

  /**
   * Broadcast dashboard update
   */
  broadcastDashboardUpdate(dashboardId, dashboardData) {
    const message = {
      type: 'dashboard_update',
      dashboardId,
      data: dashboardData,
      timestamp: new Date(),
    };

    this.connections.forEach((connection) => {
      if (connection.subscriptions.has(`dashboard:${dashboardId}`)) {
        connection.socket.emit('dashboard_updated', message);
      }
    });

    this.addToBuffer(message);
  }

  /**
   * Broadcast alert
   */
  broadcastAlert(alert) {
    const message = {
      type: 'alert',
      severity: alert.severity,
      message: alert.message,
      kpiId: alert.kpiId,
      timestamp: new Date(),
    };

    this.connections.forEach((connection) => {
      if (connection.subscriptions.has(`kpi:${alert.kpiId}`) || 
          connection.subscriptions.has('all_alerts')) {
        connection.socket.emit('alert', message);
      }
    });

    this.addToBuffer(message);
  }

  /**
   * Add message to buffer for late subscribers
   */
  addToBuffer(message) {
    this.messageBuffer.push(message);
    if (this.messageBuffer.length > this.maxBufferSize) {
      this.messageBuffer.shift();
    }
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalSubscriptions: Array.from(this.connections.values()).reduce(
        (sum, conn) => sum + conn.subscriptions.size,
        0
      ),
      bufferSize: this.messageBuffer.length,
      timestamp: new Date(),
    };
  }

  /**
   * Send metrics to all connected clients
   */
  broadcastMetrics(metrics) {
    this.connections.forEach((connection) => {
      connection.socket.emit('metrics', {
        data: metrics,
        timestamp: new Date(),
      });
    });
  }
}

module.exports = new WebSocketDashboardService();
