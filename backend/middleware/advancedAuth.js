/**
 * 🔐 Advanced Authentication Middleware - المصادقة المتقدمة
 * نظام ERP الألوائل - إصدار احترافي
 */

const jwt = require('jsonwebtoken');
const { securityConfig, SecurityService } = require('../config/security.config');

const securityService = new SecurityService();

/**
 * middleware للمصادقة الأساسية
 */
const authenticate = async (req, res, next) => {
  try {
    // التحقق من وجود التوكن
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'الوصول مرفوض. يرجى تسجيل الدخول'
      });
    }

    const token = authHeader.split(' ')[1];

    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, securityConfig.jwt.secret, {
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    });

    // إضافة معلومات المستخدم للطلب
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً',
        code: 'TOKEN_EXPIRED'
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
 * middleware للمصادقة الاختيارية
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, securityConfig.jwt.secret, {
          issuer: securityConfig.jwt.issuer,
          audience: securityConfig.jwt.audience
        });

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

/**
 * middleware للتحقق من الصلاحيات
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
 * middleware للتحقق من الصلاحيات المحددة
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

    // التحقق من الصلاحيات
    const hasPermission = securityService.checkPermission(req.user, resource, action);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `ليس لديك صلاحية ${action} على ${resource}`
      });
    }

    next();
  };
};

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
  if (securityConfig.mfa.enabled && req.user.mfaEnabled && !req.user.mfaVerified) {
    return res.status(403).json({
      success: false,
      message: 'يرجى التحقق من هويتك باستخدام المصادقة الثنائية',
      code: 'MFA_REQUIRED'
    });
  }

  next();
};

/**
 * middleware للتحقق من ملكية المورد
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

      if (req.user.id !== resourceUserId.toString()) {
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
    const decoded = jwt.verify(refreshToken, securityConfig.jwt.refreshSecret, {
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience
    });

    // إنشاء توكن جديد
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      securityConfig.jwt.secret,
      {
        expiresIn: securityConfig.jwt.accessTokenExpiry,
        issuer: securityConfig.jwt.issuer,
        audience: securityConfig.jwt.audience
      }
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

/**
 * middleware للتحقق من API Key
 */
const validateAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers[securityConfig.apiKeys.headerName.toLowerCase()];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API Key مطلوب'
      });
    }

    // التحقق من صحة API Key
    if (!apiKey.startsWith(securityConfig.apiKeys.prefix) &&
        !apiKey.startsWith(securityConfig.apiKeys.testPrefix)) {
      return res.status(401).json({
        success: false,
        message: 'API Key غير صالح'
      });
    }

    // يمكن إضافة التحقق من قاعدة البيانات هنا
    // const keyRecord = await APIKey.findOne({ key: apiKey, active: true });

    req.apiKey = apiKey;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من API Key'
    });
  }
};

/**
 * middleware لتسجيل النشاط
 */
const logActivity = (action) => {
  return async (req, res, next) => {
    // حفظ الـ res.json الأصلي
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      // تسجيل النشاط فقط إذا كان الطلب ناجحاً
      if (data.success !== false) {
        try {
          const activity = {
            action,
            userId: req.user?.id,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date(),
            details: {
              method: req.method,
              path: req.path,
              body: securityService.sanitizeForLogging(req.body),
              params: req.params,
              query: req.query
            }
          };

          // يمكن حفظ النشاط في قاعدة البيانات هنا
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

  const deviceFingerprint = {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user.id
  };

  // يمكن التحقق من الجهاز من قاعدة البيانات هنا
  // const knownDevice = await Device.findOne({ userId: req.user.id, fingerprint: hash(deviceFingerprint) });

  // إذا كان جهاز جديد
  // if (!knownDevice) {
  //   // إرسال إشعار للمستخدم
  // }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
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
  detectNewDevice
};
