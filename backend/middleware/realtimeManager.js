/**
 * Real-time Features System
 * نظام Features real-time متقدم مع WebSocket و Server-Sent Events
 */

const EventEmitter = require('events');

class RealtimeManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      subscribedChannels: new Set(),
    };
  }

  /**
   * Register connection
   */
  registerConnection(id, socket, type = 'websocket') {
    this.connections.set(id, {
      socket,
      type,
      connectedAt: Date.now(),
      subscriptions: new Set(),
      messageCount: 0,
    });

    this.stats.totalConnections++;
    this.stats.activeConnections = this.connections.size;
  }

  /**
   * Close connection
   */
  closeConnection(id) {
    this.connections.delete(id);
    this.stats.activeConnections = this.connections.size;
  }

  /**
   * Subscribe to channel
   */
  subscribe(clientId, channel) {
    const conn = this.connections.get(clientId);
    if (conn) {
      conn.subscriptions.add(channel);

      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }
      this.subscriptions.get(channel).add(clientId);

      this.stats.subscribedChannels.add(channel);
    }
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(clientId, channel) {
    const conn = this.connections.get(clientId);
    if (conn) {
      conn.subscriptions.delete(channel);

      if (this.subscriptions.has(channel)) {
        this.subscriptions.get(channel).delete(clientId);
      }
    }
  }

  /**
   * Broadcast to channel
   */
  broadcast(channel, message, excludeClientId = null) {
    const subscribers = this.subscriptions.get(channel) || new Set();

    subscribers.forEach(clientId => {
      if (clientId !== excludeClientId) {
        const conn = this.connections.get(clientId);
        if (conn && conn.socket) {
          try {
            if (conn.type === 'websocket' && conn.socket.readyState === 1) {
              conn.socket.send(JSON.stringify(message));
            } else if (conn.type === 'sse') {
              conn.socket.write(`data: ${JSON.stringify(message)}\n\n`);
            }
            conn.messageCount++;
            this.stats.totalMessages++;
          } catch (err) {
            console.error(`Error sending message to ${clientId}:`, err);
          }
        }
      }
    });
  }

  /**
   * Emit event through realtime
   */
  emitEvent(eventName, data, channel = 'events') {
    const message = {
      type: 'event',
      event: eventName,
      data,
      timestamp: Date.now(),
    };

    this.broadcast(channel, message);
    this.messageQueue.push(message);

    // Keep only last 1000 messages
    if (this.messageQueue.length > 1000) {
      this.messageQueue.shift();
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo(clientId) {
    return this.connections.get(clientId);
  }

  /**
   * Get channel subscribers
   */
  getChannelSubscribers(channel) {
    return Array.from(this.subscriptions.get(channel) || new Set());
  }

  /**
   * Get all channels
   */
  getAllChannels() {
    return Array.from(this.stats.subscribedChannels);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      channels: Array.from(this.stats.subscribedChannels),
      subscribersPerChannel: Array.from(this.subscriptions.entries()).reduce((acc, [ch, subs]) => {
        acc[ch] = subs.size;
        return acc;
      }, {}),
    };
  }

  /**
   * Clear old connections
   */
  cleanupStaleConnections(maxIdleTime = 3600000) {
    const now = Date.now();

    for (const [id, conn] of this.connections.entries()) {
      if (now - conn.connectedAt > maxIdleTime) {
        this.closeConnection(id);
      }
    }
  }
}

// Singleton instance
const realtimeManager = new RealtimeManager();

/**
 * WebSocket handler
 */
const handleWebSocketConnection = (ws, clientId) => {
  realtimeManager.registerConnection(clientId, ws, 'websocket');

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'subscribe') {
        realtimeManager.subscribe(clientId, data.channel);
      } else if (data.type === 'unsubscribe') {
        realtimeManager.unsubscribe(clientId, data.channel);
      } else if (data.type === 'message') {
        realtimeManager.emitEvent('message', data, data.channel);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    realtimeManager.closeConnection(clientId);
  });

  ws.on('error', err => {
    console.error('WebSocket error:', err);
    realtimeManager.closeConnection(clientId);
  });
};

/**
 * Server-Sent Events handler
 */
const handleSSEConnection = (res, clientId) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  realtimeManager.registerConnection(clientId, res, 'sse');

  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');

  // Clean up on close
  res.on('close', () => {
    realtimeManager.closeConnection(clientId);
  });
};

/**
 * Monitoring endpoint
 */
function getRealtimeStats() {
  return {
    status: 'operational',
    connections: realtimeManager.getStats(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}

module.exports = {
  realtimeManager,
  handleWebSocketConnection,
  handleSSEConnection,
  getRealtimeStats,
  RealtimeManager,
};
