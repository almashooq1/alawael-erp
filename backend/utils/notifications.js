const socketIO = require('socket.io');

let io = null;
const connectedUsers = new Map(); // userId -> socketId

/**
 * إعداد WebSocket Server
 * @param {Object} server - HTTP Server instance
 */
function setupWebSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', socket => {
    console.log(`✅ User connected: ${socket.id}`);

    // تسجيل المستخدم
    socket.on('register', userId => {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`👤 User registered: ${userId}`);

      // إرسال تأكيد الاتصال
      socket.emit('registered', {
        success: true,
        message: 'Connected to notifications server',
      });
    });

    // الانضمام لغرفة معينة (مثلاً: غرفة قسم معين)
    socket.on('join-room', roomId => {
      socket.join(roomId);
      console.log(`🚪 User ${socket.userId} joined room: ${roomId}`);
    });

    // مغادرة غرفة
    socket.on('leave-room', roomId => {
      socket.leave(roomId);
      console.log(`🚪 User ${socket.userId} left room: ${roomId}`);
    });

    // قراءة إشعار
    socket.on('mark-notification-read', notificationId => {
      console.log(`✓ Notification ${notificationId} marked as read by ${socket.userId}`);
    });

    // قطع الاتصال
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`❌ User disconnected: ${socket.userId}`);
      }
    });

    // معالجة الأخطاء
    socket.on('error', error => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 WebSocket server initialized');
  return io;
}

/**
 * إرسال إشعار لمستخدم محدد
 * @param {String} userId - معرف المستخدم
 * @param {Object} notification - بيانات الإشعار
 */
function sendNotificationToUser(userId, notification) {
  if (!io) {
    console.warn('WebSocket not initialized');
    return false;
  }

  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', notification);
    console.log(`📬 Notification sent to user ${userId}`);
    return true;
  } else {
    console.log(`⚠️  User ${userId} not connected`);
    return false;
  }
}

/**
 * إرسال إشعار لغرفة معينة (مثل: قسم أو مجموعة)
 * @param {String} roomId - معرف الغرفة
 * @param {Object} notification - بيانات الإشعار
 */
function sendNotificationToRoom(roomId, notification) {
  if (!io) {
    console.warn('WebSocket not initialized');
    return false;
  }

  io.to(roomId).emit('notification', notification);
  console.log(`📢 Notification sent to room ${roomId}`);
  return true;
}

/**
 * إرسال إشعار لجميع المستخدمين المتصلين
 * @param {Object} notification - بيانات الإشعار
 */
function broadcastNotification(notification) {
  if (!io) {
    console.warn('WebSocket not initialized');
    return false;
  }

  io.emit('notification', notification);
  console.log(`📡 Notification broadcasted to all users`);
  return true;
}

/**
 * إشعار باتصال جديد
 * @param {Object} communication - بيانات الاتصال
 * @param {String} recipientUserId - معرف المستخدم المستقبل
 */
function notifyNewCommunication(communication, recipientUserId) {
  const notification = {
    type: 'new_communication',
    title: 'اتصال جديد',
    message: `اتصال جديد: ${communication.title}`,
    data: {
      communicationId: communication._id,
      referenceNumber: communication.referenceNumber,
      type: communication.type,
      priority: communication.priority,
      sender: communication.sender.name,
    },
    timestamp: new Date().toISOString(),
    read: false,
  };

  return sendNotificationToUser(recipientUserId, notification);
}

/**
 * إشعار بطلب موافقة
 * @param {Object} communication - بيانات الاتصال
 * @param {String} approverUserId - معرف المُوافق
 * @param {Number} stageIndex - رقم المرحلة
 */
function notifyApprovalRequest(communication, approverUserId, stageIndex) {
  const stage = communication.approvalWorkflow.stages[stageIndex];

  const notification = {
    type: 'approval_request',
    title: 'طلب موافقة',
    message: `يُرجى الموافقة على: ${communication.title}`,
    data: {
      communicationId: communication._id,
      referenceNumber: communication.referenceNumber,
      stageName: stage.name,
      stageIndex: stageIndex,
      priority: communication.priority,
    },
    timestamp: new Date().toISOString(),
    read: false,
    actions: [
      { label: 'موافقة', action: 'approve', color: 'success' },
      { label: 'رفض', action: 'reject', color: 'error' },
    ],
  };

  return sendNotificationToUser(approverUserId, notification);
}

/**
 * إشعار بتغيير حالة الاتصال
 * @param {Object} communication - بيانات الاتصال
 * @param {String} userId - معرف المستخدم
 * @param {String} oldStatus - الحالة القديمة
 * @param {String} newStatus - الحالة الجديدة
 */
function notifyStatusChange(communication, userId, oldStatus, newStatus) {
  const statusLabels = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    under_review: 'قيد المراجعة',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  };

  const notification = {
    type: 'status_change',
    title: 'تحديث حالة الاتصال',
    message: `تم تغيير حالة "${communication.title}" من ${statusLabels[oldStatus]} إلى ${statusLabels[newStatus]}`,
    data: {
      communicationId: communication._id,
      referenceNumber: communication.referenceNumber,
      oldStatus: oldStatus,
      newStatus: newStatus,
    },
    timestamp: new Date().toISOString(),
    read: false,
  };

  return sendNotificationToUser(userId, notification);
}

/**
 * إشعار بتعليق جديد
 * @param {Object} communication - بيانات الاتصال
 * @param {String} userId - معرف المستخدم
 * @param {String} comment - التعليق
 * @param {String} commenterName - اسم المعلّق
 */
function notifyNewComment(communication, userId, comment, commenterName) {
  const notification = {
    type: 'new_comment',
    title: 'تعليق جديد',
    message: `${commenterName} أضاف تعليقاً على: ${communication.title}`,
    data: {
      communicationId: communication._id,
      referenceNumber: communication.referenceNumber,
      comment: comment.substring(0, 100) + (comment.length > 100 ? '...' : ''),
      commenterName: commenterName,
    },
    timestamp: new Date().toISOString(),
    read: false,
  };

  return sendNotificationToUser(userId, notification);
}

/**
 * إشعار باقتراب موعد الاستحقاق
 * @param {Object} communication - بيانات الاتصال
 * @param {String} userId - معرف المستخدم
 * @param {Number} daysRemaining - الأيام المتبقية
 */
function notifyDueDateApproaching(communication, userId, daysRemaining) {
  const notification = {
    type: 'due_date_reminder',
    title: 'تنبيه: اقتراب موعد الاستحقاق',
    message: `يقترب موعد استحقاق "${communication.title}" (${daysRemaining} أيام متبقية)`,
    data: {
      communicationId: communication._id,
      referenceNumber: communication.referenceNumber,
      dueDate: communication.dueDate,
      daysRemaining: daysRemaining,
    },
    timestamp: new Date().toISOString(),
    read: false,
    priority: daysRemaining <= 2 ? 'high' : 'medium',
  };

  return sendNotificationToUser(userId, notification);
}

/**
 * الحصول على عدد المستخدمين المتصلين
 */
function getConnectedUsersCount() {
  return connectedUsers.size;
}

/**
 * الحصول على قائمة المستخدمين المتصلين
 */
function getConnectedUsers() {
  return Array.from(connectedUsers.keys());
}

/**
 * التحقق من اتصال مستخدم معين
 * @param {String} userId - معرف المستخدم
 */
function isUserConnected(userId) {
  return connectedUsers.has(userId);
}

module.exports = {
  setupWebSocket,
  sendNotificationToUser,
  sendNotificationToRoom,
  broadcastNotification,
  notifyNewCommunication,
  notifyApprovalRequest,
  notifyStatusChange,
  notifyNewComment,
  notifyDueDateApproaching,
  getConnectedUsersCount,
  getConnectedUsers,
  isUserConnected,
};
