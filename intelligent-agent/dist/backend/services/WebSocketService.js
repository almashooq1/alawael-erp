"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
exports.createWebSocketService = createWebSocketService;
const WebSocket = __importStar(require("ws"));
const events = __importStar(require("events"));
class WebSocketService extends events.EventEmitter {
    constructor(server, options = {}) {
        super();
        this.clients = new Map();
        this.messageQueue = [];
        this.messageHistory = new Map();
        this.channels = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
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
    initializeServer() {
        this.wss.on('connection', (socket, req) => {
            const clientId = this.generateClientId();
            const userId = this.extractUserId(req);
            const connection = {
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
            socket.on('message', (raw) => {
                try {
                    const message = JSON.parse(raw.toString());
                    this.handleMessage(clientId, message);
                }
                catch (error) {
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
    handleMessage(clientId, message) {
        const connection = this.clients.get(clientId);
        if (!connection)
            return;
        message.timestamp = new Date();
        message.sender = connection.userId;
        console.log(`📨 Message from ${clientId}:`, message.type);
        // Store in history
        if (!this.messageHistory.has(clientId)) {
            this.messageHistory.set(clientId, []);
        }
        this.messageHistory.get(clientId).push(message);
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
    handleSubscribe(clientId, channel) {
        const connection = this.clients.get(clientId);
        if (!connection)
            return;
        connection.subscriptions.add(channel);
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        this.channels.get(channel).add(clientId);
        console.log(`✓ Client ${clientId} subscribed to ${channel}`);
        this.sendToClient(clientId, {
            type: 'subscribed',
            data: { channel, timestamp: new Date() },
        });
    }
    /**
     * Handle Unsubscribe from Channel
     */
    handleUnsubscribe(clientId, channel) {
        const connection = this.clients.get(clientId);
        if (!connection)
            return;
        connection.subscriptions.delete(channel);
        this.channels.get(channel)?.delete(clientId);
        console.log(`✓ Client ${clientId} unsubscribed from ${channel}`);
    }
    /**
     * Handle Process Update
     */
    handleProcessUpdate(clientId, message) {
        const connection = this.clients.get(clientId);
        if (!connection)
            return;
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
    handleNotification(clientId, message) {
        const connection = this.clients.get(clientId);
        if (!connection)
            return;
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
    broadcast(message, options = {}) {
        const payload = JSON.stringify(message);
        let count = 0;
        for (const [clientId, connection] of this.clients.entries()) {
            if (options.excludeSender && clientId === message.sender)
                continue;
            if (options.targetUsers && !options.targetUsers.includes(connection.userId))
                continue;
            if (connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
                connection.socket.send(payload, (err) => {
                    if (err)
                        console.error(`Error sending to ${clientId}:`, err);
                });
                count++;
            }
        }
        console.log(`📢 Broadcast sent to ${count} clients`);
    }
    /**
     * Broadcast to Specific Channel
     */
    broadcastToChannel(channel, message) {
        const subscribers = this.channels.get(channel);
        if (!subscribers || subscribers.size === 0)
            return;
        const payload = JSON.stringify(message);
        for (const clientId of subscribers) {
            const connection = this.clients.get(clientId);
            if (connection && connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
                connection.socket.send(payload, (err) => {
                    if (err)
                        console.error(`Error sending to ${clientId}:`, err);
                });
            }
        }
        console.log(`📢 Channel broadcast to ${subscribers.size} subscribers`);
    }
    /**
     * Send Message to Specific Client
     */
    sendToClient(clientId, message) {
        const connection = this.clients.get(clientId);
        if (!connection || !connection.isActive)
            return;
        if (connection.socket.readyState === WebSocket.OPEN) {
            connection.socket.send(JSON.stringify(message), (err) => {
                if (err)
                    console.error(`Error sending to ${clientId}:`, err);
            });
        }
    }
    /**
     * Send Message to Specific User
     */
    sendToUser(userId, message) {
        for (const [_, connection] of this.clients.entries()) {
            if (connection.userId === userId && connection.isActive) {
                this.sendToClient(connection.id, message);
            }
        }
    }
    /**
     * Handle Client Disconnect
     */
    handleDisconnect(clientId) {
        const connection = this.clients.get(clientId);
        if (!connection)
            return;
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
    startHeartbeat() {
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
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    /**
     * Get Connection Statistics
     */
    getStats() {
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
    getConnectedUsers() {
        const users = {};
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
    close() {
        this.stopHeartbeat();
        this.wss.close();
        console.log('✓ WebSocket Server closed');
    }
    /**
     * Generate Unique Client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Extract User ID from Request
     */
    extractUserId(req) {
        // Try to extract from authorization header
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            return auth.substring(7);
        }
        return `anonymous_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.WebSocketService = WebSocketService;
// Export factory function
function createWebSocketService(server, options) {
    return new WebSocketService(server, options);
}
