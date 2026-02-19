/**
 * Real-time Communication Server - Phase 10
 * WebSocket server for live updates, notifications, and collaborative features
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');

class RealtimeServer extends EventEmitter {
  constructor(httpServer, options = {}) {
    super();
    this.wss = new WebSocket.Server({ server: httpServer });
    this.clients = new Map();
    this.rooms = new Map();
    this.messageQueue = [];
    this.options = {
      maxClients: options.maxClients || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      messageBufferSize: options.messageBufferSize || 100,
      ...options,
    };

    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.startHeartbeat();
    this.setupMessageBroker();
  }

  handleConnection(ws, req) {
    try {
      // Authenticate client
      const token = this.extractToken(req);
      const userId = this.authenticateToken(token);

      if (!userId) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      // Register client
      const clientId = `${userId}-${Date.now()}`;
      ws.userId = userId;
      ws.clientId = clientId;
      ws.isAlive = true;

      this.clients.set(clientId, {
        ws,
        userId,
        connectedAt: new Date(),
        rooms: new Set(),
        lastHeartbeat: Date.now(),
      });

      // Setup message handlers
      ws.on('message', data => this.handleMessage(clientId, data));
      ws.on('close', () => this.handleDisconnect(clientId));
      ws.on('error', error => this.handleError(clientId, error));

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection:established',
        clientId,
        userId,
        timestamp: new Date(),
      });

      this.emit('client:connected', { clientId, userId });
    } catch (error) {
      ws.close(4000, 'Connection error');
    }
  }

  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (message.type) {
        case 'subscribe':
          this.subscribeToRoom(clientId, message.room);
          break;

        case 'unsubscribe':
          this.unsubscribeFromRoom(clientId, message.room);
          break;

        case 'broadcast':
          this.broadcastMessage(clientId, message);
          break;

        case 'direct':
          this.sendDirectMessage(clientId, message);
          break;

        case 'room':
          this.sendRoomMessage(clientId, message);
          break;

        case 'ping':
          client.ws.userId && this.sendToClient(clientId, { type: 'pong' });
          break;

        default:
          this.emit('message:received', { clientId, message });
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  }

  subscribeToRoom(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    this.rooms.get(room).add(clientId);
    client.rooms.add(room);

    // Notify room members
    this.broadcastToRoom(room, {
      type: 'room:user-joined',
      userId: client.userId,
      room,
      totalMembers: this.rooms.get(room).size,
      timestamp: new Date(),
    });

    this.emit('room:subscribed', { clientId, room });
  }

  unsubscribeFromRoom(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.rooms.get(room)?.delete(clientId);
    client.rooms.delete(room);

    this.broadcastToRoom(room, {
      type: 'room:user-left',
      userId: client.userId,
      room,
      totalMembers: this.rooms.get(room)?.size || 0,
      timestamp: new Date(),
    });

    this.emit('room:unsubscribed', { clientId, room });
  }

  broadcastMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const broadcastData = {
      type: 'broadcast',
      from: client.userId,
      content: message.content,
      timestamp: new Date(),
    };

    this.clients.forEach((c, id) => {
      if (id !== clientId) {
        this.sendToClient(id, broadcastData);
      }
    });
  }

  sendDirectMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const targetClient = Array.from(this.clients.values()).find(
      c => c.userId === message.targetUserId
    );

    if (targetClient) {
      targetClient.ws.send(
        JSON.stringify({
          type: 'direct:message',
          from: client.userId,
          content: message.content,
          timestamp: new Date(),
        })
      );
    }
  }

  sendRoomMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.rooms.has(message.room)) return;

    const roomData = {
      type: 'room:message',
      from: client.userId,
      room: message.room,
      content: message.content,
      timestamp: new Date(),
    };

    this.broadcastToRoom(message.room, roomData);
  }

  broadcastToRoom(room, message) {
    const roomMembers = this.rooms.get(room) || new Set();
    roomMembers.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcastToAll(message) {
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all rooms
    client.rooms.forEach(room => {
      this.unsubscribeFromRoom(clientId, room);
    });

    this.clients.delete(clientId);
    this.emit('client:disconnected', { clientId, userId: client.userId });
  }

  handleError(clientId, error) {
    console.error(`WebSocket error for ${clientId}:`, error);
    this.emit('client:error', { clientId, error });
  }

  startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.handleDisconnect(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, this.options.heartbeatInterval);
  }

  setupMessageBroker() {
    // Message persistence for offline users
    setInterval(() => {
      if (this.messageQueue.length > this.options.messageBufferSize) {
        this.messageQueue.shift();
      }
    }, 60000);
  }

  extractToken(req) {
    const authHeader = req.headers.authorization || '';
    return authHeader.replace('Bearer ', '');
  }

  authenticateToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'secret-key';
      const decoded = jwt.verify(token, secret);
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }

  // Notification system
  notifyUser(userId, notification) {
    const client = Array.from(this.clients.values()).find(c => c.userId === userId);

    if (client) {
      this.sendToClient(client.clientId || this.getClientIdForUser(userId), {
        type: 'notification',
        data: notification,
        timestamp: new Date(),
      });
    }
  }

  getClientIdForUser(userId) {
    return Array.from(this.clients.entries()).find(([, client]) => client.userId === userId)?.[0];
  }

  // Statistics
  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      roomStats: Array.from(this.rooms.entries()).map(([room, members]) => ({
        room,
        members: members.size,
      })),
      messageQueueSize: this.messageQueue.length,
      timestamp: new Date(),
    };
  }

  // Shutdown
  close() {
    this.wss.close();
    this.clients.clear();
    this.rooms.clear();
  }
}

module.exports = RealtimeServer;
