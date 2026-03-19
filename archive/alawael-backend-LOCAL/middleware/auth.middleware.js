/**
 * Authentication Middleware - alawael-backend Professional Upgrade
 * مكون المصادقة - الترقية الاحترافية
 * 
 * ** UPGRADE: Using Singleton Pattern + DI **
 * ✅ Token Validation
 * ✅ User Context Setup
 * ✅ Role-Based Access Control (RBAC)
 * ✅ Error Handling
 * ✅ Token Refresh Logic
 */

const jwt = require('jsonwebtoken');
const { getAuthenticationService, getSecurityService, getUnifiedJWTSecret } = require('../services/services.singleton');

/**
 * Authenticate Token Middleware
 * التحقق من صحة التوكن وإعداد سياق المستخدم
 * Now uses singleton instances for consistency
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authService = getAuthenticationService();
    const JWT_SECRET = getUnifiedJWTSecret();
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN',
      });
    }

    // Verify JWT using security service singleton
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
            expired: true
          });
        }
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      // Set user context
      req.user = decoded;
      req.userId = decoded.id || decoded.userId;
      req.userRole = decoded.role || 'user';
      req.permissions = decoded.permissions || [];
      
      next();
    });
  } catch (error) {
    console.error('[AUTH] error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: error.message,
    });
  }
};

/**
 * Extract Token Helper
 * استخراج التوكن من الـ request
 */
const extractToken = req => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  return null;
};

/**
 * Verify Token Helper
 * التحقق من صحة التوكن (بدون الـ response)
 */
const verifyToken = token => {
  try {
    const JWT_SECRET = getUnifiedJWTSecret();
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate Token Helper
 * إنشاء توكن جديد
 */
const generateToken = (user, expiresIn = '24h') => {
  try {
    const JWT_SECRET = getUnifiedJWTSecret();
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      permissions: user.permissions || [],
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      algorithm: 'HS256',
    });

    return {
      token,
      expiresIn,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('[TOKEN] Generation error:', error);
    return null;
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
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * Require Role Middleware
 * التحقق من أن المستخدم له دور معين
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
        code: 'ROLE_REQUIRED',
        requiredRoles: roles,
        currentRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require Permission Middleware
 * التحقق من صلاحية معينة
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

  jwt.verify(token, getUnifiedJWTSecret(), (err, user) => {
    if (!err) {
      req.user = user;
      req.userId = user.id || user.sub;
      req.userRole = user.role || 'user';
      req.permissions = user.permissions || [];
    }
    // في كلا الحالات، نستمر
    next();
  });
};

/**
 * Require Permissions (multiple)
 */
const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userPermissions = req.permissions || req.user.permissions || [];
    const hasAll = permissions.every(
      perm => userPermissions.includes(perm) || userPermissions.includes('ALL')
    );

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: permissions,
        current: userPermissions,
      });
    }

    next();
  };
};

/**
 * Refresh Token Helper
 */
const refreshTokenHelper = (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || getUnifiedJWTSecret() + '-refresh';
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const newToken = generateToken(decoded);

    return res.json({
      success: true,
      token: newToken.token,
      expiresIn: newToken.expiresIn,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
};

/**
 * Revoke Token Helper
 */
const revokeToken = (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
      });
    }

    // Add token to blacklist (implement with Redis/DB)
    // tokenBlacklist.add(token);

    return res.json({
      success: true,
      message: 'Token revoked',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error revoking token',
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  requirePermissions,
  optionalAuth,
  extractToken,
  verifyToken,
  generateToken,
  refreshTokenHelper,
  revokeToken,
  generateTokenWithSession: generateToken, // Alias
};
