/**
 * Dynatrace OneAgent Configuration
 * ================================
 * تكوين Dynatrace OneAgent للـ Backend
 */

module.exports = {
  // تفعيل/تعطيل Dynatrace
  enabled: process.env.DYNATRACE_ENABLED !== 'false',

  // معرف التطبيق
  applicationId: process.env.DYNATRACE_APP_ID || 'alawael-backend',

  // معرف البيئة
  environmentId: process.env.DYNATRACE_ENV_ID || 'production',

  // مستوى السجلات
  logLevel: process.env.DYNATRACE_LOG_LEVEL || 'info',

  // الخيارات المضافة
  options: {
    // تفعيل جمع المقاييس
    metricsEnabled: true,

    // تفعيل الـ Distributed Tracing
    trace: true,

    // الوسوم المخصصة
    tags: {
      application: 'alawael-erp-backend',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      team: 'alawael-team',
      region: process.env.REGION || 'local'
    },

    // خيارات الأداء
    performance: {
      captureErrorStackTrace: true,
      captureErrorStack: true
    }
  },

  // معلومات الاتصال (يتم تحديدها من البيئة)
  serverUrl: process.env.DYNATRACE_SERVER_URL || 'http://localhost:9411',
  apiToken: process.env.DYNATRACE_API_TOKEN || '',

  // إعدادات Node.js
  nodejs: {
    // جمع بيانات قاعدة البيانات
    mongoEnabled: true,
    redisEnabled: true,
    
    // جمع بيانات HTTP
    httpEnabled: true,
    httpsEnabled: true,

    // تفعيل Performance Monitoring
    performanceMonitoring: true
  }
};
