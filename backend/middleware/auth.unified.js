/**
 * 🔐 Unified Authentication Middleware - middleware المصادقة الموحد
 * يجمع كل وظائف المصادقة في ملف واحد
 * @version 2.0.0
 */

const jwt = require('jsonwebtoken');
const { securityConfig, SecurityService } = require('../config/security.config');

const securityService = securityConfig ? new SecurityService() : null;

// JWT Secret - مع دعم لبيئة الاختبار
const JWT_SECRET = process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'test'
    ? 'test-secret-key-for-testing-only'
    : 'your-super-secret-jwt-key-change-this-in-production');

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';

// ============================================
// 1. المصادقة الأساسية - Basic Authentication
// ============================================

/**
 * middleware للمصادقة الأساسية
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'الوصول مرفوض. يرجى تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.split(' ')[1];

    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, JWT_SECRET);

    // إضافة معلومات المستخدم للطلب
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً',
        code: 'TOKEN_EXPIRED',
        expired: true
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'توكن غير صالح',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'خطأ في المصادقة'
    });
  }
};

/**
 * Authenticate JWT token middleware (alias for authenticate)
 */
const authenticateToken = authenticate;

/**
 * requireAuth - Strict authentication
 */
const requireAuth = authenticate;

/**
 * protect - Alias for compatibility
 */
const protect = authenticate;

// ============================================
// 2. المصادقة الاختيارية - Optional Authentication
// ============================================

/**
 * middleware للمصادقة الاختيارية (لا يفشل إذا لم يوجد توكن)
 */
const optionalAuth = async (req, res, next) => {
  try {
    // إذا كان المستخدم موجوداً بالفعل
    if (req.user) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.token = token;
      } catch (error) {
        // تجاهل الأخطاء في المصادقة الاختيارية
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// ============================================
// 3. التحقق من الصلاحيات - Authorization
// ============================================

/**
 * middleware للتحقق من الصلاحيات بناءً على الأدوار
 * @param {...string} roles - الأدوار المسموح بها
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'الوصول مرفوض. يرجى تسجيل الدخول'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
      });
    }

    next();
  };
};

/**
 * requireRole - Alias for authorize
 */
const requireRole = authorize;

/**
 * authorizeRole - Another alias
 */
const authorizeRole = authorize;

/**
 * Check if user is admin
 */
const requireAdmin = (req, res, next) => {
  const role = req && req.user && req.user.role;
  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ============================================
// 4. التحقق من الصلاحيات المتقدمة
// ============================================

/**
 * middleware للتحقق من الصلاحيات المحددة
 * @param {string} resource - المورد
 * @param {string} action - الإجراء
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'الوصول مرفوض. يرجى تسجيل الدخول'
      });
    }

    // المسؤول لديه كل الصلاحيات
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    // التحقق من الصلاحيات باستخدام SecurityService
    if (securityService && typeof securityService.checkPermission === 'function') {
      const hasPermission = securityService.checkPermission(req.user, resource, action);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `ليس لديك صلاحية ${action} على ${resource}`
        });
      }
    }

    next();
  };
};

// ============================================
// 5. التحقق من MFA
// ============================================

/**
 * middleware للتحقق من MFA
 */
const requireMFA = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الوصول مرفوض'
    });
  }

  // التحقق من تفعيل MFA للمستخدم
  if (securityConfig?.mfa?.enabled && req.user.mfaEnabled && !req.user.mfaVerified) {
    return res.status(403).json({
      success: false,
      message: 'يرجى التحقق من هويتك باستخدام المصادقة الثنائية',
      code: 'MFA_REQUIRED'
    });
  }

  next();
};

// ============================================
// 6. التحقق من الملكية
// ============================================

/**
 * middleware للتحقق من ملكية المورد
 * @param {Function} getResourceUserId - دالة للحصول على معرف المستخدم المالك
 */
const checkOwnership = (getResourceUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'الوصول مرفوض'
      });
    }

    // المسؤول لديه كل الصلاحيات
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    try {
      const resourceUserId = await getResourceUserId(req);

      if (req.user.id !== resourceUserId.toString() && req.user._id !== resourceUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الملكية'
      });
    }
  };
};

// ============================================
// 7. التحقق من الفرع
// ============================================

/**
 * middleware للتحقق من الفرع
 */
const checkBranch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الوصول مرفوض'
    });
  }

  // المسؤول لديه كل الصلاحيات
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    return next();
  }

  const requestedBranch = req.params.branchId || req.body.branch || req.query.branch;

  if (requestedBranch && req.user.branch !== requestedBranch) {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية للوصول إلى هذا الفرع'
    });
  }

  next();
};

// ============================================
// 8. تحديث التوكن
// ============================================

/**
 * middleware لتحديث التوكن
 */
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token مطلوب'
      });
    }

    // التحقق من صحة التوكن
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // إنشاء توكن جديد
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      JWT_SECRET,
      { expiresIn: securityConfig?.jwt?.accessTokenExpiry || '1h' }
    );

    req.newAccessToken = newAccessToken;
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token غير صالح أو منتهي الصلاحية'
    });
  }
};

// ============================================
// 9. التحقق من API Key
// ============================================

/**
 * middleware للتحقق من API Key
 */
const validateAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['apikey'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API Key مطلوب'
      });
    }

    // التحقق من صحة API Key
    const validPrefix = securityConfig?.apiKeys?.prefix || 'ak_live_';
    const testPrefix = securityConfig?.apiKeys?.testPrefix || 'ak_test_';

    if (!apiKey.startsWith(validPrefix) && !apiKey.startsWith(testPrefix)) {
      return res.status(401).json({
        success: false,
        message: 'API Key غير صالح'
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من API Key'
    });
  }
};

// ============================================
// 10. تسجيل النشاط
// ============================================

/**
 * middleware لتسجيل النشاط
 * @param {string} action - الإجراء
 */
const logActivity = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      if (data.success !== false) {
        try {
          const activity = {
            action,
            userId: req.user?.id || req.user?._id,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date(),
            details: {
              method: req.method,
              path: req.path,
              params: req.params,
              query: req.query
            }
          };

          console.log('📋 Activity Log:', JSON.stringify(activity));
        } catch (error) {
          console.error('Error logging activity:', error);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

// ============================================
// 11. التحقق من الحساب
// ============================================

/**
 * middleware للتحقق من كلمة المرور المؤقتة
 */
const requirePasswordChange = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الوصول مرفوض'
    });
  }

  if (req.user.requirePasswordChange) {
    return res.status(403).json({
      success: false,
      message: 'يرجى تغيير كلمة المرور الخاصة بك',
      code: 'PASSWORD_CHANGE_REQUIRED'
    });
  }

  next();
};

/**
 * middleware للتحقق من الحساب المؤكد
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الوصول مرفوض'
    });
  }

  if (!req.user.verified && !req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'يرجى تأكيد حسابك أولاً',
      code: 'ACCOUNT_NOT_VERIFIED'
    });
  }

  next();
};

/**
 * middleware لمنع الوصول للمستخدمين المحذوفين
 */
const checkActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'الوصول مرفوض'
    });
  }

  if (req.user.deletedAt || req.user.status === 'deleted') {
    return res.status(403).json({
      success: false,
      message: 'هذا الحساب محذوف',
      code: 'ACCOUNT_DELETED'
    });
  }

  if (req.user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'هذا الحساب معلق',
      code: 'ACCOUNT_SUSPENDED'
    });
  }

  next();
};

/**
 * middleware للتحقق من جلسة جديدة
 */
const detectNewDevice = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // يمكن إضافة التحقق من الجهاز هنا
  next();
};

// ============================================
// التصدير - Exports
// ============================================

module.exports = {
  // Primary exports
  authenticate,
  authorize,
  optionalAuth,

  // Advanced features
  checkPermission,
  requireMFA,
  checkOwnership,
  checkBranch,
  refreshToken,
  validateAPIKey,
  logActivity,
  requirePasswordChange,
  requireVerified,
  checkActiveUser,
  detectNewDevice,

  // Aliases for compatibility (backward compatibility)
  protect,
  authenticateToken,
  requireAuth,
  requireRole,
  authorizeRole,
  requireAdmin,
};
