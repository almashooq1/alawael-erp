import * as WebSocket from 'ws';
import * as http from 'http';
import * as events from 'events';

/**
 * WebSocket Service for Real-Time Communications
 * Manages bidirectional communication between client and server
 */

interface ClientConnection {
  id: string;
  socket: WebSocket.WebSocket;
  userId: string;
  connectedAt: Date;
  isActive: boolean;
  subscriptions: Set<string>;
}

interface MessagePayload {
  type: string;
  data: any;
  timestamp?: Date;
  sender?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface BroadcastOptions {
  excludeSender?: boolean;
  targetUsers?: string[];
  priority?: string;
}

export class WebSocketService extends events.EventEmitter {
  private wss: WebSocket.Server;
  private clients: Map<string, ClientConnection> = new Map();
  private messageQueue: MessagePayload[] = [];
  private messageHistory: Map<string, MessagePayload[]> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: http.Server, options: any = {}) {
    super();

    this.wss = new WebSocket.Server({
      server,
      perMessageDeflate: {
        zlevel: 3,
        memLevel: 7,
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
      },
      ...options,
    });

    this.initializeServer();
    this.startHeartbeat();
  }

  /**
   * Initialize WebSocket Server
   */
  private initializeServer(): void {
    this.wss.on('connection', (socket: WebSocket.WebSocket, req) => {
      const clientId = this.generateClientId();
      const userId = this.extractUserId(req);

      const connection: ClientConnection = {
        id: clientId,
        socket,
        userId,
        connectedAt: new Date(),
        isActive: true,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, connection);
      this.reconnectAttempts.delete(userId);

      console.log(`✓ Client connected: ${clientId} (User: ${userId})`);
      this.emit('client-connected', { clientId, userId });

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'connection-confirmed',
        data: { clientId, timestamp: new Date() },
      });

      // Handle incoming messages
      socket.on('message', (raw: WebSocket.Data) => {
        try {
          const message = JSON.parse(raw.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: 'Invalid message format' },
          });
        }
      });

      // Handle client disconnect
      socket.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Client error (${clientId}):`, error);
        this.emit('client-error', { clientId, error });
      });
    });

    console.log('✓ WebSocket Server initialized');
  }

  /**
   * Handle Incoming Messages
   */
  private handleMessage(clientId: string, message: MessagePayload): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    message.timestamp = new Date();
    message.sender = connection.userId;

    console.log(`📨 Message from ${clientId}:`, message.type);

    // Store in history
    if (!this.messageHistory.has(clientId)) {
      this.messageHistory.set(clientId, []);
    }
    this.messageHistory.get(clientId)!.push(message);

    // Handle different message types
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.data.channel);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.data.channel);
        break;
      case 'broadcast':
        this.broadcast(message, { excludeSender: false });
        break;
      case 'process-update':
        this.handleProcessUpdate(clientId, message);
        break;
      case 'notification':
        this.handleNotification(clientId, message);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', data: {} });
        break;
      default:
        this.emit('message-received', { clientId, message });
    }
  }

  /**
   * Handle Subscribe to Channel
   */
  private handleSubscribe(clientId: string, channel: string): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    connection.subscriptions.add(channel);

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(clientId);

    console.log(`✓ Client ${clientId} subscribed to ${channel}`);
    this.sendToClient(clientId, {
      type: 'subscribed',
      data: { channel, timestamp: new Date() },
    });
  }

  /**
   * Handle Unsubscribe from Channel
   */
  private handleUnsubscribe(clientId: string, channel: string): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    connection.subscriptions.delete(channel);
    this.channels.get(channel)?.delete(clientId);

    console.log(`✓ Client ${clientId} unsubscribed from ${channel}`);
  }

  /**
   * Handle Process Update
   */
  private handleProcessUpdate(clientId: string, message: MessagePayload): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    // Broadcast to subscribers
    this.broadcastToChannel('process-updates', {
      type: 'process-update',
      data: message.data,
      sender: connection.userId,
      timestamp: new Date(),
    });

    this.emit('process-updated', { clientId, data: message.data });
  }

  /**
   * Handle Notification
   */
  private handleNotification(clientId: string, message: MessagePayload): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    this.broadcastToChannel('notifications', {
      type: 'notification',
      data: message.data,
      priority: message.priority || 'medium',
      timestamp: new Date(),
    });

    this.emit('notification-received', { clientId, data: message.data });
  }

  /**
   * Broadcast Message to All Clients
   */
  broadcast(message: MessagePayload, options: BroadcastOptions = {}): void {
    const payload = JSON.stringify(message);
    let count = 0;

    for (const [clientId, connection] of this.clients.entries()) {
      if (options.excludeSender && clientId === message.sender) continue;
      if (options.targetUsers && !options.targetUsers.includes(connection.userId)) continue;

      if (connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(payload, (err) => {
          if (err) console.error(`Error sending to ${clientId}:`, err);
        });
        count++;
      }
    }

    console.log(`📢 Broadcast sent to ${count} clients`);
  }

  /**
   * Broadcast to Specific Channel
   */
  broadcastToChannel(channel: string, message: MessagePayload): void {
    const subscribers = this.channels.get(channel);
    if (!subscribers || subscribers.size === 0) return;

    const payload = JSON.stringify(message);

    for (const clientId of subscribers) {
      const connection = this.clients.get(clientId);
      if (connection && connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(payload, (err) => {
          if (err) console.error(`Error sending to ${clientId}:`, err);
        });
      }
    }

    console.log(`📢 Channel broadcast to ${subscribers.size} subscribers`);
  }

  /**
   * Send Message to Specific Client
   */
  sendToClient(clientId: string, message: MessagePayload): void {
    const connection = this.clients.get(clientId);
    if (!connection || !connection.isActive) return;

    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message), (err) => {
        if (err) console.error(`Error sending to ${clientId}:`, err);
      });
    }
  }

  /**
   * Send Message to Specific User
   */
  sendToUser(userId: string, message: MessagePayload): void {
    for (const [_, connection] of this.clients.entries()) {
      if (connection.userId === userId && connection.isActive) {
        this.sendToClient(connection.id, message);
      }
    }
  }

  /**
   * Handle Client Disconnect
   */
  private handleDisconnect(clientId: string): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    connection.isActive = false;

    // Clean up subscriptions
    for (const channel of connection.subscriptions) {
      this.channels.get(channel)?.delete(clientId);
    }

    console.log(`✗ Client disconnected: ${clientId}`);
    this.emit('client-disconnected', { clientId, userId: connection.userId });

    // Remove from clients after delay (allow for reconnection)
    setTimeout(() => {
      if (!this.clients.get(clientId)?.isActive) {
        this.clients.delete(clientId);
      }
    }, 30000); // 30 second grace period
  }

  /**
   * Start Heartbeat for Connection Monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, connection] of this.clients.entries()) {
        if (connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.ping((err) => {
            if (err) {
              console.error(`Heartbeat failed for ${clientId}`);
              this.handleDisconnect(clientId);
            }
          });
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop Heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get Connection Statistics
   */
  getStats(): object {
    return {
      totalClients: this.clients.size,
      activeClients: Array.from(this.clients.values()).filter(c => c.isActive).length,
      channels: this.channels.size,
      messageQueueLength: this.messageQueue.length,
      uptime: new Date(),
    };
  }

  /**
   * Get Connected Users
   */
  getConnectedUsers(): object {
    const users: any = {};
    for (const connection of this.clients.values()) {
      if (!users[connection.userId]) {
        users[connection.userId] = [];
      }
      users[connection.userId].push({
        clientId: connection.id,
        connectedAt: connection.connectedAt,
        subscriptions: Array.from(connection.subscriptions),
      });
    }
    return users;
  }

  /**
   * Close WebSocket Server
   */
  close(): void {
    this.stopHeartbeat();
    this.wss.close();
    console.log('✓ WebSocket Server closed');
  }

  /**
   * Generate Unique Client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract User ID from Request
   */
  private extractUserId(req: any): string {
    // Try to extract from authorization header
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return `anonymous_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export factory function
export function createWebSocketService(server: http.Server, options?: any) {
  return new WebSocketService(server, options);
}
