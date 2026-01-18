/**
 * خادم WebSocket للإشعارات الفعلية
 * WebSocket Server for Real-time Notifications
 *
 * تفعيل الإشعارات الفعلية والتنبيهات الحية
 * Enable real-time notifications and live alerts
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class NotificationServer {
  constructor(port = 5000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.eventEmitter = new EventEmitter();
    this.clients = new Map();
    this.notificationQueue = [];
    this.keepAliveInterval = null;
    this.cleanupInterval = null;
    this.init();
  }

  /**
   * تهيئة الخادم
   * Initialize the server
   */
  init() {
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', '*');
      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        clients: this.clients.size,
        queueLength: this.notificationQueue.length,
      });
    });

    // WebSocket connection handler
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Event listeners
    this.setupEventListeners();
  }

  /**
   * معالجة الاتصال الجديد
   * Handle new connection
   */
  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const client = {
      id: clientId,
      ws,
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true,
    };

    this.clients.set(clientId, client);
    logger.info(`[WS] Client connected: ${clientId}. Total clients: ${this.clients.size}`);

    // إرسال رسالة ترحيب
    ws.send(
      JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'اتصل بنجاح | Successfully connected',
      }),
    );

    // Message handler
    ws.on('message', message => {
      this.handleMessage(clientId, message);
    });

    // Close handler
    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    // Error handler
    ws.on('error', error => {
      logger.error(`[WS] Error for client ${clientId}:`, error);
    });

    // Ping/Pong for keep-alive
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
      client.lastPing = new Date();
    });

    // Send queued notifications
    this.sendQueuedNotifications(ws);
  }

  /**
   * معالجة الرسائل الواردة
   * Handle incoming messages
   */
  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);

      if (!client) return;

      logger.debug(`[WS] Message from ${clientId}:`, data);

      switch (data.type) {
        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'subscribe':
          client.subscriptions = client.subscriptions || [];
          client.subscriptions.push(data.channel);
          logger.info(`[WS] Client ${clientId} subscribed to ${data.channel}`);
          break;

        case 'unsubscribe':
          if (client.subscriptions) {
            client.subscriptions = client.subscriptions.filter(ch => ch !== data.channel);
          }
          break;

        case 'acknowledge':
          // Acknowledgment of received notification
          logger.debug(`[WS] Client ${clientId} acknowledged notification ${data.notificationId}`);
          break;

        default:
          logger.warn(`[WS] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error(`[WS] Error processing message from ${clientId}:`, error);
    }
  }

  /**
   * معالجة قطع الاتصال
   * Handle disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      logger.info(`[WS] Client disconnected: ${clientId}. Remaining clients: ${this.clients.size}`);
    }
  }

  /**
   * إرسال إشعار إلى جميع الاتصالات أو قناة محددة
   * Send notification to all connections or specific channel
   */
  broadcast(notification, channel = null) {
    const message = JSON.stringify({
      type: 'notification',
      id: this.generateNotificationId(),
      channel,
      timestamp: new Date().toISOString(),
      ...notification,
    });

    let sentCount = 0;

    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // إذا كان هناك قناة محددة، تحقق من الاشتراك
        if (channel && client.subscriptions && !client.subscriptions.includes(channel)) {
          return;
        }

        try {
          client.ws.send(message);
          sentCount++;
        } catch (error) {
          logger.error(`[WS] Error sending to client ${client.id}:`, error);
        }
      }
    });

    logger.info(`[WS] Notification broadcast to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * إرسال إشعار محدد لعميل معين
   * Send notification to specific client
   */
  sendToClient(clientId, notification) {
    const client = this.clients.get(clientId);
    if (!client) {
      this.notificationQueue.push({ clientId, notification });
      return false;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'notification',
        id: this.generateNotificationId(),
        timestamp: new Date().toISOString(),
        ...notification,
      });

      try {
        client.ws.send(message);
        logger.debug(`[WS] Notification sent to client ${clientId}`);
        return true;
      } catch (error) {
        logger.error(`[WS] Error sending to client ${clientId}:`, error);
        return false;
      }
    }

    this.notificationQueue.push({ clientId, notification });
    return false;
  }

  /**
   * إرسال الإشعارات المتراكمة
   * Send queued notifications
   */
  sendQueuedNotifications(ws) {
    const remaining = [];

    this.notificationQueue.forEach(item => {
      if (item.clientId === this.getClientIdByWs(ws)) {
        const message = JSON.stringify({
          type: 'notification',
          id: this.generateNotificationId(),
          timestamp: new Date().toISOString(),
          ...item.notification,
        });

        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          } else {
            remaining.push(item);
          }
        } catch (error) {
          logger.error('[WS] Error sending queued notification:', error);
          remaining.push(item);
        }
      } else {
        remaining.push(item);
      }
    });

    this.notificationQueue = remaining;
  }

  /**
   * تعيين معرّفات الإشعارات
   * Generate notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * توليد معرّف العميل
   * Generate client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * الحصول على معرّف العميل من WebSocket
   * Get client ID from WebSocket
   */
  getClientIdByWs(ws) {
    for (const [clientId, client] of this.clients) {
      if (client.ws === ws) {
        return clientId;
      }
    }
    return null;
  }

  /**
   * إعداد المستمعين للأحداث
   * Setup event listeners
   */
  setupEventListeners() {
    // Keep-alive ping
    this.keepAliveInterval = setInterval(() => {
      this.clients.forEach(client => {
        if (!client.isAlive) {
          logger.warn(`[WS] Client ${client.id} not responding, closing connection`);
          client.ws.terminate();
          this.clients.delete(client.id);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Every 30 seconds

    // Cleanup old queue items
    this.cleanupInterval = setInterval(() => {
      if (this.notificationQueue.length > 0) {
        const maxQueueAge = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();

        this.notificationQueue = this.notificationQueue.filter(item => {
          if (item.timestamp && now - item.timestamp > maxQueueAge) {
            logger.warn(`[WS] Discarding old queued notification for ${item.clientId}`);
            return false;
          }
          return true;
        });
      }
    }, 60000); // Every minute
  }

  /**
   * تشغيل الخادم
   * Start the server
   */
  start() {
    return new Promise((resolve, reject) => {
      const onError = err => {
        this.server.off('error', onError);
        reject(err);
      };

      this.server.once('error', onError);
      this.server.listen(this.port, () => {
        this.server.off('error', onError);
        // If OS picked a random port (e.g., port 0), store the actual port for downstream consumers
        const address = this.server.address();
        if (address && address.port) {
          this.port = address.port;
        }

        logger.info(`[WS] Notification server listening on port ${this.port}`);
        resolve(this.server);
      });
    });
  }

  /**
   * إيقاف الخادم
   * Stop the server
   */
  stop() {
    return new Promise(resolve => {
      this.clients.forEach(client => {
        client.ws.close();
      });
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      this.server.close(() => {
        logger.info('[WS] Notification server stopped');
        resolve();
      });
    });
  }

  /**
   * الحصول على إحصائيات الخادم
   * Get server statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      queuedNotifications: this.notificationQueue.length,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = NotificationServer;
