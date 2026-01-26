/**
 * ===================================================================
 * ACCOUNTING MIDDLEWARE - Middleware للنظام المحاسبي
 * ===================================================================
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware للمصادقة
 */
const authenticate = async (req, res, next) => {
  try {
    // الحصول على التوكن من الـ header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - لا يوجد توكن',
      });
    }

    const token = authHeader.substring(7); // إزالة "Bearer "

    // التحقق من التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // البحث عن المستخدم
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - المستخدم غير موجود',
      });
    }

    // إضافة المستخدم إلى الـ request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - التوكن غير صالح',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - انتهت صلاحية التوكن',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الهوية',
    });
  }
};

/**
 * Middleware للتفويض حسب الأدوار
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    // التحقق من وجود دور واحد على الأقل من الأدوار المسموحة
    const hasRole = req.user.roles?.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'ممنوع - ليس لديك صلاحية للوصول',
        requiredRoles: allowedRoles,
        yourRoles: req.user.roles || [],
      });
    }

    next();
  };
};

/**
 * Middleware للتحقق من الأذونات الخاصة
 */
const checkPermission = permission => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    // المديرون لديهم جميع الصلاحيات
    if (req.user.roles?.includes('admin')) {
      return next();
    }

    // التحقق من الصلاحية المحددة
    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `ممنوع - تحتاج إلى صلاحية: ${permission}`,
      });
    }

    next();
  };
};

/**
 * Middleware لتسجيل العمليات
 */
const logAction = action => {
  return (req, res, next) => {
    // حفظ معلومات الطلب لاستخدامها بعد إتمام الطلب
    req.auditInfo = {
      action,
      userId: req.user?._id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    };

    next();
  };
};

/**
 * Middleware للتحقق من حالة الحساب
 */
const checkAccountStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    // التحقق من أن الحساب نشط
    if (req.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير نشط',
        accountStatus: req.user.status,
      });
    }

    // التحقق من انتهاء صلاحية الحساب (إذا كان هناك تاريخ انتهاء)
    if (req.user.expiryDate && new Date(req.user.expiryDate) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'انتهت صلاحية الحساب',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من حالة الحساب',
    });
  }
};

/**
 * Middleware لتحديد معدل الطلبات (Rate Limiting)
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 دقيقة
    maxRequests = 100,
    message = 'تم تجاوز الحد الأقصى للطلبات. حاول مرة أخرى لاحقاً',
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const key = req.user?._id?.toString() || req.ip;
    const now = Date.now();

    // الحصول على سجل الطلبات للمستخدم
    let userRequests = requests.get(key) || [];

    // إزالة الطلبات القديمة
    userRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    // التحقق من تجاوز الحد
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000),
      });
    }

    // إضافة الطلب الحالي
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

/**
 * Middleware للتحقق من الفترة المحاسبية المقفلة
 */
const checkClosedPeriod = async (req, res, next) => {
  try {
    const AccountingSettings = require('../models/AccountingSettings');
    const settings = await AccountingSettings.findOne();

    if (!settings?.closedPeriods || settings.closedPeriods.length === 0) {
      return next();
    }

    // الحصول على التاريخ من الطلب
    const date = req.body.date ? new Date(req.body.date) : new Date();

    // التحقق من أن التاريخ ليس ضمن فترة مقفلة
    const isInClosedPeriod = settings.closedPeriods.some(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return date >= startDate && date <= endDate;
    });

    if (isInClosedPeriod) {
      // المديرون فقط يمكنهم التعديل في فترة مقفلة
      if (!req.user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن إضافة أو تعديل قيود في فترة مقفلة',
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الفترة المحاسبية',
    });
  }
};

/**
 * Middleware لمعالجة الأخطاء غير المتزامنة
 */
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware لمعالجة الأخطاء العامة
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // أخطاء التحقق من البيانات
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors,
    });
  }

  // أخطاء المفاتيح المكررة
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `القيمة موجودة مسبقاً: ${field}`,
    });
  }

  // أخطاء Cast (مثل ObjectId غير صالح)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'معرف غير صالح',
    });
  }

  // الخطأ الافتراضي
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware للتحقق من ملكية المورد
 */
const checkOwnership = (Model, resourceParam = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[resourceParam];
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود',
      });
    }

    // المديرون يمكنهم الوصول لجميع الموارد
    if (req.user.roles?.includes('admin')) {
      req.resource = resource;
      return next();
    }

    // التحقق من الملكية
    const ownerId = resource.createdBy?._id?.toString() || resource.createdBy?.toString();
    const userId = req.user._id.toString();

    if (ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا المورد',
      });
    }

    req.resource = resource;
    next();
  });
};

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  logAction,
  checkAccountStatus,
  rateLimit,
  checkClosedPeriod,
  asyncHandler,
  errorHandler,
  checkOwnership,
};
