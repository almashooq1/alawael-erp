// Authentication Routes
// نقاط المصادقة والتوثيق

const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

// تسجيل مستخدم جديد
router.post('/register', validateRegistration, (req, res, _next) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    if (password !== passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        data: {},
      });
    }

    const result = AuthService.registerUser({ name, email, password });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      data: { user: result.user },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

// تسجيل الدخول
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const User = require('../models/User');

    // Check if user exists in database
    let dbUser = null;
    try {
      dbUser = await User.findOne({ email }).select('+password');
    } catch (e) {
      // User model might not be available in all environments
      console.debug('Could not check database user:', e.message);
    }

    // If user exists in DB, include their actual role in the token
    let loginPayload = { email, password };
    if (dbUser) {
      loginPayload.role = dbUser.role;
      loginPayload.userId = dbUser._id?.toString();
    }

    const result = AuthService.login(loginPayload);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message || 'Invalid credentials',
        data: {},
      });
    }

    // If 2FA is required, return sessionId and do not issue token yet
    if (result.requires2fa) {
      return res.status(200).json({
        success: true,
        message: result.message || '2FA required',
        requires2fa: true,
        sessionId: result.sessionId,
        user: result.user,
        // Expose devCode only for development/testing
        devCode: result.devCode,
        data: { user: result.user, requires2fa: true, sessionId: result.sessionId },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken: result.token,
      user: result.user,
      data: { user: result.user, token: result.token },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

// تسجيل الخروج
router.post('/logout', (req, res, _next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required', data: {} });
    }

    const result = AuthService.logout(token);

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: result || {},
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Logout failed', error: error.message });
  }
});

// التحقق من رمز التحقق
router.post('/verify-token', (req, res, _next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required', data: {} });
    }

    const result = AuthService.verifyToken(token);

    if (!result?.valid) {
      return res
        .status(401)
        .json({ success: false, message: result?.error || 'Invalid token', data: {} });
    }

    return res.status(200).json({
      success: true,
      message: 'Token verified',
      user: result.user,
      data: { user: result.user, tokenValid: true },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Token verification failed', error: error.message });
  }
});

// إرسال كود التحقق من البريد الإلكتروني
router.post('/send-verification-code', (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(new ApiResponse(400, {}, 'Email required'));
    }

    const result = AuthService.sendVerificationCode(email);

    return res.status(200).json(new ApiResponse(200, result, 'Verification code sent'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to send verification code', [error.message]));
  }
});

// التحقق من البريد الإلكتروني
router.post('/verify-email', (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json(new ApiResponse(400, {}, 'Email and code required'));
    }

    const result = AuthService.verifyEmail(email, code);

    return res.status(200).json(new ApiResponse(200, result, 'Email verified'));
  } catch (error) {
    return next(new ApiError(500, 'Email verification failed', [error.message]));
  }
});

// نسيان كلمة المرور
router.post('/forgot-password', (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(new ApiResponse(400, {}, 'Email required'));
    }

    const result = AuthService.forgotPassword(email);

    return res.status(200).json(new ApiResponse(200, result, 'Recovery email sent'));
  } catch (error) {
    return next(new ApiError(500, 'Password recovery failed', [error.message]));
  }
});

// إعادة تعيين كلمة المرور
router.post('/reset-password', (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json(new ApiResponse(400, {}, 'Token and new password required'));
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(new ApiResponse(400, {}, 'Passwords do not match'));
    }

    const result = AuthService.resetPassword(token, newPassword);

    return res.status(200).json(new ApiResponse(200, result, 'Password reset successfully'));
  } catch (error) {
    return next(new ApiError(500, 'Password reset failed', [error.message]));
  }
});

// تغيير كلمة المرور
router.post('/change-password', (req, res, next) => {
  try {
    const { userId, oldPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json(new ApiResponse(400, {}, 'Missing required fields'));
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(new ApiResponse(400, {}, 'Passwords do not match'));
    }

    const result = AuthService.changePassword(userId, oldPassword, newPassword);

    return res.status(200).json(new ApiResponse(200, result, 'Password changed successfully'));
  } catch (error) {
    return next(new ApiError(500, 'Password change failed', [error.message]));
  }
});

// تفعيل المصادقة الثنائية
router.post('/enable-2fa', (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json(new ApiResponse(400, {}, 'User ID required'));
    }

    const result = AuthService.enableTwoFactor(userId);

    return res.status(200).json(new ApiResponse(200, result, '2FA enabled'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to enable 2FA', [error.message]));
  }
});

// التحقق من المصادقة الثنائية
router.post('/verify-2fa', (req, res, next) => {
  try {
    const { userId, code, sessionId } = req.body;

    if (!userId || !code) {
      return res.status(400).json(new ApiResponse(400, {}, 'User ID and code required'));
    }

    const result = AuthService.verifyTwoFactor(userId, code, sessionId);

    return res.status(200).json(new ApiResponse(200, result, '2FA verified'));
  } catch (error) {
    return next(new ApiError(500, '2FA verification failed', [error.message]));
  }
});

// تحديث الملف الشخصي
router.put('/update-profile', (req, res, next) => {
  try {
    const { userId, ...data } = req.body;

    if (!userId) {
      return res.status(400).json(new ApiResponse(400, {}, 'User ID required'));
    }

    const result = AuthService.updateProfile(userId, data);

    return res.status(200).json(new ApiResponse(200, result, 'Profile updated'));
  } catch (error) {
    return next(new ApiError(500, 'Profile update failed', [error.message]));
  }
});

// الحصول على جلسات المستخدم
router.get('/sessions/:userId', (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = AuthService.getUserSessions(userId);

    return res.status(200).json(new ApiResponse(200, result, 'Sessions fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch sessions', [error.message]));
  }
});

// إنهاء جلسة
router.delete('/sessions/:userId/:sessionId', (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;

    const result = AuthService.terminateSession(userId, sessionId);

    return res.status(200).json(new ApiResponse(200, result, 'Session terminated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to terminate session', [error.message]));
  }
});

// الحصول على معلومات المستخدم الحالي
router.get('/me', (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided', data: {} });
    }

    const result = AuthService.verifyToken(token);

    if (!result.success) {
      return res.status(401).json({ success: false, message: 'Invalid token', data: {} });
    }

    return res.status(200).json({
      success: true,
      message: 'User info fetched',
      user: result.user,
      data: { user: result.user },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch user info', error: error.message });
  }
});

module.exports = router;
