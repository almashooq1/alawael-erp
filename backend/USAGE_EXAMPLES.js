// ========================================
// أمثلة الاستخدام العملية
// Usage Examples for Notification System
// ========================================

// ========================================
// 1️⃣ إرسال إشعارات بسيطة
// Simple Notifications
// ========================================

async function exampleSimpleNotification() {
  const { notificationManager } = require('./services/unifiedNotificationManager');
  
  // إرسال إشعار عام
  await notificationManager.sendNotification('user-123', {
    title: 'طلبك جاهز',
    body: 'تم إنجاز طلبك برقم #1234',
    priority: 'high',
    category: 'order',
    channels: {
      email: true,
      sms: true,
      whatsapp: true,
      inApp: true,
    },
  });
}

// ========================================
// 2️⃣ إرسال من قالب
// Send from Template
// ========================================

async function exampleTemplateNotification() {
  const { templateSystem } = require('./services/smartTemplateSystem');
  const { notificationManager } = require('./services/unifiedNotificationManager');
  
  // إنشاء إشعار من قالب
  const notification = await templateSystem.createNotificationFromTemplate(
    'TRANSACTION_SUCCESS', // معرف القالب
    {
      transaction_id: 'TRX-2025-0001',
      amount: '1,500',
      currency: 'SAR',
      date: new Date().toLocaleDateString('ar-SA'),
      time: new Date().toLocaleTimeString('ar-SA'),
    },
    'ar' // اللغة
  );
  
  // إرسال الإشعار
  await notificationManager.sendNotification('user-123', {
    ...notification,
    channels: {
      email: true,
      whatsapp: true,
    },
  });
}

// ========================================
// 3️⃣ إرسال جماعي
// Bulk Notifications
// ========================================

async function exampleBulkNotification() {
  const { notificationManager } = require('./services/unifiedNotificationManager');
  
  const userIds = ['user-1', 'user-2', 'user-3', 'user-4'];
  
  // إرسال لعدة مستخدمين
  await notificationManager.sendBulkNotifications(userIds, {
    title: 'تحديث الأنظمة',
    body: 'سيتم صيانة النظام في الساعة 2 صباحاً',
    priority: 'medium',
    category: 'system',
  });
}

// ========================================
// 4️⃣ إدارة تفضيلات المستخدم
// User Preferences Management
// ========================================

async function exampleUserPreferences() {
  const { preferencesManager } = require('./services/userPreferencesManager');
  
  // الحصول على التفضيلات
  const prefs = await preferencesManager.getPreferences('user-123');
  console.log('التفضيلات الحالية:', prefs);
  
  // تفعيل الالتقاط عبر الواتس آب
  await preferencesManager.updateChannels('user-123', {
    email: true,
    sms: false,
    whatsapp: true,
    push: true,
  });
  
  // تعيين ساعات الراحة
  await preferencesManager.updateQuietHours('user-123', {
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'Asia/Riyadh',
    daysOff: ['friday'], // يوم الجمعة راحة بشكل كامل
  });
  
  // تحديث حدود التكرار
  await preferencesManager.updateRateLimits('user-123', {
    email: { perMinute: 2, perHour: 20, perDay: 100 },
    whatsapp: { perMinute: 1, perHour: 10, perDay: 50 },
  });
  
  // تعليق الإشعارات لمدة ساعتين
  await preferencesManager.suspendNotifications('user-123', 2);
  
  // استئناف الإشعارات
  await preferencesManager.resumeNotifications('user-123');
  
  // إضافة إلى قائمة الحظر
  await preferencesManager.addToBlacklist('user-123', 'categories', 'marketing');
  
  // إزالة من قائمة الحظر
  await preferencesManager.removeFromBlacklist('user-123', 'categories', 'marketing');
}

// ========================================
// 5️⃣ إرسال واتس آب مباشر
// Direct WhatsApp Sending
// ========================================

async function exampleWhatsAppDirect() {
  const { whatsappService } = require('./services/whatsappNotificationService');
  
  // إرسال رسالة نصية
  await whatsappService.sendMessage('966501234567', 'مرحباً بك في نظامنا!');
  
  // إرسال صورة مع وصف
  await whatsappService.sendImageMessage(
    '966501234567',
    'https://example.com/receipt.jpg',
    'إليك إيصال طلبك'
  );
  
  // إرسال ملف PDF
  await whatsappService.sendDocumentMessage(
    '966501234567',
    'https://example.com/invoice.pdf',
    'الفاتورة الخاصة بك'
  );
  
  // إرسال رسائل جماعية
  await whatsappService.sendBulkMessages(
    ['966501234567', '966502345678', '966503456789'],
    'شكراً لاستخدام خدماتنا'
  );
  
  // الحصول على الإحصائيات
  const stats = whatsappService.getStatistics();
  console.log('إحصائيات الواتس آب:', stats);
  // {
  //   total: 150,
  //   sent: 145,
  //   failed: 5,
  //   pending: 0,
  //   successRate: '96.67%'
  // }
}

// ========================================
// 6️⃣ إنشاء قواعس التنبيهات
// Create Alert Rules
// ========================================

async function exampleAlertRules() {
  const { rulesEngine } = require('./services/advancedAlertRulesEngine');
  
  // قاعدة بسيطة: تنبيه عند ارتفاع عدد الأخطاء
  const rule1 = await rulesEngine.createRule({
    name: 'High Error Rate Alert',
    description: 'تنبيه عند ارتفاع معدل الأخطاء',
    enabled: true,
    
    conditions: {
      eventType: ['error_rate_high'],
      severity: ['high', 'critical'],
      customFilters: [
        {
          field: 'error_count',
          operator: 'gt',
          value: 100,
        },
        {
          field: 'error_rate',
          operator: 'gt',
          value: 5, // 5%
        },
      ],
      timeRange: {
        enabled: true,
        startTime: '08:00',
        endTime: '20:00',
      },
      daysOfWeek: ['sat', 'sun', 'mon', 'tue', 'wed'],
    },
    
    actions: {
      notify: {
        enabled: true,
        channels: ['email', 'slack', 'whatsapp'],
        templateId: 'SYSTEM_ALERT',
        priority: 'critical',
      },
      webhook: {
        enabled: true,
        url: 'https://your-api.com/alerts/high-error',
        method: 'POST',
      },
      custom: {
        enabled: true,
        actionType: 'page_dev_team',
      },
    },
    
    constraints: {
      rateLimit: {
        enabled: true,
        maxPerHour: 5,
      },
      aggregation: {
        enabled: true,
        cooldown: 300000, // 5 دقائق
      },
    },
  });
  
  // قاعدة معقدة: تحذير أمان عند محاولات دخول فاشلة متكررة
  const rule2 = await rulesEngine.createRule({
    name: 'Security: Multiple Failed Logins',
    enabled: true,
    
    conditions: {
      eventType: ['login_failed'],
      customFilters: {
        type: 'AND',
        filters: [
          {
            field: 'attempt_count',
            operator: 'gte',
            value: 5,
          },
          {
            field: 'time_window',
            operator: 'lt',
            value: 600000, // 10 دقائق
          },
          {
            field: 'action',
            operator: 'equals',
            value: 'login',
          },
        ],
      },
    },
    
    actions: {
      notify: {
        enabled: true,
        channels: ['email', 'sms', 'whatsapp'],
        templateId: 'SECURITY_WARNING',
        priority: 'critical',
      },
      custom: {
        enabled: true,
        actionType: 'lock_account',
      },
    },
  });
  
  return { rule1, rule2 };
}

// ========================================
// 7️⃣ تقييم الأحداث والقواعس
// Evaluate Events
// ========================================

async function exampleEventEvaluation() {
  const { rulesEngine } = require('./services/advancedAlertRulesEngine');
  
  // محاكاة حدث عالي الأولوية
  const event = {
    type: 'error_rate_high',
    severity: 'critical',
    error_count: 150,
    error_rate: 8, // 8%
    componentId: 'payment-service',
    timestamp: new Date(),
  };
  
  // تقييم الحدث ضد جميع القواعس
  const triggeredRules = await rulesEngine.evaluateEvent(event);
  
  console.log(`تم تشغيل ${triggeredRules.length} قاعدة:`);
  triggeredRules.forEach(rule => {
    console.log(`- ${rule.name}`);
  });
}

// ========================================
// 8️⃣ الحصول على الإحصائيات والتقارير
// Analytics & Reports
// ========================================

async function exampleAnalytics() {
  const { analyticsSystem } = require('./services/notificationAnalyticsSystem');
  
  // الإحصائيات الحالية
  const currentMetrics = await analyticsSystem.getCurrentMetrics();
  console.log('الإحصائيات الحالية:', currentMetrics);
  
  // مؤشرات الأداء الرئيسية
  const kpis = await analyticsSystem.getKPIs();
  console.log('مؤشرات الأداء:', {
    deliveryRate: kpis.deliveryRate,
    successRate: kpis.successRate,
    readRate: kpis.readRate,
    engagementRate: kpis.engagementRate,
  });
  
  // تقرير شامل
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // آخر 7 أيام
  const endDate = new Date();
  
  const comprehensiveReport = await analyticsSystem.generateComprehensiveReport(
    startDate,
    endDate
  );
  
  console.log('التقرير الشامل:', {
    period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    totalNotifications: comprehensiveReport.summary.totalNotifications,
    successRate: comprehensiveReport.summary.successRate,
    channels: comprehensiveReport.channelStats,
    topErrors: comprehensiveReport.topErrors.slice(0, 3),
  });
  
  // تقرير القناة
  const whatsappReport = await analyticsSystem.getChannelReport(
    'whatsapp',
    startDate,
    endDate
  );
  console.log('تقرير الواتس آب:', whatsappReport);
  
  // تقرير المشاركة
  const engagementReport = await analyticsSystem.getUserEngagementReport(startDate, endDate);
  console.log('تقرير المشاركة:', engagementReport);
}

// ========================================
// 9️⃣ إنشاء قالب مخصص
// Create Custom Template
// ========================================

async function exampleCustomTemplate() {
  const { templateSystem } = require('./services/smartTemplateSystem');
  
  const customTemplate = await templateSystem.createTemplate({
    name: 'Special Promotion',
    category: 'marketing',
    content: {
      ar: {
        title: 'عرض علي خاص',
        body: 'الحصول على {{discount}}% خصم على {{product}}',
        footer: 'انتهي العرض في {{date}}',
      },
      en: {
        title: 'Special Offer',
        body: 'Get {{discount}}% discount on {{product}}',
        footer: 'Offer ends on {{date}}',
      },
    },
    variables: ['discount', 'product', 'date'],
    requiredVariables: ['discount', 'product'],
  });
  
  // جاهز للاستخدام
  const notification = await templateSystem.createNotificationFromTemplate(
    customTemplate.id,
    {
      discount: '30',
      product: 'أحذية رياضية',
      date: '2025-02-28',
    },
    'ar'
  );
  
  return notification;
}

// ========================================
// 🔟 مثال متكامل: تطبيق عملي
// Complete Example: Practical Application
// ========================================

async function exampleCompleteFlow() {
  const { notificationManager } = require('./services/unifiedNotificationManager');
  const { preferencesManager } = require('./services/userPreferencesManager');
  const { templateSystem } = require('./services/smartTemplateSystem');
  const { analyticsSystem } = require('./services/notificationAnalyticsSystem');
  
  // السيناريو: طلب جديد تم تأكيده
  const userId = 'cust-001';
  const orderId = 'ORD-2025-0042';
  const amount = '2,500 SAR';
  
  try {
    // الخطوة 1: التحقق من تفضيلات المستخدم
    const userPrefs = await preferencesManager.getPreferences(userId);
    
    if (!userPrefs.isActive) {
      console.log('المستخدم غير نشط، لا يتم إرسال إشعارات');
      return;
    }
    
    // الخطوة 2: إنشاء إشعار من قالب
    const notificationData = await templateSystem.createNotificationFromTemplate(
      'TRANSACTION_SUCCESS',
      {
        transaction_id: orderId,
        amount: amount,
        currency: 'SAR',
        date: new Date().toLocaleDateString('ar-SA'),
      },
      'ar'
    );
    
    // الخطوة 3: إرسال الإشعار عبر القنوات المفضلة
    const channels = {
      email: userPrefs.channels.email,
      sms: userPrefs.channels.sms && !userPrefs.suspended,
      whatsapp: userPrefs.channels.whatsapp,
      inApp: userPrefs.channels.inApp,
    };
    
    const result = await notificationManager.sendNotification(userId, {
      ...notificationData,
      channels,
      priority: 'high',
      category: 'transaction',
      metadata: {
        orderId,
        amount,
      },
    });
    
    console.log(`✅ تم إرسال الإشعار: ${result.id}`);
    
    // الخطوة 4: تسجيل الإحصائيات
    // يتم تلقائياً من قبل notificationManager
    
    // الخطوة 5: التحقق من الإحصائيات
    const kpis = await analyticsSystem.getKPIs();
    console.log('معدل النجاح الحالي:', kpis.successRate);
    
  } catch (error) {
    console.error('❌ خطأ في العملية:', error.message);
  }
}

// ========================================
// تشغيل الأمثلة
// ========================================

async function runAllExamples() {
  try {
    console.log('🚀 تشغيل أمثلة الاستخدام...\n');
    
    console.log('1️⃣ إرسال إشعار بسيط');
    // await exampleSimpleNotification();
    
    console.log('2️⃣ إرسال من قالب');
    // await exampleTemplateNotification();
    
    console.log('3️⃣ إرسال جماعي');
    // await exampleBulkNotification();
    
    console.log('4️⃣ إدارة التفضيلات');
    // await exampleUserPreferences();
    
    console.log('5️⃣ إرسال واتس آب');
    // await exampleWhatsAppDirect();
    
    console.log('6️⃣ قواعس التنبيهات');
    // await exampleAlertRules();
    
    console.log('7️⃣ تقييم الأحداث');
    // await exampleEventEvaluation();
    
    console.log('8️⃣ الإحصائيات');
    // await exampleAnalytics();
    
    console.log('9️⃣ قوالب مخصصة');
    // await exampleCustomTemplate();
    
    console.log('🔟 تطبيق متكامل');
    // await exampleCompleteFlow();
    
    console.log('\n✅ اكتملت جميع الأمثلة');
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

// تصدير الأمثلة
module.exports = {
  exampleSimpleNotification,
  exampleTemplateNotification,
  exampleBulkNotification,
  exampleUserPreferences,
  exampleWhatsAppDirect,
  exampleAlertRules,
  exampleEventEvaluation,
  exampleAnalytics,
  exampleCustomTemplate,
  exampleCompleteFlow,
  runAllExamples,
};

// تشغيل الأمثلة إذا تم استدعاء الملف مباشرة
// if (require.main === module) {
//   runAllExamples();
// }
