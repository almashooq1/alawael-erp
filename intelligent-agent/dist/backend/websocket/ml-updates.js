"use strict";
// ml-updates.ts
// 🔌 WebSocket Real-time ML Updates
// Push ML predictions and training progress to connected clients
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlWebSocketService = exports.MLWebSocketService = void 0;
const process_ml_enhanced_1 = require("../models/process.ml.enhanced");
class MLWebSocketService {
    constructor() {
        this.io = null;
    }
    /**
     * Initialize WebSocket service
     */
    initialize(io) {
        this.io = io;
        // Set up ML-specific namespace
        const mlNamespace = io.of('/ml');
        mlNamespace.on('connection', (socket) => {
            console.log(`✅ ML WebSocket client connected: ${socket.id}`);
            // Handle subscription to process updates
            socket.on('subscribe:process', (processId) => {
                socket.join(`process:${processId}`);
                console.log(`📡 Client ${socket.id} subscribed to process ${processId}`);
            });
            // Handle unsubscribe
            socket.on('unsubscribe:process', (processId) => {
                socket.leave(`process:${processId}`);
                console.log(`📴 Client ${socket.id} unsubscribed from process ${processId}`);
            });
            // Handle real-time classification request
            socket.on('ml:classify', async (process) => {
                try {
                    const result = await (0, process_ml_enhanced_1.classifyProcessRiskAdvanced)(process);
                    socket.emit('ml:classification:result', {
                        processId: process._id,
                        processName: process.name,
                        timestamp: new Date().toISOString(),
                        type: 'classification',
                        data: result,
                    });
                }
                catch (error) {
                    socket.emit('ml:error', {
                        error: error.message,
                        timestamp: new Date().toISOString(),
                    });
                }
            });
            // Handle real-time prediction request
            socket.on('ml:predict', async (process) => {
                try {
                    const result = await (0, process_ml_enhanced_1.predictDelayAdvanced)(process);
                    socket.emit('ml:prediction:result', {
                        processId: process._id,
                        processName: process.name,
                        timestamp: new Date().toISOString(),
                        type: 'prediction',
                        data: result,
                    });
                }
                catch (error) {
                    socket.emit('ml:error', {
                        error: error.message,
                        timestamp: new Date().toISOString(),
                    });
                }
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`🔌 ML WebSocket client disconnected: ${socket.id}`);
            });
        });
        console.log('✅ ML WebSocket service initialized');
    }
    /**
     * Broadcast classification update to all subscribed clients
     */
    async broadcastClassification(process) {
        if (!this.io)
            return;
        try {
            const classification = await (0, process_ml_enhanced_1.classifyProcessRiskAdvanced)(process);
            const payload = {
                processId: process._id,
                processName: process.name,
                timestamp: new Date().toISOString(),
                type: 'classification',
                data: classification,
            };
            // Broadcast to all clients in ML namespace
            this.io.of('/ml').emit('ml:classification:update', payload);
            // Also broadcast to specific process room
            if (process._id) {
                this.io.of('/ml').to(`process:${process._id}`).emit('ml:process:update', payload);
            }
        }
        catch (error) {
            console.error('Error broadcasting classification:', error);
        }
    }
    /**
     * Broadcast prediction update
     */
    async broadcastPrediction(process) {
        if (!this.io)
            return;
        try {
            const prediction = await (0, process_ml_enhanced_1.predictDelayAdvanced)(process);
            const payload = {
                processId: process._id,
                processName: process.name,
                timestamp: new Date().toISOString(),
                type: 'prediction',
                data: prediction,
            };
            this.io.of('/ml').emit('ml:prediction:update', payload);
            if (process._id) {
                this.io.of('/ml').to(`process:${process._id}`).emit('ml:process:update', payload);
            }
        }
        catch (error) {
            console.error('Error broadcasting prediction:', error);
        }
    }
    /**
     * Broadcast training progress
     */
    broadcastTrainingProgress(progress) {
        if (!this.io)
            return;
        const payload = {
            timestamp: new Date().toISOString(),
            type: 'training',
            data: progress,
        };
        this.io.of('/ml').emit('ml:training:progress', payload);
    }
    /**
     * Broadcast ML alert
     */
    broadcastAlert(alert) {
        if (!this.io)
            return;
        const payload = {
            processId: alert.processId,
            processName: alert.processName,
            timestamp: new Date().toISOString(),
            type: 'alert',
            data: alert,
        };
        this.io.of('/ml').emit('ml:alert', payload);
        if (alert.processId) {
            this.io.of('/ml').to(`process:${alert.processId}`).emit('ml:alert', payload);
        }
    }
    /**
     * Broadcast batch analysis results
     */
    broadcastBatchResults(results) {
        if (!this.io)
            return;
        const payload = {
            timestamp: new Date().toISOString(),
            type: 'classification',
            data: results,
        };
        this.io.of('/ml').emit('ml:batch:complete', payload);
    }
    /**
     * Get connected clients count
     */
    getConnectedClients() {
        if (!this.io)
            return 0;
        const mlNamespace = this.io.of('/ml');
        return mlNamespace.sockets.size;
    }
}
exports.MLWebSocketService = MLWebSocketService;
// Export singleton instance
exports.mlWebSocketService = new MLWebSocketService();
