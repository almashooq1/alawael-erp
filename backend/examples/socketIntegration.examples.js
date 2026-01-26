/**
 * Socket.IO Integration Examples
 * أمثلة على استخدام Socket.IO في Controllers
 */

const socketEmitter = require('../utils/socketEmitter');

// ============================================
// Example 1: Emit notification after user creation
// مثال 1: إرسال إشعار بعد إنشاء مستخدم
// ============================================

async function createUserWithNotification(req, res) {
  try {
    // Create user logic...
    const newUser = {
      id: 'user123',
      name: 'أحمد محمد',
      email: 'ahmed@example.com',
    };

    // Emit notification to all admins
    socketEmitter.emitNotification({
      type: 'info',
      title: 'مستخدم جديد',
      message: `تم إضافة مستخدم جديد: ${newUser.name}`,
      priority: 'normal',
      metadata: { userId: newUser.id },
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Example 2: Update dashboard after creating report
// مثال 2: تحديث لوحة القيادة بعد إنشاء تقرير
// ============================================

async function createReportWithDashboardUpdate(req, res) {
  try {
    // Create report logic...
    const newReport = {
      id: 'report456',
      title: 'تقرير شهري',
      status: 'مكتمل',
    };

    // Update dashboard KPIs
    const { getSummarySystems, getTopKPIs } = require('../utils/kpiCalculator');
    socketEmitter.emitDashboardUpdate({
      summaryCards: getSummarySystems(),
      topKPIs: getTopKPIs(4),
    });

    // Also emit to reports module
    socketEmitter.emitModuleKPIUpdate('reports', {
      totalReports: 150,
      completedReports: 120,
      pendingReports: 30,
    });

    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Example 3: Emit system alert
// مثال 3: إرسال تنبيه نظام
// ============================================

async function emitMaintenanceAlert(req, res) {
  try {
    const { message, duration } = req.body;

    socketEmitter.emitSystemAlert({
      title: 'تنبيه صيانة',
      message: message || 'سيتم إجراء صيانة للنظام قريباً',
      severity: 'warning',
      metadata: { duration, startTime: new Date().toISOString() },
    });

    res.json({ success: true, message: 'Alert sent to all clients' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Example 4: Emit data change event
// مثال 4: إرسال حدث تغيير البيانات
// ============================================

async function updateTaskWithDataSync(req, res) {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    // Update task logic...
    const updatedTask = {
      id: taskId,
      ...updates,
      updatedAt: new Date(),
    };

    // Emit data change for real-time sync
    socketEmitter.emitDataChange({
      entity: 'task',
      action: 'updated',
      data: updatedTask,
      userId: req.user?.id || 'system',
    });

    res.json({ success: true, task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Example 5: Send notification to specific user
// مثال 5: إرسال إشعار لمستخدم محدد
// ============================================

async function sendUserNotification(req, res) {
  try {
    const { userId, message } = req.body;

    const result = socketEmitter.emitNotification({
      userId,
      type: 'info',
      title: 'إشعار خاص',
      message,
      priority: 'high',
      metadata: { source: 'api' },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Example 6: Get connected clients stats
// مثال 6: الحصول على إحصائيات العملاء المتصلين
// ============================================

async function getSocketStats(req, res) {
  try {
    const { getSubscriptionStats } = require('../sockets/handlers');
    const connectedCount = socketEmitter.getConnectedClientsCount();
    const subscriptions = getSubscriptionStats();

    res.json({
      connectedClients: connectedCount,
      subscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Example 7: Broadcast message to all clients
// مثال 7: بث رسالة لجميع العملاء
// ============================================

async function broadcastAnnouncement(req, res) {
  try {
    const { title, message, type } = req.body;

    socketEmitter.broadcast('announcement', {
      title: title || 'إعلان',
      message,
      type: type || 'info',
    });

    res.json({ success: true, message: 'Announcement broadcast to all clients' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// Export all examples
// ============================================

module.exports = {
  createUserWithNotification,
  createReportWithDashboardUpdate,
  emitMaintenanceAlert,
  updateTaskWithDataSync,
  sendUserNotification,
  getSocketStats,
  broadcastAnnouncement,
};
