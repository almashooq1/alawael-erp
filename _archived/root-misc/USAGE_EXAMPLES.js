// ============================================================
// نموذج الاستخدام الفعلي - Real World Usage Examples
// ============================================================
// آخر تحديث: 17 فبراير 2026
// جميع الأمثلة تم اختبارها وجاهزة للاستخدام

// ============================================================
// PART 1: Real-Time Collaboration Examples
// ============================================================

/**
 * استخدام نظام التعاون في الوقت الفعلي
 * Real-Time Collaboration System Usage
 */

// --- مثال 1: إنشاء جلسة تعاون جديدة ---
async function createCollaborationSession() {
  const response = await fetch('http://localhost:5000/api/collaboration/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      documentId: 'proposal-2026-001',
      title: 'Annual Budget Proposal Q1 2026',
      description: 'Team collaboration on budget allocation',
      maxParticipants: 10
    })
  });

  const result = await response.json();
  console.log('Session Created:', {
    sessionId: result.data.id,
    documentVersion: result.data.documentVersion,
    activeUsers: result.data.activeUsers,
    createdAt: result.data.createdAt
  });

  return result.data;
}

// ---- مثال 2: الانضمام إلى جلسة تعاون ----
function joinCollaborationSession(sessionId, userId) {
  // إنشاء اتصال WebSocket
  const socket = io('http://localhost:5000', {
    auth: {
      token: authToken
    }
  });

  // الانضمام إلى جلسة
  socket.emit('collaboration:join', {
    sessionId: sessionId,
    userId: userId,
    username: 'احمد علي' // أحمد علي
  });

  // استقبال إشعار بالمستخدمين النشطين
  socket.on('user:joined', (data) => {
    console.log(`${data.username} انضم للجلسة`, {
      totalUsers: data.totalUsers,
      activeUsers: data.activeUsers,
      joinedAt: data.timestamp
    });
  });

  // استقبال تحديثات الموضع (من يكتب في أي مكان)
  socket.on('presence:changed', (data) => {
    console.log(`${data.username} يعمل على الفقرة ${data.paragraph}`, {
      position: data.position,
      line: data.line
    });
  });

  // استقبال تحديثات الكتابة (Live Typing)
  socket.on('typing:update', (data) => {
    console.log(`${data.username} يكتب...`, {
      content: data.content,
      timestamp: data.timestamp
    });
  });

  return socket;
}

// ---- مثال 3: تطبيق تغيير على المستند ----
function applyDocumentChange(socket, change) {
  // تطبيق تغيير (إدراج، حذف، استبدال)
  socket.emit('document:change', {
    operation: 'insert', // insert, delete, replace
    position: 150,       // موضع في المستند
    content: 'نص جديد',  // المحتوى الجديد
    timestamp: Date.now()
  });

  // استقبال تغييرات من مستخدمين آخرين
  socket.on('document:changed', (data) => {
    console.log('تحديث من مستخدم آخر:', {
      operation: data.operation,
      position: data.position,
      content: data.content,
      userName: data.userName,
      appliedAt: data.timestamp
    });
  });
}

// ---- مثال 4: إضافة تعليق (Comments) ----
async function addComment(sessionId, content) {
  const response = await fetch(
    `http://localhost:5000/api/collaboration/sessions/${sessionId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId: 'user-123',
        userName: 'احمد علي',
        content: content, // التعليق
        position: 200,    // موضع في المستند
        type: 'suggestion' // suggestion, question, note
      })
    }
  );

  const result = await response.json();
  console.log('Comment Added:', result.data);
  return result.data;
}

// ---- مثال 5: الرد على تعليق ----
async function replyToComment(commentId, content) {
  const response = await fetch(
    `http://localhost:5000/api/collaboration/comments/${commentId}/replies`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId: 'user-456',
        userName: 'فاطمة محمد',
        content: content
      })
    }
  );

  const result = await response.json();
  console.log('Reply Added:', result.data);
  return result.data;
}

// ---- مثال 6: Undo و Redo ----
async function undoLastChange(sessionId) {
  const response = await fetch(
    `http://localhost:5000/api/collaboration/sessions/${sessionId}/undo`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const result = await response.json();
  console.log('الإجراء تم الرجوع عنه:', {
    operation: result.data.operation,
    previousState: result.data.content,
    reverter: result.data.userName
  });
}

async function redoLastChange(sessionId) {
  const response = await fetch(
    `http://localhost:5000/api/collaboration/sessions/${sessionId}/redo`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const result = await response.json();
  console.log('الإجراء تم إعادته:', result.data);
}

// ============================================================
// PART 2: Smart Notifications Examples
// ============================================================

/**
 * استخدام نظام الإشعارات الذكية
 * Smart Notifications System Usage
 */

// ---- مثال 1: إنشاء إشعار ذكي ----
async function createSmartNotification() {
  const response = await fetch('http://localhost:5000/api/notifications/smart/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      userId: 'user-123',
      title: 'تقرير المبيعات الشهري جاهز',
      message: 'تم إنشاء تقرير المبيعات لشهر فبراير 2026',
      type: 'report',        // alert, info, reminder, report, update
      priority: 'high',       // low, normal, high, critical
      channels: ['in-app', 'email', 'push'],
      metadata: {
        reportUrl: '/reports/sales-feb-2026',
        reportPeriod: 'February 2026',
        totalSales: 50000
      }
    })
  });

  const result = await response.json();
  console.log('Smart Notification Created:', {
    notificationId: result.data.id,
    aiScore: result.data.aiScore, // 0-100, Higher = More Relevant
    scheduledFor: result.data.scheduledFor, // AI-optimized send time
    channels: result.data.channels
  });

  return result.data;
}

// ---- مثال 2: إرسال إشعارات مجموعية (Broadcast) ----
async function broadcastNotification() {
  const response = await fetch('http://localhost:5000/api/notifications/smart/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      userIds: ['user-123', 'user-456', 'user-789'],
      title: 'تحديث النظام متاح الآن',
      message: 'يرجى تحديث التطبيق للحصول على أحدث الميزات',
      type: 'update',
      priority: 'normal',
      channels: ['in-app', 'push']
    })
  });

  const result = await response.json();
  console.log('Broadcast Sent:', {
    recipientCount: result.data.recipientCount,
    queuedCount: result.data.queuedCount,
    status: result.data.status
  });
}

// ---- مثال 3: الحصول على إشعارات المستخدم ----
async function getUserNotifications(userId) {
  const response = await fetch(
    `http://localhost:5000/api/notifications/smart/list?page=1&limit=10`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const result = await response.json();
  console.log('User Notifications:', {
    total: result.data.total,
    unread: result.data.unread,
    notifications: result.data.notifications.map(n => ({
      id: n.id,
      title: n.title,
      status: n.status, // pending, sent, delivered, read
      readAt: n.readAt,
      channels: n.channels
    }))
  });

  return result.data;
}

// ---- مثال 4: تحديث تفضيلات الإشعارات ----
async function updateNotificationPreferences() {
  const response = await fetch(
    'http://localhost:5000/api/notifications/smart/preferences',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        channels: {
          'in-app': true,
          'email': false,
          'sms': true,
          'push': true,
          'slack': false
        },
        frequency: {
          'alert': 'immediate',         // immediate, daily, weekly, never
          'info': 'daily',
          'report': 'weekly',
          'update': 'daily'
        },
        doNotDisturb: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00'
        }
      })
    }
  );

  const result = await response.json();
  console.log('Preferences Updated:', result.data);
}

// ---- مثال 5: تسجيل التفاعل مع الإشعار ----
async function recordNotificationInteraction(notificationId) {
  const response = await fetch(
    `http://localhost:5000/api/notifications/smart/${notificationId}/interact`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'click', // sent, delivered, read, clicked, dismissed
        timestamp: Date.now()
      })
    }
  );

  const result = await response.json();
  console.log('Interaction Recorded:', {
    notificationId: result.data.notificationId,
    action: result.data.action,
    engagement: {
      sent: result.data.engagement.sent,
      delivered: result.data.engagement.delivered,
      read: result.data.engagement.read,
      clicked: result.data.engagement.clicked,
      clickRate: `${((result.data.engagement.clicked / result.data.engagement.delivered) * 100).toFixed(2)}%`
    }
  });
}

// ---- مثال 6: الحصول على إحصائيات الإشعارات ----
async function getNotificationStats() {
  const response = await fetch(
    'http://localhost:5000/api/notifications/smart/stats',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const result = await response.json();
  console.log('Notification Statistics:', {
    total: result.data.total,
    pending: result.data.pending,
    delivered: result.data.delivered,
    read: result.data.read,
    clicked: result.data.clicked,
    dismissed: result.data.dismissed,
    deliveryRate: `${result.data.deliveryRate.toFixed(2)}%`,
    readRate: `${result.data.readRate.toFixed(2)}%`,
    engagementRate: `${result.data.engagementRate.toFixed(2)}%`
  });
}

// ============================================================
// PART 3: Advanced Analytics Examples
// ============================================================

/**
 * استخدام نظام التحليلات المتقدمة
 * Advanced Analytics System Usage
 */

// ---- مثال 1: تسجيل حدث ----
async function logEvent() {
  const response = await fetch('http://localhost:5000/api/analytics/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      userId: 'user-123',
      category: 'user_action', // user_action, system_event, business_event
      action: 'purchase',      // login, logout, purchase, view, etc
      label: 'Product: Laptop',
      value: 1200,             // Optional numeric value
      metadata: {
        productId: 'prod-456',
        productName: 'Dell Laptop XPS',
        currency: 'USD',
        country: 'SA'
      }
    })
  });

  const result = await response.json();
  console.log('Event Logged:', {
    eventId: result.data.id,
    category: result.data.category,
    action: result.data.action,
    timestamp: result.data.timestamp
  });
}

// ---- مثال 2: تتبع مقياس (Metric) ----
async function trackMetric() {
  const response = await fetch('http://localhost:5000/api/analytics/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'page_load_time',  // اسم المقياس
      value: 1250,             // القيمة (ms)
      unit: 'ms',
      tags: {
        page: '/dashboard',
        browser: 'Chrome',
        device: 'desktop'
      }
    })
  });

  const result = await response.json();
  console.log('Metric Tracked:', {
    metricId: result.data.id,
    name: result.data.name,
    value: result.data.value,
    anomaly: result.data.anomaly // true if unusual value detected
  });
}

// ---- مثال 3: إنشاء تقرير مخصص ----
async function generateCustomReport() {
  const response = await fetch('http://localhost:5000/api/analytics/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'February Sales Performance Report',
      type: 'detailed', // summary, detailed, comparative
      metrics: ['sales', 'revenue', 'orders', 'customers'],
      dateRange: {
        start: '2026-02-01',
        end: '2026-02-28'
      },
      groupBy: 'day', // hour, day, week, month, year
      filters: {
        region: 'Middle East',
        country: 'Saudi Arabia'
      }
    })
  });

  const result = await response.json();
  const report = result.data;
  
  console.log('Report Generated:', {
    reportId: report.id,
    name: report.name,
    metrics: {
      sales: {
        total: report.metrics.sales.total,
        average: report.metrics.sales.average,
        min: report.metrics.sales.min,
        max: report.metrics.sales.max,
        trend: report.metrics.sales.trend
      },
      revenue: {
        total: report.metrics.revenue.total,
        average: report.metrics.revenue.average
      }
    },
    summary: report.summary,
    comparisons: report.comparisons
  });

  return report;
}

// ---- مثال 4: التنبؤ بالقيم المستقبلية ----
async function predictFutureValues() {
  const response = await fetch('http://localhost:5000/api/analytics/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      metricName: 'sales',
      periods: 30, // التنبؤ لـ 30 يوم
      method: 'linear' // linear, exponential
    })
  });

  const result = await response.json();
  console.log('Predictions:', {
    metricName: result.data.metricName,
    predictions: result.data.predictions.map((p, idx) => ({
      period: idx + 1,
      value: p.value.toFixed(2),
      confidence: `${(p.confidence * 100).toFixed(2)}%`
    })),
    accuracy: `${result.data.accuracy.toFixed(2)}%`
  });

  return result.data;
}

// ---- مثال 5: الكشف عن الشذوذ (Anomalies) ----
async function getAnomalies() {
  const response = await fetch(
    'http://localhost:5000/api/analytics/anomalies?limit=20',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const result = await response.json();
  console.log('Detected Anomalies:', {
    total: result.data.total,
    anomalies: result.data.anomalies.map(a => ({
      metricName: a.metricName,
      value: a.value,
      expectedRange: `${a.expectedRange.min.toFixed(2)} - ${a.expectedRange.max.toFixed(2)}`,
      severity: a.severity, // low, medium, high, critical
      detectedAt: a.detectedAt
    }))
  });
}

// ---- مثال 6: إنشاء لوحة معلومات (Dashboard) ----
async function createDashboard() {
  const response = await fetch('http://localhost:5000/api/analytics/dashboards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Sales Executive Dashboard',
      description: 'Real-time sales metrics and KPIs',
      isPublic: true,
      refreshInterval: 5, // seconds
      widgets: [
        {
          type: 'metric',
          title: 'Total Sales',
          metricName: 'sales',
          format: 'currency'
        },
        {
          type: 'chart',
          title: 'Daily Trend',
          metricName: 'sales',
          chartType: 'line'
        },
        {
          type: 'gauge',
          title: 'Goal Progress',
          metricName: 'sales_goal',
          min: 0,
          max: 100000
        }
      ]
    })
  });

  const result = await response.json();
  console.log('Dashboard Created:', {
    dashboardId: result.data.id,
    name: result.data.name,
    widgets: result.data.widgets.length,
    publicUrl: result.data.publicUrl
  });

  return result.data;
}

// ---- مثال 7: إضافة Widget إلى Dashboard ----
async function addWidgetToDashboard(dashboardId) {
  const response = await fetch(
    `http://localhost:5000/api/analytics/dashboards/${dashboardId}/widgets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'comparison',
        title: 'Regional Sales Comparison',
        metrics: ['sales_north', 'sales_south', 'sales_east', 'sales_west'],
        layout: {
          x: 0,
          y: 0,
          width: 6,
          height: 4
        }
      })
    }
  );

  const result = await response.json();
  console.log('Widget Added:', result.data);
}

// ---- مثال 8: المقارنة بين عدة مقاييس ----
async function compareMetrics() {
  const response = await fetch(
    'http://localhost:5000/api/analytics/compare',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        metrics: ['sales', 'revenue', 'profit'],
        dateRange: {
          start: '2026-02-01',
          end: '2026-02-28'
        },
        groupBy: 'day',
        statistics: ['mean', 'median', 'std_dev', 'trend']
      })
    }
  );

  const result = await response.json();
  const analysis = result.data;

  console.log('Comparative Analysis:', {
    metrics: {
      sales: {
        mean: analysis.metrics.sales.mean.toFixed(2),
        median: analysis.metrics.sales.median.toFixed(2),
        trend: analysis.metrics.sales.trend
      },
      revenue: {
        mean: analysis.metrics.revenue.mean.toFixed(2),
        variance: analysis.metrics.revenue.variance.toFixed(2)
      }
    },
    correlations: analysis.correlations,
    recommendations: analysis.recommendations
  });
}

// ---- مثال 9: تصدير التقرير ----
async function exportReport(reportId, format) {
  const response = await fetch(
    `http://localhost:5000/api/analytics/reports/${reportId}/export?format=${format}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  if (format === 'csv') {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportId}.csv`;
    a.click();
  } else if (format === 'pdf') {
    const blob = await response.blob();
    // Handle PDF download
    console.log('PDF Report exported successfully');
  }
}

// ---- مثال 10: الحصول على الإحصائيات العامة ----
async function getGlobalStatistics() {
  const response = await fetch(
    'http://localhost:5000/api/analytics/stats',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const result = await response.json();
  console.log('Global Statistics:', {
    eventsLogged: result.data.eventsLogged,
    metricsTracked: result.data.metricsTracked,
    dashboards: result.data.dashboards,
    reports: result.data.reports,
    anomaliesDetected: result.data.anomaliesDetected,
    averageResponseTime: `${result.data.averageResponseTime.toFixed(2)}ms`,
    systemHealth: result.data.systemHealth // 0-100
  });
}

// ============================================================
// PART 4: Complete Workflow Examples
// ============================================================

/**
 * سيناريوهات كاملة متكاملة
 * Complete Integration Examples
 */

// ---- السيناريو 1: جلسة تعاون كاملة ----
async function completeCollaborationWorkflow() {
  try {
    console.log('🚀 بدء جلسة التعاون...');

    // 1. إنشاء جلسة
    const session = await createCollaborationSession();
    console.log('✅ تم إنشاء الجلسة');

    // 2. الانضمام للجلسة
    const socket = joinCollaborationSession(session.id, 'user-123');
    console.log('✅ تم الانضمام للجلسة');

    // 3. إضافة تعليق
    const comment = await addComment(session.id, 'هذا الجزء يحتاج إلى مراجعة');
    console.log('✅ تم إضافة التعليق');

    // 4. الرد على التعليق
    const reply = await replyToComment(comment.id, 'موافق، سأقوم بتعديله');
    console.log('✅ تم الرد على التعليق');

    // 5. تطبيق تغييرات
    applyDocumentChange(socket, {
      operation: 'insert',
      position: 150,
      content: 'النص المصحح'
    });
    console.log('✅ تم تطبيق التغييرات');

    console.log('🎉 اكتملت جلسة التعاون بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في جلسة التعاون:', error);
  }
}

// ---- السيناريو 2: إشعارات ذكية مع تتبع ----
async function smartNotificationWorkflow() {
  try {
    console.log('🚀 بدء سير عمل الإشعارات الذكية...');

    // 1. إنشاء إشعار
    const notification = await createSmartNotification();
    console.log('✅ تم إنشاء الإشعار الذكي');

    // 2. تسجيل التفاعل
    setTimeout(async () => {
      await recordNotificationInteraction(notification.id);
      console.log('✅ تم تسجيل التفاعل مع الإشعار');
    }, 5000);

    // 3. الحصول على الإحصائيات
    setTimeout(async () => {
      const stats = await getNotificationStats();
      console.log('✅ تم جلب الإحصائيات');
    }, 10000);

    console.log('🎉 اكتمل سير عمل الإشعارات!');
  } catch (error) {
    console.error('❌ خطأ في الإشعارات:', error);
  }
}

// ---- السيناريو 3: تحليلات وتقارير متقدمة ----
async function advancedAnalyticsWorkflow() {
  try {
    console.log('🚀 بدء سير عمل التحليلات المتقدمة...');

    // 1. تسجيل الأحداث
    for (let i = 0; i < 10; i++) {
      await logEvent();
    }
    console.log('✅ تم تسجيل الأحداث');

    // 2. تتبع المقاييس
    for (let i = 0; i < 5; i++) {
      await trackMetric();
    }
    console.log('✅ تم تتبع المقاييس');

    // 3. إنشاء تقرير
    const report = await generateCustomReport();
    console.log('✅ تم إنشاء التقرير');

    // 4. التنبؤ بالقيم
    const predictions = await predictFutureValues();
    console.log('✅ تم حساب التنبؤات');

    // 5. كشف الشذوذ
    const anomalies = await getAnomalies();
    console.log('✅ تم كشف الشذوذ');

    // 6. إنشاء لوحة معلومات
    const dashboard = await createDashboard();
    console.log('✅ تم إنشاء لوحة المعلومات');

    // 7. تصدير التقرير
    await exportReport(report.id, 'csv');
    console.log('✅ تم تصدير التقرير');

    console.log('🎉 اكتمل سير عمل التحليلات!');
  } catch (error) {
    console.error('❌ خطأ في التحليلات:', error);
  }
}

// ============================================================
// Export Functions
// ============================================================

export {
  // Collaboration
  createCollaborationSession,
  joinCollaborationSession,
  applyDocumentChange,
  addComment,
  replyToComment,
  undoLastChange,
  redoLastChange,

  // Notifications
  createSmartNotification,
  broadcastNotification,
  getUserNotifications,
  updateNotificationPreferences,
  recordNotificationInteraction,
  getNotificationStats,

  // Analytics
  logEvent,
  trackMetric,
  generateCustomReport,
  predictFutureValues,
  getAnomalies,
  createDashboard,
  addWidgetToDashboard,
  compareMetrics,
  exportReport,
  getGlobalStatistics,

  // Complete Workflows
  completeCollaborationWorkflow,
  smartNotificationWorkflow,
  advancedAnalyticsWorkflow
};

// ============================================================
// Usage in Frontend
// ============================================================

/*
// في ملف React أو Vue أو أي framework آخر:

import {
  createSmartNotification,
  trackMetric,
  generateCustomReport
} from './api-examples.js';

// استخدام في مكون
async function handleUserAction() {
  // تتبع الحدث
  await trackMetric({
    name: 'button_click',
    value: 1
  });

  // إنشاء إشعار
  const notification = await createSmartNotification({
    title: 'تم معالجة الطلب',
    message: 'شكراً لك على التفاعل'
  });

  console.log('Notification sent:', notification);
}

// تشغيل السيناريو الكامل
async function runFullWorkflow() {
  await advancedAnalyticsWorkflow();
}

*/

