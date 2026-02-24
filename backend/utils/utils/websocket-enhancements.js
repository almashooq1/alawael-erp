/**
 * WebSocket Enhancements
 * Adds connection pooling and resource optimization to WebSocket service
 */

const connectionPoolManager = require('./connection-pool-manager');

class WebSocketEnhancements {
  constructor(websocketService) {
    this.websocketService = websocketService;
    this.connTimeouts = new Map();
    this.maxSubscriptionsPerSocket = 50; // Limit subscriptions
    this.idleTimeout = 3600000; // 1 hour
    this.setupEnhancements();
  }

  /**
   * Setup WebSocket enhancements
   */
  setupEnhancements() {
    // Initialize connection pool for WebSocket
    connectionPoolManager.createPool('websocket-connections', {
      maxSize: 1000,
      minSize: 10,
      idleTimeout: this.idleTimeout,
    });

    // Wrap the original event emitters
    this.wrapSocketHandlers();

    console.log('✅ WebSocket enhancements loaded');
  }

  /**
   * Wrap socket handlers with optimization
   */
  wrapSocketHandlers() {
    if (!this.websocketService.io) {
      // Schedule retry if io not ready
      setTimeout(() => this.wrapSocketHandlers(), 100);
      return;
    }

    // Monitor all connected sockets
    setInterval(() => this.monitorConnections(), 30000);

    // Clean up stale subscriptions every 5 minutes
    setInterval(() => this.cleanupStaleSubscriptions(), 300000);
  }

  /**
   * Monitor active WebSocket connections
   */
  monitorConnections() {
    const service = this.websocketService;
    const connCount = service.activeConnections.size;
    const poolStats = connectionPoolManager.getPoolStats('websocket-connections');

    if (connCount > 0) {
      console.log(
        `📊 WebSocket Monitor: ${connCount} active connections`,
        poolStats ? `(Pool utilization: ${poolStats.utilization})` : '',
      );
    }

    // Close idle connections
    const now = Date.now();
    const idleConnections = Array.from(service.activeConnections.entries()).filter(
      ([, conn]) => now - new Date(conn.connectedAt).getTime() > this.idleTimeout,
    );

    idleConnections.forEach(([socketId, conn]) => {
      console.log(`🔌 Closing idle connection: ${socketId} (${(now - new Date(conn.connectedAt).getTime()) / 60000} min)`);
      const socket = service.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });
  }

  /**
   * Clean up stale subscriptions
   */
  cleanupStaleSubscriptions() {
    const service = this.websocketService;

    // Check subscription counts
    let vehicleSubCount = 0;
    let tripSubCount = 0;

    service.vehicleSubscriptions.forEach((subs) => {
      vehicleSubCount += subs.size;
    });

    service.tripSubscriptions.forEach((subs) => {
      tripSubCount += subs.size;
    });

    console.log(
      `📡 Subscriptions: ${vehicleSubCount} vehicle, ${tripSubCount} trip, ${service.activeConnections.size} active connections`,
    );

    // Remove subscriptions for disconnected sockets
    const activeSocketIds = new Set(service.activeConnections.keys());

    // Cleanup vehicle subscriptions
    const deadVehicleKeys = Array.from(service.vehicleSubscriptions.keys()).filter(
      (id) => !activeSocketIds.has(id),
    );
    deadVehicleKeys.forEach((id) => {
      service.vehicleSubscriptions.delete(id);
      console.log(`🧹 Cleaned vehicle subscriptions for ${id}`);
    });

    // Cleanup trip subscriptions
    const deadTripKeys = Array.from(service.tripSubscriptions.keys()).filter(
      (id) => !activeSocketIds.has(id),
    );
    deadTripKeys.forEach((id) => {
      service.tripSubscriptions.delete(id);
      console.log(`🧹 Cleaned trip subscriptions for ${id}`);
    });

    // Run connection pool cleanup
    connectionPoolManager.cleanupStaleConnections();
  }

  /**
   * Check subscription limit
   */
  checkSubscriptionLimit(socketId, type = 'vehicle') {
    const service = this.websocketService;
    const subscriptions = type === 'vehicle' ? service.vehicleSubscriptions : service.tripSubscriptions;

    const socketSubs = subscriptions.get(socketId);
    const count = socketSubs ? socketSubs.size : 0;

    if (count >= this.maxSubscriptionsPerSocket) {
      return {
        allowed: false,
        message: `Maximum ${type} subscriptions (${this.maxSubscriptionsPerSocket}) reached`,
        current: count,
      };
    }

    return {
      allowed: true,
      current: count,
      remaining: this.maxSubscriptionsPerSocket - count,
    };
  }

  /**
   * Set connection timeout
   */
  setConnectionTimeout(socketId, timeout = this.idleTimeout) {
    if (this.connTimeouts.has(socketId)) {
      clearTimeout(this.connTimeouts.get(socketId));
    }

    const timeoutId = setTimeout(() => {
      const service = this.websocketService;
      if (service.activeConnections.has(socketId)) {
        console.log(`⏱️ Closing connection due to inactivity: ${socketId}`);
        const socket = service.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
      this.connTimeouts.delete(socketId);
    }, timeout);

    this.connTimeouts.set(socketId, timeoutId);
  }

  /**
   * Clear connection timeout
   */
  clearConnectionTimeout(socketId) {
    if (this.connTimeouts.has(socketId)) {
      clearTimeout(this.connTimeouts.get(socketId));
      this.connTimeouts.delete(socketId);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const service = this.websocketService;

    let vehicleSubCount = 0;
    let tripSubCount = 0;

    service.vehicleSubscriptions.forEach((subs) => {
      vehicleSubCount += subs.size;
    });

    service.tripSubscriptions.forEach((subs) => {
      tripSubCount += subs.size;
    });

    return {
      activeConnections: service.activeConnections.size,
      vehicleSubscriptions: vehicleSubCount,
      tripSubscriptions: tripSubCount,
      connectionPoolStats: connectionPoolManager.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.connTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.connTimeouts.clear();
    connectionPoolManager.cleanup();
    console.log('✅ WebSocket enhancements cleaned up');
  }
}

module.exports = WebSocketEnhancements;
