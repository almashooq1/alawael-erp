/**
 * ========================================
 * نظام تسجيل الدخول - API Routes
 * Authentication Routes
 * ========================================
 *
 * API endpoints للمصادقة وإدارة الحسابات
 *
 * Routes:
 * - POST /login - تسجيل الدخول الذكي
 * - POST /login/email - تسجيل الدخول بالبريد
 * - POST /login/phone - تسجيل الدخول برقم الجوال
 * - POST /login/idnumber - تسجيل الدخول برقم الهوية
 * - POST /login/username - تسجيل الدخول باسم المستخدم
 * - POST /register - إنشاء حساب جديد
 * - POST /logout - تسجيل الخروج
 * - POST /refresh-token - تحديث الـ token
 * - POST /password/reset-request - طلب إعادة تعيين
 * - POST /password/reset - إعادة تعيين كلمة المرور
 * - POST /password/change - تغيير كلمة المرور
 * - POST /2fa/enable - تفعيل المصادقة الثنائية
 * - POST /2fa/verify - التحقق من المصادقة الثنائية
 * - GET /profile - الحصول على ملف المستخدم
 */

const express = require('express');
const router = express.Router();
const AuthenticationService = require('../services/AuthenticationService');

/**
 * ====================================
 * 1. تسجيل الدخول الذكي
 * Smart Login (Auto-detect method)
 * ====================================
 */
router.post('/login', async (req, res) => {
  try {
    const { credential, password } = req.body;

    if (!credential || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال بيانات الدخول وكلمة المرور',
        error: 'Missing credentials',
      });
    }

    const result = await AuthenticationService.smartLogin(credential, password);

    // تسجيل نشاط الدخول
    AuthenticationService.logLoginActivity(result.user.id, 'auto-detected', req.ip, req.get('user-agent'));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'فشل تسجيل الدخول',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 2. تسجيل الدخول بالبريد الإلكتروني
 * Login with Email
 * ====================================
 */
router.post('/login/email', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
      });
    }

    const result = await AuthenticationService.loginWithEmail(email, password);

    AuthenticationService.logLoginActivity(result.user.id, 'email', req.ip, req.get('user-agent'));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'فشل تسجيل الدخول بالبريد الإلكتروني',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 3. تسجيل الدخول برقم الجوال
 * Login with Phone Number
 * ====================================
 */
router.post('/login/phone', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال رقم الجوال وكلمة المرور',
      });
    }

    const result = await AuthenticationService.loginWithPhone(phone, password);

    AuthenticationService.logLoginActivity(result.user.id, 'phone', req.ip, req.get('user-agent'));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'فشل تسجيل الدخول برقم الجوال',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 4. تسجيل الدخول برقم بطاقة الأحوال
 * Login with ID Number
 * ====================================
 */
router.post('/login/idnumber', async (req, res) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال رقم بطاقة الأحوال وكلمة المرور',
      });
    }

    const result = await AuthenticationService.loginWithIDNumber(idNumber, password);

    AuthenticationService.logLoginActivity(result.user.id, 'idNumber', req.ip, req.get('user-agent'));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'فشل تسجيل الدخول برقم بطاقة الأحوال',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 5. تسجيل الدخول باسم المستخدم
 * Login with Username
 * ====================================
 */
router.post('/login/username', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال اسم المستخدم وكلمة المرور',
      });
    }

    const result = await AuthenticationService.loginWithUsername(username, password);

    AuthenticationService.logLoginActivity(result.user.id, 'username', req.ip, req.get('user-agent'));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'فشل تسجيل الدخول باسم المستخدم',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 6. إنشاء حساب جديد
 * Register New Account
 * ====================================
 */
router.post('/register', async (req, res) => {
  try {
    const userData = req.body;

    const result = await AuthenticationService.registerUser(userData);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      user: result.user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'فشل إنشاء الحساب',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 7. تسجيل الخروج
 * Logout
 * ====================================
 */
router.post('/logout', (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مفقود',
      });
    }

    const result = AuthenticationService.logout(userId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الخروج',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 8. تحديث الـ Token
 * Refresh Token
 * ====================================
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token مفقود',
      });
    }

    const result = await AuthenticationService.refreshToken(refreshToken);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'فشل تحديث الـ Token',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 9. طلب إعادة تعيين كلمة المرور
 * Request Password Reset
 * ====================================
 */
router.post('/password/reset-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مفقود',
      });
    }

    const result = await AuthenticationService.requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في طلب إعادة التعيين',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 10. إعادة تعيين كلمة المرور
 * Reset Password
 * ====================================
 */
router.post('/password/reset', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة',
      });
    }

    const result = await AuthenticationService.resetPassword(resetToken, newPassword, confirmPassword);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في إعادة تعيين كلمة المرور',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 11. تغيير كلمة المرور
 * Change Password
 * ====================================
 */
router.post('/password/change', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة',
      });
    }

    const result = await AuthenticationService.changePassword(userId, oldPassword, newPassword, confirmPassword);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 12. تفعيل المصادقة الثنائية
 * Enable Two-Factor Authentication
 * ====================================
 */
router.post('/2fa/enable', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مفقود',
      });
    }

    const result = await AuthenticationService.enableTwoFactor(userId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في تفعيل المصادقة الثنائية',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 13. التحقق من المصادقة الثنائية
 * Verify Two-Factor Authentication
 * ====================================
 */
router.post('/2fa/verify', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة',
      });
    }

    const result = await AuthenticationService.verifyTwoFactor(userId, token);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة الثنائية',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 14. التحقق من صحة البيانات
 * Validate Credentials
 * ====================================
 */
router.post('/validate', (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'البيانات مفقودة',
      });
    }

    let validationType = null;
    let isValid = false;

    if (AuthenticationService.isValidEmail(credential)) {
      validationType = 'email';
      isValid = true;
    } else if (AuthenticationService.isValidPhoneNumber(credential)) {
      validationType = 'phone';
      isValid = true;
    } else if (AuthenticationService.isValidIDNumber(credential)) {
      validationType = 'idNumber';
      isValid = true;
    } else if (AuthenticationService.isValidUsername(credential)) {
      validationType = 'username';
      isValid = true;
    }

    return res.status(200).json({
      success: true,
      credential,
      isValid,
      validationType,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق',
      error: error.message,
    });
  }
});

/**
 * ====================================
 * 15. التحقق من قوة كلمة المرور
 * Check Password Strength
 * ====================================
 */
router.post('/password/strength', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور مفقودة',
      });
    }

    const isStrong = AuthenticationService.isValidPasswordStrength(password);
    const strength = isStrong ? 'قوية' : 'ضعيفة';

    return res.status(200).json({
      success: true,
      password: '*'.repeat(password.length),
      isStrong,
      strength,
      requirements: {
        minLength: 'على الأقل 8 أحرف',
        uppercase: 'حرف كبير واحد على الأقل',
        lowercase: 'حرف صغير واحد على الأقل',
        number: 'رقم واحد على الأقل',
        special: 'رمز خاص واحد على الأقل (@$!%*?&)',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق',
      error: error.message,
    });
  }
});

module.exports = router;
