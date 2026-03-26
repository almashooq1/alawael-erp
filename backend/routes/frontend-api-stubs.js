/**
 * frontend-api-stubs.js
 * ─────────────────────
 * Stub routes for all frontend API endpoints that don't have dedicated backend
 * route files yet. Returns realistic Arabic mock data so the frontend renders
 * correctly without 404 errors.
 *
 * These stubs are grouped by feature and mounted under their respective
 * prefixes in app.js.
 */

const express = require('express');

// ════════════════════════════════════════════════════════════════════════════
// Use the centralized auth middleware — no parallel JWT verification
// ════════════════════════════════════════════════════════════════════════════
const { requireAuth } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════════════════════
//  /api/admin
// ════════════════════════════════════════════════════════════════════════════
const adminRouter = express.Router();

adminRouter.get('/overview', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 156,
      activeUsers: 89,
      totalModules: 12,
      activeModules: 10,
      systemHealth: 'good',
      uptime: '99.8%',
      storageUsed: '12.4 GB',
      storageTotal: '100 GB',
      lastBackup: new Date(Date.now() - 3600000).toISOString(),
    },
  });
});

adminRouter.get('/users', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        name: 'أحمد محمد',
        email: 'ahmed@alawael.com',
        role: 'admin',
        status: 'active',
        lastLogin: new Date().toISOString(),
      },
      {
        _id: '2',
        name: 'فاطمة علي',
        email: 'fatima@alawael.com',
        role: 'manager',
        status: 'active',
        lastLogin: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        _id: '3',
        name: 'محمد خالد',
        email: 'mohammed@alawael.com',
        role: 'therapist',
        status: 'active',
        lastLogin: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        _id: '4',
        name: 'نورة سعد',
        email: 'noura@alawael.com',
        role: 'teacher',
        status: 'active',
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: '5',
        name: 'عبدالله أحمد',
        email: 'abdullah@alawael.com',
        role: 'staff',
        status: 'inactive',
        lastLogin: new Date(Date.now() - 604800000).toISOString(),
      },
    ],
    total: 5,
  });
});

adminRouter.get('/alerts', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        type: 'warning',
        message: 'استخدام الذاكرة مرتفع - 85%',
        timestamp: new Date().toISOString(),
        resolved: false,
      },
      {
        _id: '2',
        type: 'info',
        message: 'تم تحديث النظام بنجاح',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        resolved: true,
      },
      {
        _id: '3',
        type: 'error',
        message: 'فشل في الاتصال بخدمة البريد',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        resolved: true,
      },
    ],
  });
});

adminRouter.get('/settings', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      general: {
        systemName: 'نظام إدارة العيادات الشامل',
        systemVersion: 'v2.5.0',
        description: 'نظام متكامل لإدارة العيادات والمراكز التأهيلية',
        language: 'ar',
        supportLevel: 'premium',
      },
      security: {
        twoFactorAuth: true,
        encryptData: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        ipWhitelist: false,
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        notificationEmail: 'admin@clinic.sa',
        smsPhone: '+966501234567',
      },
      database: {
        serverName: 'mongodb.clinic.sa',
        port: 27017,
        databaseName: 'clinic_db',
        username: 'admin_user',
        autoBackup: true,
        backupFrequency: 24,
      },
      email: {
        smtpServer: 'smtp.gmail.com',
        smtpPort: 587,
        fromEmail: 'noreply@clinic.sa',
        fromName: 'نظام العيادة',
        enableSSL: true,
      },
    },
  });
});

adminRouter.get('/reports', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalSessions: 487,
      completionRate: 89,
      averageRating: 4.6,
      improvementRate: 72,
      monthlyTrends: [
        { month: 'يناير', completed: 45, scheduled: 52, cancelled: 3 },
        { month: 'فبراير', completed: 52, scheduled: 48, cancelled: 2 },
        { month: 'مارس', completed: 58, scheduled: 45, cancelled: 4 },
        { month: 'أبريل', completed: 62, scheduled: 50, cancelled: 2 },
        { month: 'مايو', completed: 68, scheduled: 55, cancelled: 3 },
      ],
      userDistribution: [
        { role: 'معالجون', active: 26, inactive: 2 },
        { role: 'طلاب', active: 73, inactive: 14 },
        { role: 'آباء', active: 42, inactive: 8 },
        { role: 'إدارة', active: 3, inactive: 1 },
      ],
      sessionTypes: [
        { name: 'فردية', value: 245 },
        { name: 'جماعية', value: 156 },
        { name: 'متابعة', value: 86 },
      ],
      performanceMetrics: [
        { x: 1, y: 85 },
        { x: 2, y: 88 },
        { x: 3, y: 92 },
        { x: 4, y: 95 },
        { x: 5, y: 93 },
      ],
      summary: [
        { metric: 'إجمالي الجلسات', value: 487, change: '+23', percentage: 5 },
        { metric: 'معدل الرضا', value: '4.6/5', change: '+0.2', percentage: 4 },
        { metric: 'معدل الحضور', value: '89%', change: '+3%', percentage: 3 },
        { metric: 'المرضى النشطون', value: 73, change: '+8', percentage: 12 },
      ],
    },
  });
});

adminRouter.get('/audit-logs', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'log001',
        userId: 'user001',
        userName: 'أحمد محمد',
        action: 'دخول',
        description: 'تسجيل دخول ناجح إلى لوحة التحكم',
        details: 'دخول من المتصفح Chrome على Windows',
        ipAddress: '192.168.1.100',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'نجاح',
      },
      {
        id: 'log002',
        userId: 'user002',
        userName: 'فاطمة علي',
        action: 'إنشاء',
        description: 'إنشاء حالة مريض جديد',
        details: 'اسم المريض: محمد علي - التشخيص: تأخر نطق',
        ipAddress: '192.168.1.101',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'نجاح',
      },
      {
        id: 'log003',
        userId: 'user003',
        userName: 'محمود حسن',
        action: 'تعديل',
        description: 'تحديث خطة علاجية',
        details: 'تعديل عدد الجلسات الأسبوعية',
        ipAddress: '192.168.1.102',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        status: 'نجاح',
      },
      {
        id: 'log004',
        userId: 'user001',
        userName: 'أحمد محمد',
        action: 'حذف',
        description: 'حذف حساب مستخدم غير نشط',
        details: 'حذف حساب مستخدم غير مفعل',
        ipAddress: '192.168.1.100',
        timestamp: new Date(Date.now() - 28800000).toISOString(),
        status: 'نجاح',
      },
      {
        id: 'log005',
        userId: 'user004',
        userName: 'سارة عبدالله',
        action: 'دخول',
        description: 'محاولة دخول فاشلة',
        details: 'كلمة المرور غير صحيحة',
        ipAddress: '192.168.1.103',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        status: 'فشل',
      },
    ],
  });
});

adminRouter.get('/clinics', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'clinic001',
        name: 'عيادة الرياض الرئيسية',
        code: 'RYD-001',
        address: 'شارع الملك فهد، حي المربع',
        city: 'الرياض',
        phone: '0114234567',
        email: 'riyadh@clinic.sa',
        staffCount: 15,
        roomCount: 8,
        capacity: 120,
        status: 'نشطة',
        lastUpdate: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'clinic002',
        name: 'عيادة جدة الفرعية',
        code: 'JDD-001',
        address: 'شارع الملك عبدالعزيز، حي الزاهر',
        city: 'جدة',
        phone: '0125678901',
        email: 'jeddah@clinic.sa',
        staffCount: 12,
        roomCount: 6,
        capacity: 90,
        status: 'نشطة',
        lastUpdate: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: 'clinic003',
        name: 'عيادة الدمام',
        code: 'DAM-001',
        address: 'شارع الملك سعود، حي الدفان',
        city: 'الدمام',
        phone: '0138765432',
        email: 'dammam@clinic.sa',
        staffCount: 8,
        roomCount: 4,
        capacity: 60,
        status: 'نشطة',
        lastUpdate: new Date(Date.now() - 259200000).toISOString(),
      },
    ],
  });
});

adminRouter.get('/notifications', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'notif001',
        title: 'تحديث الصيانة المخطط',
        message: 'سيتم إجراء صيانة دورية للنظام يوم الجمعة من الساعة 2 إلى 4 مساءً',
        type: 'معلومة',
        priority: 'متوسطة',
        status: 'مرسلة',
        recipientCount: 156,
        sendDate: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'notif002',
        title: 'تنبيه أمني مهم',
        message: 'تم اكتشاف نشاط مريب، يرجى التحقق من إعدادات الأمان',
        type: 'تحذير',
        priority: 'عالية',
        status: 'مرسلة',
        recipientCount: 28,
        sendDate: new Date().toISOString(),
      },
      {
        id: 'notif003',
        title: 'تذكير الجلسات الأسبوعية',
        message: 'تذكير بالجلسات المجدولة للأسبوع القادم',
        type: 'تذكير',
        priority: 'منخفضة',
        status: 'قيد الإرسال',
        recipientCount: 87,
        sendDate: new Date().toISOString(),
      },
      {
        id: 'notif004',
        title: 'تحديث سياسة الخصوصية',
        message: 'تم تحديث سياسة الخصوصية والشروط - يرجى المراجعة',
        type: 'معلومة',
        priority: 'متوسطة',
        status: 'مرسلة',
        recipientCount: 156,
        sendDate: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/account
// ════════════════════════════════════════════════════════════════════════════
const accountRouter = express.Router();

accountRouter.get('/security', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      mfaEnabled: false,
      mfaMethod: null,
      passwordLastChanged: new Date(Date.now() - 30 * 86400000).toISOString(),
      loginNotifications: true,
      trustedDevices: 2,
    },
  });
});

accountRouter.put('/security', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تحديث إعدادات الأمان' });
});

accountRouter.get('/sessions', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 's1',
        device: 'Chrome - Windows',
        ip: '192.168.1.10',
        lastActive: new Date().toISOString(),
        current: true,
      },
      {
        _id: 's2',
        device: 'Safari - iPhone',
        ip: '192.168.1.15',
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        current: false,
      },
    ],
  });
});

accountRouter.delete('/sessions/:sessionId', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم إنهاء الجلسة' });
});

accountRouter.post('/sessions/logout-all', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج من جميع الأجهزة' });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/payments
// ════════════════════════════════════════════════════════════════════════════
const paymentsRouter = express.Router();

paymentsRouter.get('/all', requireAuth, (req, res) => {
  res.json({ success: true, data: paymentsData(), total: 6 });
});

paymentsRouter.get('/history', requireAuth, (req, res) => {
  res.json({ success: true, data: paymentsData(), total: 6 });
});

paymentsRouter.post('/stripe', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تمت معالجة الدفع عبر Stripe',
    transactionId: 'str_' + Date.now(),
  });
});

paymentsRouter.post('/paypal', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تمت معالجة الدفع عبر PayPal',
    transactionId: 'pp_' + Date.now(),
  });
});

paymentsRouter.post('/installment', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم إنشاء خطة التقسيط', planId: 'inst_' + Date.now() });
});

paymentsRouter.post('/subscriptions/create', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم إنشاء الاشتراك', subscriptionId: 'sub_' + Date.now() });
});

paymentsRouter.get('/subscriptions/active', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      plan: 'professional',
      status: 'active',
      nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  });
});

function paymentsData() {
  return [
    {
      _id: 'p1',
      amount: 1500,
      currency: 'SAR',
      status: 'completed',
      method: 'credit_card',
      description: 'رسوم الفصل الدراسي',
      date: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      _id: 'p2',
      amount: 750,
      currency: 'SAR',
      status: 'completed',
      method: 'bank_transfer',
      description: 'رسوم النقل',
      date: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      _id: 'p3',
      amount: 2000,
      currency: 'SAR',
      status: 'pending',
      method: 'installment',
      description: 'رسوم العلاج الطبيعي',
      date: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      _id: 'p4',
      amount: 500,
      currency: 'SAR',
      status: 'completed',
      method: 'credit_card',
      description: 'رسوم الكتب والمواد',
      date: new Date(Date.now() - 345600000).toISOString(),
    },
    {
      _id: 'p5',
      amount: 3000,
      currency: 'SAR',
      status: 'completed',
      method: 'paypal',
      description: 'رسوم التسجيل السنوي',
      date: new Date(Date.now() - 604800000).toISOString(),
    },
    {
      _id: 'p6',
      amount: 1200,
      currency: 'SAR',
      status: 'refunded',
      method: 'credit_card',
      description: 'استرداد رسوم',
      date: new Date(Date.now() - 864000000).toISOString(),
    },
  ];
}

// ════════════════════════════════════════════════════════════════════════════
//  /api/monitoring  (supplement the existing monitoring.js)
// ════════════════════════════════════════════════════════════════════════════
const monitoringRouter = express.Router();

monitoringRouter.get('/dashboard', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      cpu: Math.round(30 + Math.random() * 40),
      memory: Math.round(50 + Math.random() * 30),
      disk: 64,
      networkIn: Math.round(Math.random() * 1000),
      networkOut: Math.round(Math.random() * 500),
      activeConnections: Math.round(20 + Math.random() * 80),
      responseTime: Math.round(50 + Math.random() * 150),
      requestsPerSecond: Math.round(10 + Math.random() * 90),
      errorRate: +(Math.random() * 2).toFixed(2),
      uptime: '99.95%',
      services: [
        { name: 'API Server', status: 'running', uptime: '99.99%' },
        { name: 'Database', status: 'running', uptime: '99.95%' },
        { name: 'Cache (Redis)', status: 'running', uptime: '99.90%' },
        { name: 'WebSocket', status: 'running', uptime: '99.85%' },
        { name: 'Background Jobs', status: 'running', uptime: '99.80%' },
      ],
    },
  });
});

monitoringRouter.get('/cache', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      hitRate: 92.5,
      missRate: 7.5,
      totalKeys: 1247,
      memoryUsed: '128 MB',
      memoryTotal: '512 MB',
      evictedKeys: 23,
      connectedClients: 8,
    },
  });
});

monitoringRouter.get('/queries', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalQueries: 15234,
      avgResponseTime: '45ms',
      slowQueries: 12,
      activeQueries: 3,
      topCollections: [
        { name: 'users', queries: 5420, avgTime: '12ms' },
        { name: 'beneficiaries', queries: 3210, avgTime: '25ms' },
        { name: 'sessions', queries: 2890, avgTime: '18ms' },
        { name: 'documents', queries: 1950, avgTime: '35ms' },
        { name: 'reports', queries: 1764, avgTime: '42ms' },
      ],
    },
  });
});

monitoringRouter.get('/realtime', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      cpu: Math.round(30 + Math.random() * 40),
      memory: Math.round(50 + Math.random() * 30),
      activeRequests: Math.round(5 + Math.random() * 20),
      responseTime: Math.round(40 + Math.random() * 100),
      timestamp: new Date().toISOString(),
    },
  });
});

monitoringRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

monitoringRouter.get('/metrics', (req, res) => {
  res.json({ success: true, data: { requestCount: 25410, errorCount: 34, avgLatency: 67 } });
});

monitoringRouter.get('/endpoints', (req, res) => {
  res.json({ success: true, data: [] });
});

monitoringRouter.get('/alerts', (req, res) => {
  res.json({ success: true, data: [] });
});

monitoringRouter.get('/database', (req, res) => {
  res.json({ success: true, data: { status: 'connected', collections: 24, avgQueryTime: '15ms' } });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/ai-predictions
// ════════════════════════════════════════════════════════════════════════════
const aiPredictionsRouter = express.Router();

aiPredictionsRouter.get('/predictions/:userId', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'pred1',
        type: 'performance',
        title: 'توقع تحسن الأداء',
        value: 85,
        trend: 'up',
        confidence: 0.92,
        description: 'من المتوقع تحسن الأداء بنسبة 15% خلال الشهر القادم',
      },
      {
        _id: 'pred2',
        type: 'attendance',
        title: 'توقع الحضور',
        value: 94,
        trend: 'stable',
        confidence: 0.88,
        description: 'معدل الحضور المتوقع مستقر عند 94%',
      },
      {
        _id: 'pred3',
        type: 'engagement',
        title: 'مستوى التفاعل',
        value: 78,
        trend: 'up',
        confidence: 0.85,
        description: 'تحسن ملحوظ في مستوى التفاعل مع الأنشطة',
      },
      {
        _id: 'pred4',
        type: 'risk',
        title: 'مؤشر المخاطر',
        value: 12,
        trend: 'down',
        confidence: 0.9,
        description: 'انخفاض في مؤشر المخاطر - وضع إيجابي',
      },
    ],
  });
});

aiPredictionsRouter.get('/recommendations/:userId', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'rec1',
        priority: 'high',
        title: 'زيادة جلسات العلاج الطبيعي',
        description: 'يُنصح بزيادة الجلسات الأسبوعية من 2 إلى 3 بناءً على التقدم الملحوظ',
        category: 'therapy',
      },
      {
        _id: 'rec2',
        priority: 'medium',
        title: 'تعديل الخطة التعليمية',
        description: 'تحديث المواد التعليمية لتتناسب مع مستوى التقدم الحالي',
        category: 'education',
      },
      {
        _id: 'rec3',
        priority: 'low',
        title: 'مراجعة الأدوية',
        description: 'موعد المراجعة الدورية للأدوية خلال الأسبوع القادم',
        category: 'medical',
      },
      {
        _id: 'rec4',
        priority: 'medium',
        title: 'إشراك الأسرة',
        description: 'تنظيم جلسة توعية للأسرة حول أساليب الدعم المنزلي',
        category: 'family',
      },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/hr-system
// ════════════════════════════════════════════════════════════════════════════
const hrSystemRouter = express.Router();

hrSystemRouter.get('/attendance', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'a1',
        employeeName: 'أحمد محمد',
        department: 'التأهيل',
        date: new Date().toISOString().split('T')[0],
        checkIn: '08:00',
        checkOut: '16:00',
        status: 'present',
        hoursWorked: 8,
      },
      {
        _id: 'a2',
        employeeName: 'فاطمة علي',
        department: 'التعليم',
        date: new Date().toISOString().split('T')[0],
        checkIn: '07:45',
        checkOut: '15:45',
        status: 'present',
        hoursWorked: 8,
      },
      {
        _id: 'a3',
        employeeName: 'خالد سعد',
        department: 'الإدارة',
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:00',
        checkOut: null,
        status: 'present',
        hoursWorked: null,
      },
      {
        _id: 'a4',
        employeeName: 'نورة أحمد',
        department: 'المالية',
        date: new Date().toISOString().split('T')[0],
        checkIn: null,
        checkOut: null,
        status: 'absent',
        hoursWorked: 0,
      },
      {
        _id: 'a5',
        employeeName: 'عبدالله خالد',
        department: 'التأهيل',
        date: new Date().toISOString().split('T')[0],
        checkIn: '08:30',
        checkOut: '16:30',
        status: 'present',
        hoursWorked: 8,
      },
    ],
    total: 5,
  });
});

hrSystemRouter.get('/payroll', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'pr1',
        employeeName: 'أحمد محمد',
        baseSalary: 12000,
        allowances: 3000,
        deductions: 1200,
        netSalary: 13800,
        currency: 'SAR',
        month: new Date().toISOString().slice(0, 7),
        status: 'paid',
      },
      {
        _id: 'pr2',
        employeeName: 'فاطمة علي',
        baseSalary: 10000,
        allowances: 2500,
        deductions: 1000,
        netSalary: 11500,
        currency: 'SAR',
        month: new Date().toISOString().slice(0, 7),
        status: 'paid',
      },
      {
        _id: 'pr3',
        employeeName: 'خالد سعد',
        baseSalary: 15000,
        allowances: 4000,
        deductions: 1500,
        netSalary: 17500,
        currency: 'SAR',
        month: new Date().toISOString().slice(0, 7),
        status: 'pending',
      },
      {
        _id: 'pr4',
        employeeName: 'نورة أحمد',
        baseSalary: 9000,
        allowances: 2000,
        deductions: 900,
        netSalary: 10100,
        currency: 'SAR',
        month: new Date().toISOString().slice(0, 7),
        status: 'paid',
      },
    ],
    total: 4,
  });
});

hrSystemRouter.get('/leaves', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'l1',
        employeeName: 'أحمد محمد',
        type: 'annual',
        startDate: '2026-03-10',
        endDate: '2026-03-14',
        days: 5,
        status: 'approved',
        reason: 'إجازة سنوية',
      },
      {
        _id: 'l2',
        employeeName: 'فاطمة علي',
        type: 'sick',
        startDate: '2026-03-05',
        endDate: '2026-03-06',
        days: 2,
        status: 'approved',
        reason: 'إجازة مرضية',
      },
      {
        _id: 'l3',
        employeeName: 'نورة أحمد',
        type: 'annual',
        startDate: '2026-03-15',
        endDate: '2026-03-20',
        days: 6,
        status: 'pending',
        reason: 'إجازة عائلية',
      },
    ],
    total: 3,
  });
});

hrSystemRouter.post('/attendance/checkin', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الحضور بنجاح',
    checkInTime: new Date().toISOString(),
  });
});

hrSystemRouter.post('/attendance/checkout', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الانصراف بنجاح',
    checkOutTime: new Date().toISOString(),
  });
});

hrSystemRouter.get('/performance-reviews', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'pr1',
        employeeName: 'أحمد محمد',
        reviewPeriod: '2026-03',
        type: 'quarterly',
        overallRating: 4.2,
        status: 'completed',
      },
      {
        _id: 'pr2',
        employeeName: 'سارة أحمد',
        reviewPeriod: '2026-03',
        type: 'quarterly',
        overallRating: 3.8,
        status: 'draft',
      },
    ],
  });
});

hrSystemRouter.post('/performance-reviews', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء التقييم بنجاح',
    data: {
      _id: 'pr_' + Date.now(),
      ...req.body,
      status: 'draft',
      createdAt: new Date().toISOString(),
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/integrated-care
// ════════════════════════════════════════════════════════════════════════════
const integratedCareRouter = express.Router();

integratedCareRouter.post('/sessions', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الجلسة بنجاح',
    data: { _id: 'ses_' + Date.now(), ...req.body, createdAt: new Date().toISOString() },
  });
});

integratedCareRouter.post('/plans', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء خطة الرعاية بنجاح',
    data: { _id: 'plan_' + Date.now(), ...req.body, createdAt: new Date().toISOString() },
  });
});

integratedCareRouter.get('/plans', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'plan_1',
        beneficiary: { _id: 'st1', name: 'أحمد علي' },
        planType: 'individual',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        _id: 'plan_2',
        beneficiary: { _id: 'st2', name: 'سارة خالد' },
        planType: 'individual',
        status: 'DRAFT',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        _id: 'plan_3',
        title: 'برنامج المهارات الحياتية',
        planType: 'group',
        domain: 'مهارات حياتية',
        participants: ['st1', 'st2', 'st3'],
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
    ],
  });
});

integratedCareRouter.get('/sessions', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'ses_1',
        title: 'جلسة علاج طبيعي',
        type: 'therapy',
        therapist: { name: 'د. فاطمة العلي' },
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: 'ses_2',
        title: 'جلسة تعليمية',
        type: 'educational',
        therapist: { name: 'أ. محمد السالم' },
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/security
// ════════════════════════════════════════════════════════════════════════════
const securityRouter = express.Router();

securityRouter.get('/logs/me', requireAuth, (req, res) => {
  const now = Date.now();
  res.json({
    success: true,
    data: [
      {
        _id: 's1',
        action: 'login',
        ip: '192.168.1.10',
        device: 'Chrome / Windows',
        location: 'الرياض',
        timestamp: new Date(now - 1800000).toISOString(),
        status: 'success',
      },
      {
        _id: 's2',
        action: 'password_change',
        ip: '192.168.1.10',
        device: 'Chrome / Windows',
        location: 'الرياض',
        timestamp: new Date(now - 86400000).toISOString(),
        status: 'success',
      },
      {
        _id: 's3',
        action: 'login',
        ip: '10.0.0.5',
        device: 'Safari / iPhone',
        location: 'جدة',
        timestamp: new Date(now - 172800000).toISOString(),
        status: 'success',
      },
      {
        _id: 's4',
        action: 'login_failed',
        ip: '192.168.1.100',
        device: 'Firefox / Linux',
        location: 'غير معروف',
        timestamp: new Date(now - 259200000).toISOString(),
        status: 'failed',
      },
      {
        _id: 's5',
        action: 'settings_update',
        ip: '192.168.1.10',
        device: 'Chrome / Windows',
        location: 'الرياض',
        timestamp: new Date(now - 345600000).toISOString(),
        status: 'success',
      },
    ],
  });
});

securityRouter.post('/mfa/setup', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إعداد المصادقة الثنائية',
    qrCode: 'data:image/png;base64,mockQRcode',
    secret: 'MOCK_ONLY_NOT_FOR_PRODUCTION',
  });
});

securityRouter.post('/mfa/enable', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تفعيل المصادقة الثنائية بنجاح' });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/organization
// ════════════════════════════════════════════════════════════════════════════
const organizationRouter = express.Router();

organizationRouter.get('/structure', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'مركز الأوائل للتأهيل',
      type: 'root',
      children: [
        {
          name: 'الإدارة العامة',
          type: 'department',
          manager: 'أحمد محمد',
          employeeCount: 5,
          children: [
            { name: 'الموارد البشرية', type: 'department', manager: 'فاطمة علي', employeeCount: 3 },
            { name: 'المالية', type: 'department', manager: 'نورة سعد', employeeCount: 4 },
            {
              name: 'تقنية المعلومات',
              type: 'department',
              manager: 'عبدالله أحمد',
              employeeCount: 6,
            },
          ],
        },
        {
          name: 'قسم التأهيل',
          type: 'department',
          manager: 'خالد سعد',
          employeeCount: 12,
          children: [
            { name: 'العلاج الطبيعي', type: 'unit', manager: 'سارة محمد', employeeCount: 4 },
            { name: 'العلاج الوظيفي', type: 'unit', manager: 'منى خالد', employeeCount: 3 },
            { name: 'النطق والتخاطب', type: 'unit', manager: 'رنا أحمد', employeeCount: 3 },
          ],
        },
        {
          name: 'قسم التعليم',
          type: 'department',
          manager: 'هند محمد',
          employeeCount: 10,
          children: [
            { name: 'التعليم الأساسي', type: 'unit', manager: 'ليلى سعد', employeeCount: 5 },
            { name: 'التعليم المتقدم', type: 'unit', manager: 'أمل خالد', employeeCount: 3 },
          ],
        },
      ],
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/communications
// ════════════════════════════════════════════════════════════════════════════
const communicationsRouter = express.Router();

const commData = [
  {
    _id: 'c1',
    type: 'email',
    subject: 'اجتماع الفريق الأسبوعي',
    from: 'admin@alawael.com',
    to: 'team@alawael.com',
    status: 'sent',
    date: new Date(Date.now() - 3600000).toISOString(),
    body: 'يرجى حضور الاجتماع الأسبوعي يوم الأحد الساعة 10 صباحاً',
  },
  {
    _id: 'c2',
    type: 'sms',
    subject: 'تذكير بالموعد',
    from: 'system',
    to: '+966501234567',
    status: 'delivered',
    date: new Date(Date.now() - 7200000).toISOString(),
    body: 'تذكير: لديك موعد غداً الساعة 9 صباحاً',
  },
  {
    _id: 'c3',
    type: 'notification',
    subject: 'تحديث النظام',
    from: 'system',
    to: 'all',
    status: 'sent',
    date: new Date(Date.now() - 86400000).toISOString(),
    body: 'سيتم تحديث النظام مساء الجمعة',
  },
  {
    _id: 'c4',
    type: 'email',
    subject: 'تقرير الأداء الشهري',
    from: 'hr@alawael.com',
    to: 'managers@alawael.com',
    status: 'sent',
    date: new Date(Date.now() - 172800000).toISOString(),
    body: 'مرفق تقرير الأداء الشهري لشهر فبراير',
  },
];

communicationsRouter.get('/stats', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalSent: 1250,
      totalReceived: 890,
      emailsSent: 450,
      smsSent: 300,
      notificationsSent: 500,
      unread: 12,
    },
  });
});

communicationsRouter.get('/', requireAuth, (req, res) => {
  res.json({ success: true, data: commData, total: commData.length });
});

communicationsRouter.post('/', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إرسال الرسالة بنجاح',
    data: { _id: 'c_' + Date.now(), ...req.body, status: 'sent', date: new Date().toISOString() },
  });
});

communicationsRouter.patch('/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تحديث الرسالة' });
});

communicationsRouter.delete('/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم حذف الرسالة' });
});

communicationsRouter.get('/therapist', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      therapists: [
        {
          id: 'th001',
          name: 'د. أحمد محمد',
          specialization: 'علاج النطق والتخاطب',
          phone: '+966501234567',
          email: 'ahmed@alawael.com',
          available: true,
          lastMessage: 'تم مراجعة تقدم الطفل وهو ممتاز',
          lastMessageDate: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'th002',
          name: 'د. فاطمة علي',
          specialization: 'العلاج الوظيفي',
          phone: '+966507654321',
          email: 'fatima@alawael.com',
          available: true,
          lastMessage: 'الجلسة القادمة يوم الأحد',
          lastMessageDate: new Date(Date.now() - 172800000).toISOString(),
        },
      ],
      unreadCount: 3,
      totalMessages: 24,
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/ai-communications
// ════════════════════════════════════════════════════════════════════════════
const aiCommRouter = express.Router();

aiCommRouter.get('/dashboard', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalMessages: 3420,
      todayMessages: 45,
      responseRate: 98.5,
      avgResponseTime: '2.3 دقيقة',
      channels: { email: 1200, sms: 800, whatsapp: 920, chatbot: 500 },
      recentActivity: [
        {
          type: 'email',
          direction: 'outgoing',
          subject: 'تأكيد الموعد',
          timestamp: new Date().toISOString(),
        },
        {
          type: 'sms',
          direction: 'outgoing',
          subject: 'تذكير بالجلسة',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    },
  });
});

aiCommRouter.post('/send-message', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم إرسال الرسالة بنجاح', messageId: 'msg_' + Date.now() });
});

aiCommRouter.get('/emails', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'e1',
        from: 'admin@alawael.com',
        to: 'parent1@gmail.com',
        subject: 'تقرير أسبوعي',
        body: 'مرفق التقرير الأسبوعي للطالب',
        status: 'sent',
        date: new Date().toISOString(),
      },
      {
        _id: 'e2',
        from: 'parent2@gmail.com',
        to: 'admin@alawael.com',
        subject: 'استفسار عن الجدول',
        body: 'أرجو إرسال جدول الأسبوع القادم',
        status: 'received',
        date: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: 'e3',
        from: 'hr@alawael.com',
        to: 'staff@alawael.com',
        subject: 'إعلان إداري',
        body: 'يرجى الاطلاع على التعميم المرفق',
        status: 'sent',
        date: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  });
});

aiCommRouter.post('/emails/send', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم إرسال البريد الإلكتروني بنجاح' });
});

aiCommRouter.post('/chatbot/chat', requireAuth, (req, res) => {
  const userMsg = req.body.message || '';
  res.json({
    success: true,
    data: {
      reply: `شكراً لرسالتك. تم استلام استفسارك "${userMsg.substring(0, 50)}". سيتم الرد عليك خلال دقائق.`,
      timestamp: new Date().toISOString(),
    },
  });
});

aiCommRouter.get('/conversations/:id/messages', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'm1',
        sender: 'user',
        content: 'مرحباً، أريد الاستفسار عن مواعيد الجلسات',
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      {
        _id: 'm2',
        sender: 'system',
        content: 'أهلاً بك! الجلسات متاحة من الأحد إلى الخميس من 8 صباحاً حتى 4 مساءً',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        _id: 'm3',
        sender: 'user',
        content: 'هل يمكن حجز موعد يوم الأحد؟',
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
      {
        _id: 'm4',
        sender: 'system',
        content: 'بالتأكيد! تم حجز موعد يوم الأحد الساعة 10 صباحاً',
        timestamp: new Date().toISOString(),
      },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/export-import
// ════════════════════════════════════════════════════════════════════════════
const exportImportRouter = express.Router();

exportImportRouter.get('/export/excel', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم تصدير البيانات بنجاح',
    downloadUrl: '/downloads/export_' + Date.now() + '.xlsx',
  });
});

exportImportRouter.get('/export/pdf/:id', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء ملف PDF',
    downloadUrl: '/downloads/report_' + req.params.id + '.pdf',
  });
});

exportImportRouter.post('/import/template', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم استيراد القالب بنجاح', recordsImported: 0 });
});

exportImportRouter.post('/import/excel', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم استيراد البيانات بنجاح',
    recordsImported: 25,
    errors: [],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/exports
// ════════════════════════════════════════════════════════════════════════════
const exportsRouter = express.Router();

exportsRouter.get('/:format', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: `تم التصدير بصيغة ${req.params.format}`,
    downloadUrl: `/downloads/export.${req.params.format}`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/student-reports
// ════════════════════════════════════════════════════════════════════════════
const studentReportsRouter = express.Router();

studentReportsRouter.post('/:id/schedule', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم جدولة التقرير بنجاح', scheduleId: 'sch_' + Date.now() });
});

studentReportsRouter.post('/:id/comparison', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      studentId: req.params.id,
      periods: ['2026-01', '2026-02'],
      metrics: {
        attendance: { before: 85, after: 92, change: '+7%' },
        performance: { before: 72, after: 80, change: '+8%' },
        behavior: { before: 78, after: 85, change: '+7%' },
      },
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/rehabilitation-programs
// ════════════════════════════════════════════════════════════════════════════
const rehabProgramsRouter = express.Router();

rehabProgramsRouter.get('/', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'rp1',
        name: 'برنامج العلاج الطبيعي',
        description: 'برنامج شامل للعلاج الطبيعي وإعادة التأهيل',
        activeBeneficiaries: 25,
        duration: '12 أسبوع',
        status: 'active',
      },
      {
        _id: 'rp2',
        name: 'برنامج النطق والتخاطب',
        description: 'برنامج تطوير مهارات النطق والتواصل',
        activeBeneficiaries: 18,
        duration: '16 أسبوع',
        status: 'active',
      },
      {
        _id: 'rp3',
        name: 'برنامج العلاج الوظيفي',
        description: 'تطوير المهارات الحياتية والوظيفية',
        activeBeneficiaries: 15,
        duration: '10 أسابيع',
        status: 'active',
      },
      {
        _id: 'rp4',
        name: 'البرنامج السلوكي',
        description: 'تعديل السلوك وتطوير المهارات الاجتماعية',
        activeBeneficiaries: 12,
        duration: '8 أسابيع',
        status: 'active',
      },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/documents-smart
// ════════════════════════════════════════════════════════════════════════════
const documentsSmartRouter = express.Router();

documentsSmartRouter.get('/templates', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 't1',
        name: 'تقرير طبي',
        category: 'medical',
        fields: ['patientName', 'diagnosis', 'treatment'],
        language: 'ar',
      },
      {
        _id: 't2',
        name: 'خطة تأهيلية',
        category: 'rehabilitation',
        fields: ['beneficiaryName', 'goals', 'timeline'],
        language: 'ar',
      },
      {
        _id: 't3',
        name: 'شهادة حضور',
        category: 'administrative',
        fields: ['employeeName', 'period', 'department'],
        language: 'ar',
      },
      {
        _id: 't4',
        name: 'تقرير أداء',
        category: 'performance',
        fields: ['employeeName', 'metrics', 'rating'],
        language: 'ar',
      },
    ],
  });
});

documentsSmartRouter.post('/generate', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء المستند بنجاح',
    data: {
      _id: 'doc_' + Date.now(),
      template: req.body.templateId,
      status: 'generated',
      downloadUrl: '/downloads/generated_doc.pdf',
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/students
// ════════════════════════════════════════════════════════════════════════════
const studentsRouter = express.Router();

studentsRouter.get('/:id/dashboard', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      studentId: req.params.id,
      name: 'أحمد عبدالله',
      grade: 'الصف الثالث',
      overallProgress: 82,
      attendance: 95,
      upcomingSessions: 3,
      recentGrades: [
        { subject: 'العربية', grade: 88 },
        { subject: 'الرياضيات', grade: 76 },
        { subject: 'العلوم', grade: 85 },
      ],
      notifications: 2,
    },
  });
});

studentsRouter.get('/:id/schedule', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'sch1',
        day: 'الأحد',
        time: '08:00 - 09:00',
        subject: 'العربية',
        teacher: 'أ. فاطمة',
        room: 'قاعة 101',
      },
      {
        _id: 'sch2',
        day: 'الأحد',
        time: '09:00 - 10:00',
        subject: 'الرياضيات',
        teacher: 'أ. محمد',
        room: 'قاعة 102',
      },
      {
        _id: 'sch3',
        day: 'الأحد',
        time: '10:30 - 11:30',
        subject: 'جلسة علاج طبيعي',
        teacher: 'د. خالد',
        room: 'عيادة 3',
      },
      {
        _id: 'sch4',
        day: 'الاثنين',
        time: '08:00 - 09:00',
        subject: 'العلوم',
        teacher: 'أ. نورة',
        room: 'مختبر 1',
      },
      {
        _id: 'sch5',
        day: 'الاثنين',
        time: '09:00 - 10:00',
        subject: 'جلسة نطق وتخاطب',
        teacher: 'د. سارة',
        room: 'عيادة 5',
      },
    ],
  });
});

studentsRouter.get('/:id/grades', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'g1',
        subject: 'اللغة العربية',
        midterm: 85,
        final: 88,
        total: 87,
        grade: 'A',
        semester: '2025-2026-2',
      },
      {
        _id: 'g2',
        subject: 'الرياضيات',
        midterm: 72,
        final: 78,
        total: 76,
        grade: 'B+',
        semester: '2025-2026-2',
      },
      {
        _id: 'g3',
        subject: 'العلوم',
        midterm: 80,
        final: 85,
        total: 83,
        grade: 'A-',
        semester: '2025-2026-2',
      },
      {
        _id: 'g4',
        subject: 'التربية الإسلامية',
        midterm: 90,
        final: 92,
        total: 91,
        grade: 'A+',
        semester: '2025-2026-2',
      },
      {
        _id: 'g5',
        subject: 'الحاسب الآلي',
        midterm: 88,
        final: 90,
        total: 89,
        grade: 'A',
        semester: '2025-2026-2',
      },
    ],
  });
});

studentsRouter.get('/:id/attendance', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalDays: 120,
      presentDays: 114,
      absentDays: 4,
      lateDays: 2,
      rate: 95,
      monthly: [
        { month: 'سبتمبر', present: 20, absent: 1, late: 0 },
        { month: 'أكتوبر', present: 22, absent: 0, late: 1 },
        { month: 'نوفمبر', present: 19, absent: 2, late: 0 },
        { month: 'ديسمبر', present: 18, absent: 1, late: 1 },
        { month: 'يناير', present: 20, absent: 0, late: 0 },
        { month: 'فبراير', present: 15, absent: 0, late: 0 },
      ],
    },
  });
});

studentsRouter.get('/:id/assignments', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'as1',
        title: 'واجب العربية - الوحدة 5',
        subject: 'العربية',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
        grade: null,
      },
      {
        _id: 'as2',
        title: 'مشروع العلوم',
        subject: 'العلوم',
        dueDate: new Date(Date.now() + 259200000).toISOString(),
        status: 'in_progress',
        grade: null,
      },
      {
        _id: 'as3',
        title: 'تمارين الرياضيات',
        subject: 'الرياضيات',
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        status: 'submitted',
        grade: 85,
      },
      {
        _id: 'as4',
        title: 'بحث التربية الإسلامية',
        subject: 'التربية الإسلامية',
        dueDate: new Date(Date.now() - 172800000).toISOString(),
        status: 'graded',
        grade: 92,
      },
    ],
  });
});

studentsRouter.get('/:id/announcements', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'an1',
        title: 'إجازة اليوم الوطني',
        body: 'سيكون يوم الأحد القادم إجازة بمناسبة اليوم الوطني',
        date: new Date().toISOString(),
        priority: 'high',
      },
      {
        _id: 'an2',
        title: 'فعالية اليوم المفتوح',
        body: 'ندعوكم لحضور فعالية اليوم المفتوح يوم الخميس',
        date: new Date(Date.now() - 86400000).toISOString(),
        priority: 'medium',
      },
      {
        _id: 'an3',
        title: 'تحديث الجدول الدراسي',
        body: 'تم تحديث الجدول الدراسي للأسبوع القادم',
        date: new Date(Date.now() - 172800000).toISOString(),
        priority: 'low',
      },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/compensation
// ════════════════════════════════════════════════════════════════════════════
const compensationRouter = express.Router();

const incentivesData = [
  {
    _id: 'inc1',
    employeeName: 'أحمد محمد',
    type: 'performance_bonus',
    amount: 5000,
    currency: 'SAR',
    status: 'approved',
    reason: 'أداء متميز في الربع الأول',
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'inc2',
    employeeName: 'فاطمة علي',
    type: 'annual_bonus',
    amount: 8000,
    currency: 'SAR',
    status: 'paid',
    reason: 'مكافأة سنوية',
    date: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    _id: 'inc3',
    employeeName: 'خالد سعد',
    type: 'project_bonus',
    amount: 3000,
    currency: 'SAR',
    status: 'pending',
    reason: 'إنجاز مشروع التطوير',
    date: new Date().toISOString(),
  },
];

compensationRouter.get('/incentives', requireAuth, (req, res) => {
  res.json({ success: true, data: incentivesData, total: incentivesData.length });
});

compensationRouter.post('/incentives', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء الحافز بنجاح',
    data: { _id: 'inc_' + Date.now(), ...req.body, status: 'pending' },
  });
});

compensationRouter.put('/incentives/:id/approve', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم اعتماد الحافز' });
});

compensationRouter.put('/incentives/:id/mark-paid', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تحديد الحافز كمدفوع' });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/disability (assessment sub-routes — different from disability-rehabilitation)
// ════════════════════════════════════════════════════════════════════════════
const disabilityRouter = express.Router();

disabilityRouter.get('/assessment/scale-results', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'sr1',
        beneficiaryName: 'محمد أحمد',
        scaleName: 'مقياس السلوك التكيفي',
        score: 72,
        maxScore: 100,
        date: new Date().toISOString(),
        evaluator: 'د. خالد',
      },
      {
        _id: 'sr2',
        beneficiaryName: 'سارة علي',
        scaleName: 'مقياس المهارات الحركية',
        score: 65,
        maxScore: 100,
        date: new Date(Date.now() - 86400000).toISOString(),
        evaluator: 'د. منى',
      },
    ],
  });
});

disabilityRouter.post('/assessment/scale-results', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم حفظ نتيجة المقياس',
    data: { _id: 'sr_' + Date.now(), ...req.body },
  });
});

disabilityRouter.get('/assessment/test-results', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'tr1',
        beneficiaryName: 'محمد أحمد',
        testName: 'اختبار الذكاء (WISC)',
        score: 85,
        percentile: 16,
        date: new Date().toISOString(),
        examiner: 'د. هند',
      },
      {
        _id: 'tr2',
        beneficiaryName: 'سارة علي',
        testName: 'اختبار التحصيل الدراسي',
        score: 78,
        percentile: 25,
        date: new Date(Date.now() - 172800000).toISOString(),
        examiner: 'أ. فاطمة',
      },
    ],
  });
});

disabilityRouter.post('/assessment/test-results', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم حفظ نتيجة الاختبار',
    data: { _id: 'tr_' + Date.now(), ...req.body },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/pm (Project Management — extends projects.routes.js with tasks)
// ════════════════════════════════════════════════════════════════════════════
const pmRouter = express.Router();

const projectsData = [
  {
    _id: 'proj1',
    name: 'مشروع تطوير النظام',
    description: 'تطوير وتحديث نظام المركز',
    status: 'in_progress',
    progress: 65,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    manager: 'عبدالله أحمد',
    priority: 'high',
    team: 6,
  },
  {
    _id: 'proj2',
    name: 'مشروع التدريب المهني',
    description: 'برنامج تدريب الموظفين الجدد',
    status: 'in_progress',
    progress: 40,
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    manager: 'فاطمة علي',
    priority: 'medium',
    team: 4,
  },
  {
    _id: 'proj3',
    name: 'مشروع التوسعة',
    description: 'توسعة المبنى الرئيسي',
    status: 'planning',
    progress: 15,
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    manager: 'خالد سعد',
    priority: 'high',
    team: 8,
  },
];

const tasksData = [
  {
    _id: 'task1',
    projectId: 'proj1',
    title: 'تحليل المتطلبات',
    status: 'completed',
    priority: 'high',
    assignee: 'أحمد',
    dueDate: '2026-01-15',
  },
  {
    _id: 'task2',
    projectId: 'proj1',
    title: 'تطوير الواجهة الأمامية',
    status: 'in_progress',
    priority: 'high',
    assignee: 'سارة',
    dueDate: '2026-03-15',
  },
  {
    _id: 'task3',
    projectId: 'proj1',
    title: 'تطوير API',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'محمد',
    dueDate: '2026-03-30',
  },
  {
    _id: 'task4',
    projectId: 'proj1',
    title: 'اختبار النظام',
    status: 'pending',
    priority: 'high',
    assignee: 'منى',
    dueDate: '2026-04-15',
  },
  {
    _id: 'task5',
    projectId: 'proj2',
    title: 'إعداد المواد التدريبية',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'نورة',
    dueDate: '2026-02-28',
  },
  {
    _id: 'task6',
    projectId: 'proj2',
    title: 'جدولة الجلسات',
    status: 'completed',
    priority: 'low',
    assignee: 'هند',
    dueDate: '2026-02-15',
  },
];

pmRouter.get('/projects', requireAuth, (req, res) => {
  res.json({ success: true, data: projectsData, total: projectsData.length });
});

pmRouter.post('/projects', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء المشروع',
    data: { _id: 'proj_' + Date.now(), ...req.body, progress: 0, status: 'planning' },
  });
});

pmRouter.get('/projects/:id', requireAuth, (req, res) => {
  const project = projectsData.find(p => p._id === req.params.id) || projectsData[0];
  res.json({ success: true, data: project });
});

pmRouter.put('/projects/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تحديث المشروع' });
});

pmRouter.get('/projects/:projectId/tasks', requireAuth, (req, res) => {
  const filtered = tasksData.filter(t => t.projectId === req.params.projectId);
  res.json({
    success: true,
    data: filtered.length ? filtered : tasksData.slice(0, 3),
    total: filtered.length || 3,
  });
});

pmRouter.post('/tasks', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'تم إنشاء المهمة',
    data: { _id: 'task_' + Date.now(), ...req.body, status: 'pending' },
  });
});

pmRouter.patch('/tasks/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم تحديث المهمة' });
});

pmRouter.delete('/tasks/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'تم حذف المهمة' });
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/analytics (broader than /api/v1/analytics)
// ════════════════════════════════════════════════════════════════════════════
const analyticsExtraRouter = express.Router();

analyticsExtraRouter.get('/hr', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalEmployees: 85,
      activeEmployees: 78,
      avgAttendance: 94.5,
      turnoverRate: 3.2,
      departments: [
        { name: 'التأهيل', count: 25 },
        { name: 'التعليم', count: 20 },
        { name: 'الإدارة', count: 15 },
        { name: 'المالية', count: 10 },
        { name: 'تقنية المعلومات', count: 8 },
        { name: 'الخدمات', count: 7 },
      ],
    },
  });
});

analyticsExtraRouter.get('/system', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      uptime: '99.95%',
      avgResponseTime: '125ms',
      totalRequests: 152340,
      errorRate: 0.15,
      activeUsers: 45,
      peakHour: '10:00',
    },
  });
});

analyticsExtraRouter.get('/insights', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        type: 'performance',
        title: 'تحسن ملحوظ في أداء النظام',
        description: 'انخفض وقت الاستجابة بنسبة 20% هذا الشهر',
        impact: 'positive',
      },
      {
        type: 'usage',
        title: 'زيادة استخدام التطبيق',
        description: 'ارتفع عدد المستخدمين النشطين بنسبة 15%',
        impact: 'positive',
      },
      {
        type: 'alert',
        title: 'ملاحظة: استخدام التخزين',
        description: 'استخدام التخزين وصل إلى 75% — يُنصح بمراجعة السياسة',
        impact: 'warning',
      },
    ],
  });
});

analyticsExtraRouter.get('/dashboard', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalBeneficiaries: 120,
      activeSessions: 45,
      monthlyGrowth: 8.5,
      satisfactionRate: 92,
    },
  });
});

analyticsExtraRouter.get('/trends/monthly', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      { month: 'يناير', beneficiaries: 110, sessions: 380, revenue: 125000 },
      { month: 'فبراير', beneficiaries: 115, sessions: 420, revenue: 132000 },
      { month: 'مارس', beneficiaries: 120, sessions: 450, revenue: 140000 },
    ],
  });
});

analyticsExtraRouter.get('/export', requireAuth, (req, res) => {
  res.json({ success: true, downloadUrl: '/downloads/analytics_export.xlsx' });
});

analyticsExtraRouter.get('/compare', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      period1: { label: 'الفترة الأولى', beneficiaries: 100, sessions: 350, revenue: 110000 },
      period2: { label: 'الفترة الثانية', beneficiaries: 120, sessions: 450, revenue: 140000 },
      change: { beneficiaries: '+20%', sessions: '+28.6%', revenue: '+27.3%' },
    },
  });
});

analyticsExtraRouter.get('/program/:id/performance', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      programId: req.params.id,
      name: 'برنامج التأهيل الشامل',
      completionRate: 78,
      avgImprovement: 23,
      activeBeneficiaries: 25,
      monthlyData: [
        { month: 'يناير', improvement: 18 },
        { month: 'فبراير', improvement: 22 },
        { month: 'مارس', improvement: 28 },
      ],
    },
  });
});

analyticsExtraRouter.get('/predictive/:type', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      type: req.params.type,
      predictions: [
        { label: 'الربع القادم', value: 85, confidence: 0.9 },
        { label: 'منتصف العام', value: 92, confidence: 0.82 },
        { label: 'نهاية العام', value: 96, confidence: 0.75 },
      ],
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  Dashboard extras (summary-systems, top-kpis)
// ════════════════════════════════════════════════════════════════════════════
const dashboardExtrasRouter = express.Router();

dashboardExtrasRouter.get('/summary-systems', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      systems: [
        { name: 'إدارة المستفيدين', status: 'operational', uptime: 99.9, users: 25 },
        { name: 'نظام الموارد البشرية', status: 'operational', uptime: 99.8, users: 12 },
        { name: 'النظام المالي', status: 'operational', uptime: 99.95, users: 8 },
        { name: 'نظام التعليم الإلكتروني', status: 'operational', uptime: 99.7, users: 45 },
        { name: 'نظام التأهيل', status: 'operational', uptime: 99.85, users: 30 },
        { name: 'نظام المراسلات', status: 'operational', uptime: 99.6, users: 20 },
      ],
    },
  });
});

dashboardExtrasRouter.get('/top-kpis', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'رضا المستفيدين', value: 92, unit: '%', trend: 'up', change: '+3%' },
      { name: 'معدل الحضور', value: 95, unit: '%', trend: 'stable', change: '0%' },
      { name: 'إنجاز الخطط', value: 88, unit: '%', trend: 'up', change: '+5%' },
      { name: 'كفاءة التأهيل', value: 85, unit: '%', trend: 'up', change: '+7%' },
      { name: 'الأداء المالي', value: 96, unit: '%', trend: 'up', change: '+2%' },
    ],
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  Exports
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
//  /api/search adapter — frontend calls /search?q=X&type=full-text
//  but backend has /search/full-text?query=X
// ════════════════════════════════════════════════════════════════════════════
const searchAdapterRouter = express.Router();

searchAdapterRouter.get('/', requireAuth, (req, res, next) => {
  const { q, type } = req.query;
  if (!q && !type) return next(); // let it fall through
  // rewrite: type → sub-path, q → query
  req.url = `/${type || 'full-text'}?query=${encodeURIComponent(q || '')}&collection=${req.query.collection || 'systems'}&limit=${req.query.limit || 20}`;
  next('route');
});

// ════════════════════════════════════════════════════════════════════════════
//  /api/parents  — Parent portal endpoints
// ════════════════════════════════════════════════════════════════════════════
const parentsRouter = express.Router();

parentsRouter.get('/:parentId/dashboard', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      parentName: 'أحمد محمد العلي',
      childrenCount: 2,
      upcomingAppointments: 3,
      unreadMessages: 5,
      children: [
        {
          id: 'ch001',
          name: 'محمد أحمد',
          age: 7,
          program: 'برنامج علاج النطق والتخاطب',
          progress: 78,
          nextSession: new Date(Date.now() + 86400000).toISOString(),
          therapist: 'د. أحمد محمد',
        },
        {
          id: 'ch002',
          name: 'سارة أحمد',
          age: 5,
          program: 'برنامج العلاج الوظيفي',
          progress: 65,
          nextSession: new Date(Date.now() + 172800000).toISOString(),
          therapist: 'د. فاطمة علي',
        },
      ],
      recentActivities: [
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          description: 'جلسة علاج نطق لمحمد',
          type: 'session',
        },
        {
          date: new Date(Date.now() - 172800000).toISOString(),
          description: 'تقييم دوري لسارة',
          type: 'assessment',
        },
      ],
      notifications: [
        { id: 'n1', message: 'موعد الجلسة القادمة غداً الساعة 10 صباحاً', read: false },
        { id: 'n2', message: 'تم إضافة تقرير جديد لمحمد', read: false },
      ],
    },
  });
});

parentsRouter.get('/:parentId/children-progress', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        childId: 'ch001',
        childName: 'محمد أحمد',
        overallProgress: 78,
        goals: [
          { name: 'نطق الحروف بوضوح', progress: 85, status: 'on-track' },
          { name: 'تكوين جمل من 3 كلمات', progress: 70, status: 'on-track' },
          { name: 'التفاعل الاجتماعي', progress: 60, status: 'needs-attention' },
        ],
        sessionsCompleted: 24,
        totalSessions: 36,
        lastAssessment: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        childId: 'ch002',
        childName: 'سارة أحمد',
        overallProgress: 65,
        goals: [
          { name: 'المهارات الحركية الدقيقة', progress: 70, status: 'on-track' },
          { name: 'التنسيق بين اليد والعين', progress: 60, status: 'on-track' },
          { name: 'الاستقلالية في الأنشطة اليومية', progress: 55, status: 'needs-attention' },
        ],
        sessionsCompleted: 18,
        totalSessions: 30,
        lastAssessment: new Date(Date.now() - 1209600000).toISOString(),
      },
    ],
  });
});

parentsRouter.get('/:parentId/attendance', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      summary: { totalSessions: 40, attended: 36, missed: 3, cancelled: 1, attendanceRate: 90 },
      records: [
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          childName: 'محمد أحمد',
          session: 'علاج النطق',
          status: 'attended',
          therapist: 'د. أحمد محمد',
        },
        {
          date: new Date(Date.now() - 172800000).toISOString(),
          childName: 'سارة أحمد',
          session: 'العلاج الوظيفي',
          status: 'attended',
          therapist: 'د. فاطمة علي',
        },
        {
          date: new Date(Date.now() - 259200000).toISOString(),
          childName: 'محمد أحمد',
          session: 'علاج النطق',
          status: 'missed',
          therapist: 'د. أحمد محمد',
          reason: 'غياب بعذر',
        },
        {
          date: new Date(Date.now() - 345600000).toISOString(),
          childName: 'سارة أحمد',
          session: 'العلاج الوظيفي',
          status: 'attended',
          therapist: 'د. فاطمة علي',
        },
      ],
    },
  });
});

parentsRouter.get('/:parentId/payments', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      balance: 2500,
      currency: 'SAR',
      payments: [
        {
          id: 'pay001',
          date: new Date(Date.now() - 2592000000).toISOString(),
          amount: 3000,
          description: 'رسوم شهر يناير',
          status: 'paid',
          method: 'تحويل بنكي',
        },
        {
          id: 'pay002',
          date: new Date(Date.now() - 5184000000).toISOString(),
          amount: 3000,
          description: 'رسوم شهر ديسمبر',
          status: 'paid',
          method: 'بطاقة ائتمان',
        },
        {
          id: 'pay003',
          date: new Date().toISOString(),
          amount: 3000,
          description: 'رسوم شهر فبراير',
          status: 'pending',
          method: '-',
        },
      ],
      totalPaid: 6000,
      totalDue: 3000,
    },
  });
});

parentsRouter.get('/:parentId/documents', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'doc001',
        title: 'تقرير تقييم أولي - محمد',
        type: 'assessment',
        date: new Date(Date.now() - 7776000000).toISOString(),
        downloadUrl: '#',
      },
      {
        id: 'doc002',
        title: 'خطة العلاج الفردية - محمد',
        type: 'treatment-plan',
        date: new Date(Date.now() - 5184000000).toISOString(),
        downloadUrl: '#',
      },
      {
        id: 'doc003',
        title: 'تقرير تقدم فصلي - محمد',
        type: 'progress-report',
        date: new Date(Date.now() - 2592000000).toISOString(),
        downloadUrl: '#',
      },
      {
        id: 'doc004',
        title: 'تقرير تقييم أولي - سارة',
        type: 'assessment',
        date: new Date(Date.now() - 6048000000).toISOString(),
        downloadUrl: '#',
      },
      {
        id: 'doc005',
        title: 'خطة العلاج الفردية - سارة',
        type: 'treatment-plan',
        date: new Date(Date.now() - 4320000000).toISOString(),
        downloadUrl: '#',
      },
    ],
  });
});

parentsRouter.get('/:parentId/appointments', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      upcoming: [
        {
          id: 'apt001',
          date: new Date(Date.now() + 86400000).toISOString(),
          time: '10:00',
          childName: 'محمد أحمد',
          therapist: 'د. أحمد محمد',
          type: 'علاج النطق',
          location: 'غرفة 3',
          status: 'confirmed',
        },
        {
          id: 'apt002',
          date: new Date(Date.now() + 172800000).toISOString(),
          time: '11:30',
          childName: 'سارة أحمد',
          therapist: 'د. فاطمة علي',
          type: 'العلاج الوظيفي',
          location: 'غرفة 5',
          status: 'confirmed',
        },
        {
          id: 'apt003',
          date: new Date(Date.now() + 432000000).toISOString(),
          time: '09:00',
          childName: 'محمد أحمد',
          therapist: 'د. أحمد محمد',
          type: 'تقييم دوري',
          location: 'غرفة 1',
          status: 'pending',
        },
      ],
      past: [
        {
          id: 'apt004',
          date: new Date(Date.now() - 86400000).toISOString(),
          time: '10:00',
          childName: 'محمد أحمد',
          therapist: 'د. أحمد محمد',
          type: 'علاج النطق',
          location: 'غرفة 3',
          status: 'completed',
        },
        {
          id: 'apt005',
          date: new Date(Date.now() - 172800000).toISOString(),
          time: '11:30',
          childName: 'سارة أحمد',
          therapist: 'د. فاطمة علي',
          type: 'العلاج الوظيفي',
          location: 'غرفة 5',
          status: 'completed',
        },
      ],
    },
  });
});

parentsRouter.get('/:parentId/messages', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      messages: [
        {
          id: 'msg001',
          from: 'د. أحمد محمد',
          subject: 'تقدم محمد في الجلسة',
          body: 'أود إبلاغكم بأن محمد أظهر تحسناً ملحوظاً في نطق الحروف اليوم. أرجو الاستمرار في التمارين المنزلية.',
          date: new Date(Date.now() - 86400000).toISOString(),
          read: false,
        },
        {
          id: 'msg002',
          from: 'إدارة المركز',
          subject: 'تذكير بموعد الجلسة',
          body: 'نذكركم بموعد جلسة محمد غداً الساعة 10 صباحاً مع د. أحمد.',
          date: new Date(Date.now() - 172800000).toISOString(),
          read: true,
        },
        {
          id: 'msg003',
          from: 'د. فاطمة علي',
          subject: 'تقرير سارة الأسبوعي',
          body: 'مرفق تقرير سارة لهذا الأسبوع. نلاحظ تحسن في التنسيق الحركي. يرجى متابعة التمارين.',
          date: new Date(Date.now() - 345600000).toISOString(),
          read: true,
        },
      ],
      unreadCount: 1,
      totalCount: 3,
    },
  });
});

module.exports = {
  adminRouter,
  accountRouter,
  paymentsRouter,
  monitoringRouter,
  aiPredictionsRouter,
  hrSystemRouter,
  integratedCareRouter,
  securityRouter,
  organizationRouter,
  communicationsRouter,
  aiCommRouter,
  exportImportRouter,
  exportsRouter,
  studentReportsRouter,
  rehabProgramsRouter,
  documentsSmartRouter,
  studentsRouter,
  compensationRouter,
  disabilityRouter,
  pmRouter,
  analyticsExtraRouter,
  dashboardExtrasRouter,
  searchAdapterRouter,
  parentsRouter,
};
