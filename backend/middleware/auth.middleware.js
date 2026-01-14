/**
 * Authentication Middleware - مكون المصادقة
 *
 * ✅ Token Validation
 * ✅ User Context Setup
 * ✅ Role-Based Access Control (RBAC)
 * ✅ Error Handling
 * ✅ Token Refresh Logic
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate Token Middleware
 * التحقق من صحة التوكن وإعداد سياق المستخدم
 */
const authenticateToken = (req, res, next) => {
  try {
    // استخراج التوكن من الـ Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // إذا لم يكن هناك توكن
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN',
      });
    }

    // التحقق من صحة التوكن
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        // معالجة أنواع مختلفة من الأخطاء
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
            expiresAt: err.expiredAt,
          });
        }

        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
          });
        }

        return res.status(403).json({
          success: false,
          error: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED',
        });
      }

      // إضافة بيانات المستخدم إلى الـ request
      req.user = user;
      req.userId = user.id || user.sub;
      req.userRole = user.role || 'user';

      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: error.message,
    });
  }
};

/**
 * Require Admin Middleware
 * التحقق من أن المستخدم له صلاحية admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_ONLY',
    });
  }

  next();
};

/**
 * Require Specific Role Middleware Factory
 * إنشاء middleware للتحقق من دور معين
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require Permission Middleware
 * التحقق من صلاحية معينة للمستخدم
 */
const requirePermission = permission => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // تحقق من أن المستخدم لديه الصلاحية المطلوبة
    const hasPermission = req.user.permissions && req.user.permissions.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        code: 'PERMISSION_DENIED',
        requiredPermission: permission,
      });
    }

    next();
  };
};

/**
 * Optional Auth Middleware
 * يتحقق من التوكن إن وُجد، لكن لا يرفع الطلب إذا لم يكن موجود
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // لا يوجد توكن، لكن نستمر بدون معلومات المستخدم
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (!err) {
      req.user = user;
      req.userId = user.id || user.sub;
      req.userRole = user.role || 'user';
    }
    // في كلا الحالات، نستمر
    next();
  });
};

/**
 * Extract Token Helper
 * استخراج التوكن من الـ request
 */
const extractToken = req => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

/**
 * Verify Token Helper
 * التحقق من صحة التوكن (بدون الـ response)
 */
const verifyToken = token => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate Token Helper
 * إنشاء توكن جديد
 */
const generateToken = (userData, expiresIn = '24h') => {
  return jwt.sign(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions || [],
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn },
  );
};

/**
 * Refresh Token Helper
 * تحديث التوكن
 */
const refreshToken = (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // فك التوكن بدون التحقق من الانتهاء
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    // إنشاء توكن جديد
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    });

    return res.json({
      success: true,
      token: newToken,
      expiresIn: '24h',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message,
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  optionalAuth,
  extractToken,
  verifyToken,
  generateToken,
  refreshToken,
};
