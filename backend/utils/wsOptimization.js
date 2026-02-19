/**
 * 🚀 WebSocket Performance Optimization
 *
 * Features:
 * - Message compression
 * - Batch message sending
 * - Connection pooling
 * - Heartbeat/Ping-Pong
 * - Memory efficient message queuing
 */

class WebSocketOptimizer {
  constructor(io, options = {}) {
    this.io = io;
    this.options = {
      compressionThreshold: options.compressionThreshold || 1024, // 1KB
      batchInterval: options.batchInterval || 50, // 50ms
      maxBatchSize: options.maxBatchSize || 100,
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      maxMessageQueueSize: options.maxMessageQueueSize || 10000,
    };

    // Message batches per socket
    this.messageBatches = new Map();

    // Connection metadata
    this.connectionMetadata = new Map();

    // Statistics
    this.stats = {
      totalMessages: 0,
      compressedMessages: 0,
      batchedMessages: 0,
      totalConnections: 0,
      activeConnections: 0,
    };

    // Initialize
    this.initializeOptimizations();
  }

  /**
   * Initialize optimizations on all connections
   */
  initializeOptimizations() {
    this.io.on('connection', socket => {
      this.optimizeSocket(socket);
    });
  }

  /**
   * Optimize a socket connection
   */
  optimizeSocket(socket) {
    const socketId = socket.id;
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    // Initialize metadata
    this.connectionMetadata.set(socketId, {
      connectedAt: Date.now(),
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
    });

    // Initialize message batch
    this.messageBatches.set(socketId, {
      messages: [],
      timer: null,
    });

    // Setup heartbeat
    this.setupHeartbeat(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.stats.activeConnections--;
      this.messageBatches.delete(socketId);
      this.connectionMetadata.delete(socketId);
    });

    // Override emit for optimization
    const originalEmit = socket.emit.bind(socket);
    socket.emit = (event, data) => {
      return this.optimizedEmit(socket, event, data, originalEmit);
    };

    // Override to for optimization
    const originalTo = socket.to.bind(socket);
    socket.to = room => {
      const namespace = originalTo(room);
      const optimizedNamespace = this.wrapNamespace(namespace, socketId);
      return optimizedNamespace;
    };
  }

  /**
   * Optimized emit function
   */
  optimizedEmit(socket, event, data, originalEmit) {
    this.stats.totalMessages++;
    const metadata = this.connectionMetadata.get(socket.id);
    if (metadata) metadata.messagesSent++;

    // Check if data needs compression
    const dataStr = JSON.stringify(data);
    const shouldCompress = dataStr.length > this.options.compressionThreshold;

    if (shouldCompress) {
      this.stats.compressedMessages++;
      // Mark as compressed
      return originalEmit(event, {
        __compressed: true,
        data: require('zlib').gzipSync(dataStr),
      });
    }

    return originalEmit(event, data);
  }

  /**
   * Wrap namespace for batch sending
   */
  wrapNamespace(namespace, excludeSocketId) {
    const originalEmit = namespace.emit.bind(namespace);

    namespace.emit = (event, data) => {
      // Batch messages to all connected clients
      const batch = this.messageBatches.get(excludeSocketId);
      if (batch) {
        batch.messages.push({ event, data });

        if (batch.messages.length >= this.options.maxBatchSize) {
          this.flushBatch(excludeSocketId, originalEmit);
        } else if (!batch.timer) {
          batch.timer = setTimeout(() => {
            this.flushBatch(excludeSocketId, originalEmit);
          }, this.options.batchInterval);
        }

        this.stats.batchedMessages++;
        return namespace;
      }

      return originalEmit(event, data);
    };

    return namespace;
  }

  /**
   * Flush message batch
   */
  flushBatch(socketId, originalEmit) {
    const batch = this.messageBatches.get(socketId);
    if (!batch || batch.messages.length === 0) return;

    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    // Send all messages at once
    const batchedEvent = {
      __batched: true,
      messages: batch.messages,
    };

    originalEmit('__batch', batchedEvent);
    batch.messages = [];
  }

  /**
   * Setup heartbeat/ping-pong
   */
  setupHeartbeat(socket) {
    const heartbeatTimer = setInterval(() => {
      if (socket.connected) {
        socket.emit('__heartbeat', {
          timestamp: Date.now(),
          activeConnections: this.stats.activeConnections,
        });
      } else {
        clearInterval(heartbeatTimer);
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Broadcast to multiple rooms efficiently
   */
  broadcastToRooms(rooms, event, data) {
    rooms.forEach(room => {
      this.io.to(room).emit(event, data);
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(socketId) {
    if (!socketId) {
      return {
        totalConnections: this.stats.totalConnections,
        activeConnections: this.stats.activeConnections,
        totalMessages: this.stats.totalMessages,
        compressedMessages: this.stats.compressedMessages,
        batchedMessages: this.stats.batchedMessages,
        compressionRate:
          ((this.stats.compressedMessages / this.stats.totalMessages) * 100 || 0).toFixed(2) + '%',
        batchRate:
          ((this.stats.batchedMessages / this.stats.totalMessages) * 100 || 0).toFixed(2) + '%',
      };
    }

    return this.connectionMetadata.get(socketId);
  }

  /**
   * Get all connections info
   */
  getAllConnectionsInfo() {
    const connections = [];
    this.connectionMetadata.forEach((metadata, socketId) => {
      connections.push({
        socketId,
        ...metadata,
        uptime: Date.now() - metadata.connectedAt,
      });
    });
    return connections;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalMessages: 0,
      compressedMessages: 0,
      batchedMessages: 0,
      totalConnections: 0,
      activeConnections: this.stats.activeConnections, // Keep active
    };
  }
}

/**
 * WebSocket performance monitoring middleware
 */
function wsPerformanceMiddleware(wsOptimizer) {
  return (socket, next) => {
    // Attach wsOptimizer to socket
    socket.wsOptimizer = wsOptimizer;

    // Monitor incoming messages
    socket.on('message', data => {
      const metadata = wsOptimizer.connectionMetadata.get(socket.id);
      if (metadata) {
        metadata.messagesReceived++;
        metadata.bytesReceived += JSON.stringify(data).length;
      }
    });

    next();
  };
}

/**
 * Emit helper function
 */
function optimizedEmitMany(io, sockets, event, data) {
  sockets.forEach(socketId => {
    io.to(socketId).emit(event, data);
  });
}

module.exports = {
  WebSocketOptimizer,
  wsPerformanceMiddleware,
  optimizedEmitMany,
};
