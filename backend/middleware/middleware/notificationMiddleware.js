// ========================================
// Middleware للتحقق والحماية
// Notification System Middleware
// ========================================

const _express = require('express');
const logger = require('../utils/logger');

// ========================================
// 1️⃣ التحقق من صحة طلب الإشعار
// Notification Validation Middleware
// ========================================

const validateNotificationRequest = (req, res, next) => {
  try {
    const { userId, title, body, channels } = req.body;
    
    // التحقق من الحقول المطلوبة
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId مطلوب',
      });
    }
    
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title و body مطلوبان',
      });
    }
    
    // التحقق من صيغة userId
    if (typeof userId !== 'string' || userId.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'userId يجب أن يكون نصاً بطول 3 أحرف على الأقل',
      });
    }
    
    // التحقق من صيغة القنوات
    if (channels && typeof channels === 'object') {
      const validChannels = ['email', 'sms', 'whatsapp', 'inApp', 'push', 'dashboard'];
      Object.keys(channels).forEach(channel => {
        if (!validChannels.includes(channel)) {
          return res.status(400).json({
            success: false,
            error: `قناة غير صالحة: ${channel}`,
          });
        }
      });
    }
    
    // تخزين البيانات المتحققة في req
    req.validatedNotification = {
      userId,
      title: title.trim(),
      body: body.trim(),
      channels: channels || {},
    };
    
    next();
  } catch (_error) {
    res.status(400).json({
      success: false,
      error: 'خطأ في التحقق من الطلب',
      details: _error.message,
    });
  }
};

// ========================================
// 2️⃣ التحقق من معدل الطلبات
// Rate Limiting Middleware
// ========================================

const createRateLimitMiddleware = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // تنظيف الطلبات القديمة
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip).filter(time => now - time < windowMs);
    
    if (userRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز حد الطلبات المسموح',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    
    userRequests.push(now);
    requests.set(ip, userRequests);
    
    next();
  };
};

// ========================================
// 3️⃣ التحقق من رقم هاتফي
// Phone Number Validation
// ========================================

const validatePhoneNumber = (req, res, next) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'phoneNumber مطلوب',
    });
  }
  
  // تطبيع الرقم
  let normalized = phoneNumber.replace(/\D/g, '');
  
  // إضافة رمز الدولة إذا لم يكن موجوداً
  if (!normalized.startsWith('966') && !normalized.startsWith('00966')) {
    if (normalized.startsWith('5')) {
      normalized = '966' + normalized;
    }
  }
  
  // التحقق من الطول
  if (normalized.length < 11 || normalized.length > 13) {
    return res.status(400).json({
      success: false,
      error: 'رقم هاتف غير صحيح',
    });
  }
  
  req.validatedPhoneNumber = normalized;
  next();
};

// ========================================
// 4️⃣ التحقق من المصادقة
// Authentication Middleware
// ========================================

const authenticateUser = (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization?.split(' ')[1];
    
    if (!bearerToken) {
      return res.status(401).json({
        success: false,
        error: 'عدم وجود رمز المصادقة',
      });
    }
    
    // هنا يمكنك التحقق من JWT token
    // مثال:
    // const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    // req.userId = decoded.id;
    
    req.authToken = bearerToken;
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      error: 'رمز مصادقة غير صحيح',
    });
  }
};

// ========================================
// 5️⃣ المحاسبة والتسجيل
// Audit Logging Middleware
// ========================================

const auditLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // تسجيل الطلب الأصلي
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // تسجيل معلومات الطلب
    logger.info(`Notification API Request`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.body?.userId,
      timestamp: new Date().toISOString(),
    });
    
    // تخزين في req للاستخدام لاحقاً
    req.auditLog = {
      duration,
      timestamp: new Date(),
    };
    
    res.send = originalSend;
    return res.send(data);
  };
  
  next();
};

// ========================================
// 6️⃣ معالجة الأخطاء الشاملة
// Error Handling Middleware
// ========================================

const notificationErrorHandler = (err, req, res) => {
  logger.error('Notification System Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // معالجة أنواع الأخطاء المختلفة
  if (err.message.includes('Database')) {
    return res.status(503).json({
      success: false,
      error: 'خطأ في الاتصال بـ قاعدة البيانات',
    });
  }
  
  if (err.message.includes('WhatsApp')) {
    return res.status(503).json({
      success: false,
      error: 'خدمة الواتس آب غير متاحة حالياً',
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'حدث خطأ في النظام',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ========================================
// 7️⃣ التحقق من الموارد
// Resource Existence Middleware
// ========================================

const validateResourceExists = (modelName) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'معرف الموارد مطلوب',
        });
      }
      
      // يمكن تخزين الموارد في req للاستخدام لاحقاً
      req.resourceId = id;
      req.modelName = modelName;
      
      next();
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من الموارد',
      });
    }
  };
};

// ========================================
// 8️⃣ التحقق من صيغة البريد الإلكتروني
// Email Validation
// ========================================

const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'البريد الإلكتروني مطلوب',
    });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'صيغة البريد الإلكتروني غير صحيحة',
    });
  }
  
  req.validatedEmail = email.toLowerCase();
  next();
};

// ========================================
// 9️⃣ التحقق من الوقت
// Time Window Validation
// ========================================

const validateTimeWindow = (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'صيغة التاريخ غير صحيحة (يجب أن تكون ISO 8601)',
        });
      }
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
        });
      }
      
      // حد أقصى 90 يوم
      const maxDays = 90 * 24 * 60 * 60 * 1000;
      if (end - start > maxDays) {
        return res.status(400).json({
          success: false,
          error: 'الفترة الزمنية يجب أن لا تتجاوز 90 يوماً',
        });
      }
      
      req.validatedDates = { startDate: start, endDate: end };
    }
    
    next();
  } catch (_error) {
    res.status(400).json({
      success: false,
      error: 'خطأ في التحقق من الوقت',
    });
  }
};

// ========================================
// 🔟 معالج الطلب الماضي
// 404 Not Found Handler
// ========================================

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'المورد غير موجود',
    path: req.path,
    method: req.method,
  });
};

// ========================================
// تصدير جميع الـ Middleware
// ========================================

module.exports = {
  validateNotificationRequest,
  validatePhoneNumber,
  validateEmail,
  authenticateUser,
  auditLoggingMiddleware,
  notificationErrorHandler,
  validateResourceExists,
  validateTimeWindow,
  createRateLimitMiddleware,
  notFoundHandler,
};

// ========================================
// مثال على الاستخدام:
// ========================================
/*

const express = require('express');
const {
  validateNotificationRequest,
  validatePhoneNumber,
  auditLoggingMiddleware,
  createRateLimitMiddleware,
  notificationErrorHandler,
} = require('./middleware/notificationMiddleware');

const app = express();

// تطبيق الـ Middleware العام
app.use(express.json());
app.use(auditLoggingMiddleware);
app.use(createRateLimitMiddleware(100, 60000)); // 100 طلب في الدقيقة

// الطرق
app.post('/api/notifications/send', 
  validateNotificationRequest,
  (req, res) => {
    // معالج الطلب
  }
);

app.post('/api/notifications/whatsapp/send',
  validatePhoneNumber,
  (req, res) => {
    // معالج الطلب
  }
);

// معالج الأخطاء
app.use(notificationErrorHandler);

*/
