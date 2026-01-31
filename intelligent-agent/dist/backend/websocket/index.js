"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class WebSocketService {
    constructor(httpServer) {
        this.connectedUsers = new Map();
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                credentials: true
            },
            path: '/ws'
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Authentication middleware
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
                socket.userId = decoded.id;
                socket.username = decoded.username;
                next();
            }
            catch (error) {
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`✅ User connected: ${socket.username} (${socket.userId})`);
            // Add user to connected users
            if (!this.connectedUsers.has(socket.userId)) {
                this.connectedUsers.set(socket.userId, new Set());
            }
            this.connectedUsers.get(socket.userId).add(socket.id);
            // Join user-specific room
            socket.join(`user:${socket.userId}`);
            // Send welcome message
            socket.emit('connected', {
                message: 'Connected to WebSocket server',
                userId: socket.userId,
                timestamp: new Date().toISOString()
            });
            // Broadcast user online status
            this.io.emit('user:status', {
                userId: socket.userId,
                username: socket.username,
                status: 'online',
                timestamp: new Date().toISOString()
            });
            // Handle joining project room
            socket.on('project:join', (projectId) => {
                socket.join(`project:${projectId}`);
                console.log(`User ${socket.username} joined project ${projectId}`);
                socket.to(`project:${projectId}`).emit('project:user-joined', {
                    userId: socket.userId,
                    username: socket.username,
                    projectId,
                    timestamp: new Date().toISOString()
                });
            });
            // Handle leaving project room
            socket.on('project:leave', (projectId) => {
                socket.leave(`project:${projectId}`);
                console.log(`User ${socket.username} left project ${projectId}`);
                socket.to(`project:${projectId}`).emit('project:user-left', {
                    userId: socket.userId,
                    username: socket.username,
                    projectId,
                    timestamp: new Date().toISOString()
                });
            });
            // Handle model training updates
            socket.on('model:training-start', (data) => {
                this.io.to(`project:${data.projectId}`).emit('model:training-started', {
                    modelId: data.modelId,
                    modelName: data.modelName,
                    userId: socket.userId,
                    username: socket.username,
                    timestamp: new Date().toISOString()
                });
            });
            // Handle dataset upload progress
            socket.on('dataset:upload-progress', (data) => {
                socket.to(`project:${data.projectId}`).emit('dataset:upload-update', {
                    datasetId: data.datasetId,
                    progress: data.progress,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });
            });
            // Handle chat messages (collaboration feature)
            socket.on('chat:message', (data) => {
                this.io.to(`project:${data.projectId}`).emit('chat:new-message', {
                    id: `msg_${Date.now()}`,
                    userId: socket.userId,
                    username: socket.username,
                    message: data.message,
                    projectId: data.projectId,
                    timestamp: new Date().toISOString()
                });
            });
            // Handle typing indicators
            socket.on('chat:typing', (data) => {
                socket.to(`project:${data.projectId}`).emit('chat:user-typing', {
                    userId: socket.userId,
                    username: socket.username,
                    projectId: data.projectId
                });
            });
            socket.on('chat:stop-typing', (data) => {
                socket.to(`project:${data.projectId}`).emit('chat:user-stopped-typing', {
                    userId: socket.userId,
                    username: socket.username,
                    projectId: data.projectId
                });
            });
            // Handle real-time collaboration (cursor position)
            socket.on('collab:cursor', (data) => {
                socket.to(`project:${data.projectId}`).emit('collab:cursor-update', {
                    userId: socket.userId,
                    username: socket.username,
                    position: data.position,
                    color: data.color
                });
            });
            // Handle notifications
            socket.on('notification:read', (notificationId) => {
                socket.emit('notification:marked-read', { notificationId });
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`❌ User disconnected: ${socket.username} (${socket.userId})`);
                // Remove user from connected users
                const userSockets = this.connectedUsers.get(socket.userId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        this.connectedUsers.delete(socket.userId);
                        // Broadcast user offline status
                        this.io.emit('user:status', {
                            userId: socket.userId,
                            username: socket.username,
                            status: 'offline',
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            });
        });
    }
    // Public methods to emit events from backend
    notifyProjectUpdate(projectId, update) {
        this.io.to(`project:${projectId}`).emit('project:updated', {
            projectId,
            update,
            timestamp: new Date().toISOString()
        });
    }
    notifyModelTrainingProgress(projectId, progress) {
        this.io.to(`project:${projectId}`).emit('model:training-progress', {
            ...progress,
            timestamp: new Date().toISOString()
        });
    }
    notifyModelStatusChange(projectId, model) {
        this.io.to(`project:${projectId}`).emit('model:status-changed', {
            modelId: model.id,
            status: model.status,
            accuracy: model.accuracy,
            timestamp: new Date().toISOString()
        });
    }
    notifyNewPrediction(projectId, prediction) {
        this.io.to(`project:${projectId}`).emit('prediction:new', {
            ...prediction,
            timestamp: new Date().toISOString()
        });
    }
    notifyUser(userId, notification) {
        this.io.to(`user:${userId}`).emit('notification:new', {
            ...notification,
            timestamp: new Date().toISOString()
        });
    }
    notifyAllUsers(notification) {
        this.io.emit('notification:broadcast', {
            ...notification,
            timestamp: new Date().toISOString()
        });
    }
    getConnectedUsers() {
        return Array.from(this.connectedUsers.keys());
    }
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    getUserConnectionCount(userId) {
        return this.connectedUsers.get(userId)?.size || 0;
    }
}
exports.WebSocketService = WebSocketService;
// Example usage in Express app:
/*
import express from 'express';
import http from 'http';
import { WebSocketService } from './websocket';

const app = express();
const httpServer = http.createServer(app);
const wsService = new WebSocketService(httpServer);

// Use in routes
app.post('/api/projects/:id/update', async (req, res) => {
  const project = await updateProject(req.params.id, req.body);
  
  // Notify all users in the project
  wsService.notifyProjectUpdate(req.params.id, project);
  
  res.json(project);
});

httpServer.listen(3001, () => {
  console.log('Server with WebSocket running on port 3001');
});
*/
