/**
 * Mobile App Backend Controller
 * متحكم تطبيق الهاتف المحمول
 * 
 * Endpoints:
 * - Device Management
 * - Offline Sync
 * - Push Notifications
 * - Mobile Analytics
 */

const { Logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

const mobileDeviceManager = require('../services/mobileDeviceManager.service');
const offlineSyncManager = require('../services/offlineSyncManager.service');
const pushNotificationOptimizer = require('../services/pushNotificationOptimizer.service');
const mobileAnalyticsService = require('../services/mobileAnalytics.service');

// ============================================================
// Device Management
// ============================================================

/**
 * تسجيل جهاز محمول جديد
 * Register new mobile device
 */
exports.registerDevice = async (req, res) => {
  try {
    const { deviceName, osType, osVersion, appVersion, model, manufacturer, pushToken, ...rest } =
      req.body;

    if (!osType || !appVersion) {
      return errorResponse(res, 400, 'OS Type and App Version are required', 'en');
    }

    const device = mobileDeviceManager.registerDevice({
      userId: req.user.id,
      deviceName,
      osType,
      osVersion,
      appVersion,
      model,
      manufacturer,
      pushToken,
      ...rest,
    });

    // Register push token immediately
    if (pushToken) {
      pushNotificationOptimizer.registerPushToken(req.user.id, device.id, pushToken, {
        platform: osType,
      });
    }

    return successResponse(res, 200, 'Device registered successfully', 'جهاز مسجل بنجاح', device);
  } catch (error) {
    Logger.error('Register device error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في تسجيل الجهاز');
  }
};

/**
 * الحصول على أجهزة المستخدم
 * Get user devices
 */
exports.getUserDevices = async (req, res) => {
  try {
    const devices = mobileDeviceManager.getUserDevices(req.user.id);
    const stats = mobileDeviceManager.getDeviceStats(req.user.id);

    return successResponse(
      res,
      200,
      'Devices retrieved successfully',
      'تم استرجاع الأجهزة بنجاح',
      { devices, stats }
    );
  } catch (error) {
    Logger.error('Get devices error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في الحصول على الأجهزة');
  }
};

/**
 * الثقة في جهاز (المصادقة البيومترية)
 * Trust device for biometric auth
 */
exports.trustDevice = async (req, res) => {
  try {
    const { deviceId, daysValid = 90 } = req.body;

    if (!deviceId) {
      return errorResponse(res, 400, 'Device ID is required', 'معرف الجهاز مطلوب');
    }

    const device = mobileDeviceManager.trustDevice(deviceId, daysValid);

    return successResponse(res, 200, 'Device trusted', 'تم الثقة في الجهاز', device);
  } catch (error) {
    Logger.error('Trust device error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في تفعيل الثقة');
  }
};

/**
 * إزالة الثقة من جهاز
 * Untrust device
 */
exports.untrustDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return errorResponse(res, 400, 'Device ID is required', 'معرف الجهاز مطلوب');
    }

    const device = mobileDeviceManager.untrustDevice(deviceId);

    return successResponse(res, 200, 'Device untrusted', 'تم إزالة الثقة من الجهاز', device);
  } catch (error) {
    Logger.error('Untrust device error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في إزالة الثقة');
  }
};

/**
 * تفعيل المصادقة البيومترية
 * Enable biometric authentication
 */
exports.enableBiometric = async (req, res) => {
  try {
    const { deviceId, biometricType } = req.body;

    if (!deviceId || !biometricType) {
      return errorResponse(
        res,
        400,
        'Device ID and biometric type are required',
        'معرف الجهاز ونوع البيومتري مطلوبان'
      );
    }

    const device = mobileDeviceManager.enableBiometric(deviceId, biometricType);

    return successResponse(res, 200, 'Biometric enabled', 'تم تفعيل البيومتري', device);
  } catch (error) {
    Logger.error('Enable biometric error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في تفعيل البيومتري');
  }
};

/**
 * حذف جهاز
 * Delete device
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    mobileDeviceManager.deleteDevice(deviceId);

    return successResponse(res, 200, 'Device deleted', 'تم حذف الجهاز');
  } catch (error) {
    Logger.error('Delete device error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في حذف الجهاز');
  }
};

// ============================================================
// Offline Sync Management
// ============================================================

/**
 * الحصول على العمليات المعلقة (بدون اتصال)
 * Get pending offline operations
 */
exports.getPendingOperations = async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return errorResponse(res, 400, 'Device ID is required', 'معرف الجهاز مطلوب');
    }

    const operations = offlineSyncManager.getPendingOperations(req.user.id, deviceId);

    return successResponse(
      res,
      200,
      'Pending operations retrieved',
      'تم استرجاع العمليات المعلقة',
      { operations, count: operations.length }
    );
  } catch (error) {
    Logger.error('Get pending operations error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في الحصول على العمليات');
  }
};

/**
 * إضافة عملية إلى قائمة الانتظار بدون اتصال
 * Queue offline operation
 */
exports.queueOperation = async (req, res) => {
  try {
    const { deviceId, type, resource, resourceId, payload, priority } = req.body;

    if (!deviceId || !type || !resource) {
      return errorResponse(res, 400, 'Missing required fields', 'حقول مطلوبة ناقصة');
    }

    const operation = offlineSyncManager.queueOperation({
      userId: req.user.id,
      deviceId,
      type,
      resource,
      resourceId,
      payload,
      priority,
    });

    return successResponse(
      res,
      200,
      'Operation queued for sync',
      'تمت إضافة العملية للمزامنة',
      operation
    );
  } catch (error) {
    Logger.error('Queue operation error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في إضافة العملية');
  }
};

/**
 * مزامنة العمليات المعلقة
 * Sync pending operations
 */
exports.syncOperations = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return errorResponse(res, 400, 'Device ID is required', 'معرف الجهاز مطلوب');
    }

    const results = await offlineSyncManager.syncOperations(req.user.id, deviceId);

    return successResponse(res, 200, 'Sync completed', 'تمت المزامنة', results);
  } catch (error) {
    Logger.error('Sync operations error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في المزامنة');
  }
};

/**
 * الحصول على حالة المزامنة
 * Get sync status
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return errorResponse(res, 400, 'Device ID is required', 'معرف الجهاز مطلوب');
    }

    const status = offlineSyncManager.getSyncStatus(req.user.id, deviceId);

    return successResponse(res, 200, 'Sync status retrieved', 'تم استرجاع حالة المزامنة', status);
  } catch (error) {
    Logger.error('Get sync status error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في الحصول على الحالة');
  }
};

/**
 * حل تعارض في البيانات
 * Resolve data conflict
 */
exports.resolveConflict = async (req, res) => {
  try {
    const { operationId, localData, remoteData, strategy } = req.body;

    if (!operationId) {
      return errorResponse(res, 400, 'Operation ID is required', 'معرف العملية مطلوب');
    }

    const resolved = offlineSyncManager.resolveConflict({
      operationId,
      localData,
      remoteData,
      strategy,
    });

    return successResponse(res, 200, 'Conflict resolved', 'تم حل التعارض', { resolved });
  } catch (error) {
    Logger.error('Resolve conflict error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في حل التعارض');
  }
};

// ============================================================
// Push Notifications
// ============================================================

/**
 * إرسال إشعار دفع
 * Send push notification
 */
exports.sendPushNotification = async (req, res) => {
  try {
    const { title, body, deviceId, priority, customData, action } = req.body;

    if (!title || !body || !deviceId) {
      return errorResponse(
        res,
        400,
        'Title, body, and device ID are required',
        'العنوان والمحتوى ومعرف الجهاز مطلوبة'
      );
    }

    const notification = await pushNotificationOptimizer.sendPushNotification({
      userId: req.user.id,
      deviceId,
      title,
      body,
      priority,
      customData,
      action,
    });

    return successResponse(
      res,
      200,
      'Notification sent',
      'تم إرسال الإشعار',
      notification
    );
  } catch (error) {
    Logger.error('Send push notification error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في إرسال الإشعار');
  }
};

/**
 * إرسال إشعارات مجموعية
 * Send batch push notifications
 */
exports.sendBatchNotifications = async (req, res) => {
  try {
    const { deviceIds, title, body, customData } = req.body;

    if (!Array.isArray(deviceIds) || !title || !body) {
      return errorResponse(
        res,
        400,
        'Invalid batch notification data',
        'بيانات الإشعارات غير صحيحة'
      );
    }

    const deviceList = deviceIds.map(deviceId => ({
      userId: req.user.id,
      deviceId,
    }));

    const results = await pushNotificationOptimizer.sendBatchNotifications(deviceList, {
      title,
      body,
      customData,
    });

    return successResponse(res, 200, 'Batch sent', 'تم إرسال الدفعة', results);
  } catch (error) {
    Logger.error('Send batch notifications error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في إرسال الدفعة');
  }
};

/**
 * تسجيل رمز الإشعارات
 * Register push token
 */
exports.registerPushToken = async (req, res) => {
  try {
    const { deviceId, pushToken, platform, environment } = req.body;

    if (!deviceId || !pushToken) {
      return errorResponse(
        res,
        400,
        'Device ID and push token are required',
        'معرف الجهاز والرمز مطلوبان'
      );
    }

    const token = pushNotificationOptimizer.registerPushToken(req.user.id, deviceId, pushToken, {
      platform,
      environment,
    });

    return successResponse(res, 200, 'Token registered', 'تم تسجيل الرمز', token);
  } catch (error) {
    Logger.error('Register push token error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في التسجيل');
  }
};

/**
 * اختبار إرسال الإشعارات
 * Test push notification delivery
 */
exports.testPushDelivery = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return errorResponse(res, 400, 'Device ID is required', 'معرف الجهاز مطلوب');
    }

    const result = await pushNotificationOptimizer.testPushDelivery(req.user.id, deviceId);

    return successResponse(res, 200, 'Test initiated', 'بدء الاختبار', result);
  } catch (error) {
    Logger.error('Test push delivery error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في الاختبار');
  }
};

/**
 * الحصول على إحصائيات الإشعارات
 * Get push notification statistics
 */
exports.getPushStats = async (req, res) => {
  try {
    const stats = pushNotificationOptimizer.getNotificationStats(req.user.id);

    return successResponse(
      res,
      200,
      'Push stats retrieved',
      'تم استرجاع الإحصائيات',
      stats
    );
  } catch (error) {
    Logger.error('Get push stats error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في الإحصائيات');
  }
};

// ============================================================
// Mobile Analytics
// ============================================================

/**
 * بدء جلسة محمول
 * Start mobile session
 */
exports.startSession = async (req, res) => {
  try {
    const { deviceId, appVersion, osVersion, networkType, locale, timezone } = req.body;

    if (!deviceId || !appVersion || !osVersion) {
      return errorResponse(
        res,
        400,
        'Device ID, app version, and OS version are required',
        'المعرف والإصدارات مطلوبة'
      );
    }

    const session = mobileAnalyticsService.startSession(req.user.id, deviceId, {
      appVersion,
      osVersion,
      networkType,
      locale,
      timezone,
    });

    return successResponse(res, 200, 'Session started', 'تمت بداية الجلسة', session);
  } catch (error) {
    Logger.error('Start session error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في بدء الجلسة');
  }
};

/**
 * إنهاء جلسة
 * End session
 */
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required', 'معرف الجلسة مطلوب');
    }

    const session = mobileAnalyticsService.endSession(sessionId);

    return successResponse(res, 200, 'Session ended', 'انتهت الجلسة', session);
  } catch (error) {
    Logger.error('End session error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في إنهاء الجلسة');
  }
};

/**
 * تتبع حدث
 * Track event
 */
exports.trackEvent = async (req, res) => {
  try {
    const { sessionId, category, action, label, value, screenName, customParams } = req.body;

    if (!sessionId || !category || !action) {
      return errorResponse(
        res,
        400,
        'Session ID, category, and action are required',
        'معرف الجلسة والفئة والإجراء مطلوبة'
      );
    }

    const event = mobileAnalyticsService.trackEvent(sessionId, {
      category,
      action,
      label,
      value,
      screenName,
      customParams,
    });

    return successResponse(res, 200, 'Event tracked', 'تم تتبع الحدث', event);
  } catch (error) {
    Logger.error('Track event error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في التتبع');
  }
};

/**
 * تسجيل توقف أو خطأ
 * Log crash
 */
exports.logCrash = async (req, res) => {
  try {
    const { sessionId, type, message, stack, severity, fatal, customData } = req.body;

    if (!sessionId || !message) {
      return errorResponse(
        res,
        400,
        'Session ID and message are required',
        'معرف الجلسة والرسالة مطلوبة'
      );
    }

    const crash = mobileAnalyticsService.logCrash(sessionId, {
      type,
      message,
      stack,
      severity,
      fatal,
      customData,
    });

    return successResponse(res, 200, 'Crash reported', 'تم تقرير التوقف', crash);
  } catch (error) {
    Logger.error('Log crash error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في تقرير التوقف');
  }
};

/**
 * الحصول على إحصائيات الجلسة
 * Get session statistics
 */
exports.getSessionStats = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required', 'معرف الجلسة مطلوب');
    }

    const stats = mobileAnalyticsService.getSessionStats(sessionId);

    return successResponse(res, 200, 'Session stats retrieved', 'تم استرجاع الإحصائيات', stats);
  } catch (error) {
    Logger.error('Get session stats error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في الإحصائيات');
  }
};

/**
 * الحصول على تحليلات المستخدم
 * Get user analytics
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const analytics = mobileAnalyticsService.getUserAnalytics(req.user.id, parseInt(days));

    return successResponse(
      res,
      200,
      'User analytics retrieved',
      'تم استرجاع التحليلات',
      analytics
    );
  } catch (error) {
    Logger.error('Get user analytics error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في التحليلات');
  }
};

/**
 * الحصول على تقرير الأعطال
 * Get crash report
 */
exports.getCrashReport = async (req, res) => {
  try {
    const { userId, severity, fatal } = req.query;

    const filters = {
      userId: userId || req.user.id,
      severity,
      fatal: fatal === 'true',
    };

    const report = mobileAnalyticsService.getCrashReport(filters);

    return successResponse(res, 200, 'Crash report retrieved', 'تم استرجاع التقرير', report);
  } catch (error) {
    Logger.error('Get crash report error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في التقرير');
  }
};

/**
 * الحصول على تقرير الأداء
 * Get performance report
 */
exports.getPerformanceReport = async (req, res) => {
  try {
    const { metricName } = req.query;

    if (!metricName) {
      return errorResponse(res, 400, 'Metric name is required', 'اسم المقياس مطلوب');
    }

    const report = mobileAnalyticsService.getPerformanceReport(req.user.id, metricName);

    return successResponse(
      res,
      200,
      'Performance report retrieved',
      'تم استرجاع تقرير الأداء',
      report
    );
  } catch (error) {
    Logger.error('Get performance report error:', error);
    return errorResponse(res, 500, error.message, 'خطأ في تقرير الأداء');
  }
};
