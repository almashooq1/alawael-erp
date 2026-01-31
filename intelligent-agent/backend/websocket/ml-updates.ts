// ml-updates.ts
// 🔌 WebSocket Real-time ML Updates
// Push ML predictions and training progress to connected clients

import { Server as SocketIOServer } from 'socket.io';
import { Process } from '../models/process.model';
import { classifyProcessRiskAdvanced, predictDelayAdvanced, mlService } from '../models/process.ml.enhanced';

interface MLUpdatePayload {
  processId?: string;
  processName?: string;
  timestamp: string;
  type: 'classification' | 'prediction' | 'training' | 'alert';
  data: any;
}

export class MLWebSocketService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize WebSocket service
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    // Set up ML-specific namespace
    const mlNamespace = io.of('/ml');

    mlNamespace.on('connection', (socket) => {
      console.log(`✅ ML WebSocket client connected: ${socket.id}`);

      // Handle subscription to process updates
      socket.on('subscribe:process', (processId: string) => {
        socket.join(`process:${processId}`);
        console.log(`📡 Client ${socket.id} subscribed to process ${processId}`);
      });

      // Handle unsubscribe
      socket.on('unsubscribe:process', (processId: string) => {
        socket.leave(`process:${processId}`);
        console.log(`📴 Client ${socket.id} unsubscribed from process ${processId}`);
      });

      // Handle real-time classification request
      socket.on('ml:classify', async (process: Process) => {
        try {
          const result = await classifyProcessRiskAdvanced(process);
          socket.emit('ml:classification:result', {
            processId: process._id,
            processName: process.name,
            timestamp: new Date().toISOString(),
            type: 'classification',
            data: result,
          });
        } catch (error: any) {
          socket.emit('ml:error', {
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Handle real-time prediction request
      socket.on('ml:predict', async (process: Process) => {
        try {
          const result = await predictDelayAdvanced(process);
          socket.emit('ml:prediction:result', {
            processId: process._id,
            processName: process.name,
            timestamp: new Date().toISOString(),
            type: 'prediction',
            data: result,
          });
        } catch (error: any) {
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
  async broadcastClassification(process: Process): Promise<void> {
    if (!this.io) return;

    try {
      const classification = await classifyProcessRiskAdvanced(process);
      const payload: MLUpdatePayload = {
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
    } catch (error) {
      console.error('Error broadcasting classification:', error);
    }
  }

  /**
   * Broadcast prediction update
   */
  async broadcastPrediction(process: Process): Promise<void> {
    if (!this.io) return;

    try {
      const prediction = await predictDelayAdvanced(process);
      const payload: MLUpdatePayload = {
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
    } catch (error) {
      console.error('Error broadcasting prediction:', error);
    }
  }

  /**
   * Broadcast training progress
   */
  broadcastTrainingProgress(progress: {
    modelId: string;
    epoch: number;
    totalEpochs: number;
    loss: number;
    accuracy?: number;
  }): void {
    if (!this.io) return;

    const payload: MLUpdatePayload = {
      timestamp: new Date().toISOString(),
      type: 'training',
      data: progress,
    };

    this.io.of('/ml').emit('ml:training:progress', payload);
  }

  /**
   * Broadcast ML alert
   */
  broadcastAlert(alert: {
    processId?: string;
    processName?: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    details?: any;
  }): void {
    if (!this.io) return;

    const payload: MLUpdatePayload = {
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
  broadcastBatchResults(results: {
    totalProcesses: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    avgConfidence: number;
  }): void {
    if (!this.io) return;

    const payload: MLUpdatePayload = {
      timestamp: new Date().toISOString(),
      type: 'classification',
      data: results,
    };

    this.io.of('/ml').emit('ml:batch:complete', payload);
  }

  /**
   * Get connected clients count
   */
  getConnectedClients(): number {
    if (!this.io) return 0;
    const mlNamespace = this.io.of('/ml');
    return mlNamespace.sockets.size;
  }
}

// Export singleton instance
export const mlWebSocketService = new MLWebSocketService();
