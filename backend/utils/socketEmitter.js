/**
 * Socket Emitter Utility
 * أداة إرسال الأحداث عبر Socket.IO
 *
 * This utility provides a centralized way to emit events to Socket.IO clients
 * from anywhere in the backend (controllers, services, etc.)
 */

let ioInstance = null;

/**
 * Initialize the Socket.IO instance
 * تهيئة نسخة Socket.IO
 */
function initializeSocketEmitter(io) {
  if (!io) {
    throw new Error('Socket.IO instance is required');
  }
  ioInstance = io;
  console.log('[SocketEmitter] Initialized successfully');
}

/**
 * Get the Socket.IO instance
 * الحصول على نسخة Socket.IO
 */
function getIO() {
  if (!ioInstance) {
    console.warn('[SocketEmitter] Socket.IO not initialized yet');
    return null;
  }
  return ioInstance;
}

/**
 * Emit KPI update to specific module subscribers
 * إرسال تحديث مؤشرات الأداء لمشتركي وحدة معينة
 */
function emitModuleKPIUpdate(moduleKey, data) {
  const io = getIO();
  if (!io) return false;

  try {
    io.to(`module:${moduleKey}`).emit(`kpi:update:${moduleKey}`, {
      moduleKey,
      data,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SocketEmitter] KPI update sent to module:${moduleKey}`);
    return true;
  } catch (error) {
    console.error(`[SocketEmitter] Failed to emit KPI update for ${moduleKey}:`, error);
    return false;
  }
}

/**
 * Emit dashboard update to all dashboard subscribers
 * إرسال تحديث لوحة القيادة لجميع المشتركين
 */
function emitDashboardUpdate(data) {
  const io = getIO();
  if (!io) return false;

  try {
    io.to('dashboard').emit('dashboard:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log('[SocketEmitter] Dashboard update sent');
    return true;
  } catch (error) {
    console.error('[SocketEmitter] Failed to emit dashboard update:', error);
    return false;
  }
}

/**
 * Emit notification to specific user or broadcast
 * إرسال إشعار لمستخدم محدد أو للجميع
 */
function emitNotification({ userId, type, title, message, priority, metadata }) {
  const io = getIO();
  if (!io) return false;

  try {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'info',
      title: title || 'إشعار جديد',
      message: message || '',
      priority: priority || 'normal',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (userId) {
      // Send to specific user
      io.to(`notifications:${userId}`).emit('notification:new', notification);
      console.log(`[SocketEmitter] Notification sent to user ${userId}`);
    } else {
      // Broadcast to all
      io.to('notifications').emit('notification:new', notification);
      console.log('[SocketEmitter] Notification broadcast to all');
    }

    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error('[SocketEmitter] Failed to emit notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Emit chat message to room
 * إرسال رسالة دردشة إلى غرفة
 */
function emitChatMessage({ roomId, userId, message, metadata }) {
  const io = getIO();
  if (!io) return false;

  try {
    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      userId: userId || 'system',
      message,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    io.to(`chat:${roomId}`).emit('chat:message', messageData);
    console.log(`[SocketEmitter] Chat message sent to room ${roomId}`);
    return { success: true, messageId: messageData.id };
  } catch (error) {
    console.error('[SocketEmitter] Failed to emit chat message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Emit system alert (high priority broadcast)
 * إرسال تنبيه نظام (بث عالي الأولوية)
 */
function emitSystemAlert({ title, message, severity, metadata }) {
  const io = getIO();
  if (!io) return false;

  try {
    const alert = {
      id: `alert_${Date.now()}`,
      type: 'system-alert',
      title: title || 'تنبيه النظام',
      message: message || '',
      severity: severity || 'warning', // info, warning, error, critical
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all connected clients
    io.emit('system:alert', alert);
    console.log('[SocketEmitter] System alert broadcast:', severity);
    return { success: true, alertId: alert.id };
  } catch (error) {
    console.error('[SocketEmitter] Failed to emit system alert:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Emit data change event (for real-time sync)
 * إرسال حدث تغيير البيانات (للمزامنة الفورية)
 */
function emitDataChange({ entity, action, data, userId }) {
  const io = getIO();
  if (!io) return false;

  try {
    const changeEvent = {
      entity, // e.g., 'user', 'report', 'task'
      action, // e.g., 'created', 'updated', 'deleted'
      data,
      userId: userId || 'system',
      timestamp: new Date().toISOString(),
    };

    // Emit to entity-specific room
    io.to(`entity:${entity}`).emit('data:change', changeEvent);
    console.log(`[SocketEmitter] Data change event: ${entity}.${action}`);
    return true;
  } catch (error) {
    console.error('[SocketEmitter] Failed to emit data change:', error);
    return false;
  }
}

/**
 * Get connected clients count
 * الحصول على عدد العملاء المتصلين
 */
function getConnectedClientsCount() {
  const io = getIO();
  if (!io) return 0;

  try {
    return io.engine.clientsCount;
  } catch (error) {
    console.error('[SocketEmitter] Failed to get clients count:', error);
    return 0;
  }
}

/**
 * Get clients in specific room
 * الحصول على العملاء في غرفة معينة
 */
async function getClientsInRoom(roomName) {
  const io = getIO();
  if (!io) return [];

  try {
    const socketsInRoom = await io.in(roomName).allSockets();
    return Array.from(socketsInRoom);
  } catch (error) {
    console.error(`[SocketEmitter] Failed to get clients in room ${roomName}:`, error);
    return [];
  }
}

/**
 * Broadcast to all connected clients
 * البث لجميع العملاء المتصلين
 */
function broadcast(event, data) {
  const io = getIO();
  if (!io) return false;

  try {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SocketEmitter] Broadcast event: ${event}`);
    return true;
  } catch (error) {
    console.error(`[SocketEmitter] Failed to broadcast ${event}:`, error);
    return false;
  }
}

module.exports = {
  initializeSocketEmitter,
  getIO,
  emitModuleKPIUpdate,
  emitDashboardUpdate,
  emitNotification,
  emitChatMessage,
  emitSystemAlert,
  emitDataChange,
  getConnectedClientsCount,
  getClientsInRoom,
  broadcast,
};
