// Authentication Service
// خدمة المصادقة والتوثيق

const crypto = require('crypto');

class AuthService {
  // In-memory stores for development
  static otpStore = new Map(); // email -> { code, expiresAt, attempts, lastRequestedAt }
  static resetTokenStore = new Map(); // token -> { email, expiresAt }
  static twoFactorEnabled = new Map(); // userId -> { enabled: true, secret, backupCodes }
  static twoFactorCodes = new Map(); // userId -> { code, expiresAt }
  static pendingLoginSessions = new Map(); // sessionId -> { user }
  static activeSessions = new Map(); // token -> { user, sessionId, issuedAt, expiresAt }
  static revokedTokens = new Set();

  // تسجيل مستخدم جديد
  static registerUser(data) {
    // محاكاة تخزين كلمة المرور (في الإنتاج استخدم bcrypt)
    const hashedPassword = crypto.createHash('sha256').update(data.password).digest('hex');

    const user = {
      id: `USER_${Date.now()}`,
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role || 'user',
      createdAt: new Date().toISOString(),
      status: 'active',
      verified: false,
    };

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: 'User registered successfully',
    };
  }

  // تسجيل الدخول
  static login(credentials) {
    // محاكاة التحقق من بيانات المستخدم
    if (!credentials?.email || !credentials?.password) {
      return { success: false, message: 'Email and password are required' };
    }

    const userId = credentials.userId || `USER_${crypto.createHash('sha1').update(credentials.email).digest('hex').slice(0, 8)}`;
    const user = { 
      id: userId, 
      email: credentials.email, 
      role: credentials.role || 'user'  // Use provided role or default to 'user'
    };

    // If 2FA is enabled for this user, generate a one-time code and require verification
    const tf = this.twoFactorEnabled.get(user.id);
    if (tf?.enabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      this.twoFactorCodes.set(user.id, { code, expiresAt });

      // Create a pending session to finalize after 2FA verification
      const sessionId = `SESS_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
      this.pendingLoginSessions.set(sessionId, { user });

      return {
        success: true,
        requires2fa: true,
        message: '2FA required. Verification code sent.',
        sessionId,
        user,
        // Note: In real system, code would be sent via email/SMS. For dev, we expose it for testing.
        devCode: code,
      };
    }

    // محاكاة JWT token
    const iat = Date.now();
    const exp = iat + 24 * 60 * 60 * 1000; // 24 hours
    const token = Buffer.from(
      JSON.stringify({
        email: credentials.email,
        role: user.role,
        iat,
        exp,
      })
    ).toString('base64');
    const sessionId = `SESS_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    this.activeSessions.set(token, { user, sessionId, issuedAt: iat, expiresAt: exp });

    return {
      success: true,
      token: token,
      user,
      expiresIn: '24h',
      message: 'Login successful',
    };
  }

  // تحديث الملف الشخصي
  static updateProfile(userId, data) {
    return {
      success: true,
      user: {
        id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
        updatedAt: new Date().toISOString(),
      },
      message: 'Profile updated successfully',
    };
  }

  // تغيير كلمة المرور
  static changePassword(userId, oldPassword, newPassword) {
    void userId;
    void oldPassword;
    void newPassword;
    return {
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  // نسيان كلمة المرور
  static forgotPassword(email) {
    const token = `RT_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    this.resetTokenStore.set(token, { email, expiresAt });
    return {
      success: true,
      resetToken: token,
      expiresIn: '1h',
      message: 'Reset email sent successfully',
    };
  }

  // إعادة تعيين كلمة المرور
  static resetPassword(token, newPassword) {
    void newPassword;
    const record = this.resetTokenStore.get(token);
    if (!record) {
      return { success: false, message: 'Invalid reset token' };
    }
    if (record.expiresAt < Date.now()) {
      this.resetTokenStore.delete(token);
      return { success: false, message: 'Reset token expired' };
    }
    // Simulate password update
    this.resetTokenStore.delete(token);
    return {
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date().toISOString(),
    };
  }

  // تسجيل الخروج
  static logout(token) {
    if (token) {
      this.revokedTokens.add(token);
      this.activeSessions.delete(token);
    }
    return {
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    };
  }

  // التحقق من التوكن
  static verifyToken(token) {
    try {
      if (this.revokedTokens.has(token)) {
        return { valid: false, error: 'Token revoked' };
      }
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

      if (decoded.exp < Date.now()) {
        return {
          valid: false,
          error: 'Token expired',
        };
      }

      return {
        valid: true,
        user: {
          email: decoded.email,
        },
      };
    } catch (error) {
      console.warn('verifyToken error:', error);
      return {
        valid: false,
        error: 'Invalid token',
      };
    }
  }

  // تفعيل حساب المستخدم
  static verifyEmail(email, code) {
    const entry = this.otpStore.get(email);
    if (!entry) {
      return { success: false, message: 'No code requested' };
    }
    if (entry.expiresAt < Date.now()) {
      this.otpStore.delete(email);
      return { success: false, message: 'Code expired' };
    }
    if (entry.code !== code) {
      entry.attempts = (entry.attempts || 0) + 1;
      return { success: false, message: 'Invalid code', attempts: entry.attempts };
    }
    this.otpStore.delete(email);
    return {
      success: true,
      message: 'Email verified successfully',
      verified: true,
    };
  }

  // إرسال رمز التحقق
  static sendVerificationCode(email) {
    const now = Date.now();
    const existing = this.otpStore.get(email);
    if (existing && existing.lastRequestedAt && now - existing.lastRequestedAt < 30 * 1000) {
      return { success: false, message: 'Too many requests. Please wait.' };
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes
    this.otpStore.set(email, {
      code,
      expiresAt,
      attempts: 0,
      lastRequestedAt: now,
    });
    return {
      success: true,
      code,
      expiresIn: '10m',
      message: 'Verification code sent',
    };
  }

  // تفعيل المصادقة الثنائية
  static enableTwoFactor(userId) {
    const secret = `SECRET_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const backupCodes = ['BACKUP_001', 'BACKUP_002', 'BACKUP_003'];
    this.twoFactorEnabled.set(userId, { enabled: true, secret, backupCodes });
    return {
      success: true,
      secret,
      qrCode: 'data:image/png;base64,...',
      backupCodes,
      message: '2FA enabled successfully',
    };
  }

  // التحقق من المصادقة الثنائية
  static verifyTwoFactor(userId, code, sessionId) {
    const entry = this.twoFactorCodes.get(userId);
    if (!entry) {
      return { success: false, message: 'No pending 2FA' };
    }
    if (entry.expiresAt < Date.now()) {
      this.twoFactorCodes.delete(userId);
      return { success: false, message: '2FA code expired' };
    }
    if (entry.code !== code) {
      return { success: false, message: 'Invalid 2FA code' };
    }
    this.twoFactorCodes.delete(userId);

    // Finalize login and issue token
    const pending = sessionId ? this.pendingLoginSessions.get(sessionId) : null;
    const user = pending?.user || { id: userId, email: `${userId}@example.com`, role: 'user' };
    if (pending) this.pendingLoginSessions.delete(sessionId);

    const iat = Date.now();
    const exp = iat + 24 * 60 * 60 * 1000;
    const token = Buffer.from(JSON.stringify({ email: user.email, iat, exp })).toString('base64');
    const finalSessionId =
      sessionId || `SESS_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    this.activeSessions.set(token, {
      user,
      sessionId: finalSessionId,
      issuedAt: iat,
      expiresAt: exp,
    });

    return {
      success: true,
      message: '2FA verified successfully',
      token,
      user,
    };
  }

  // الحصول على جلسات المستخدم
  static getUserSessions(userId) {
    const sessions = [];
    for (const [, sess] of this.activeSessions.entries()) {
      if (sess.user?.id === userId) {
        sessions.push({
          id: sess.sessionId,
          device: 'Unknown Device',
          ip: '127.0.0.1',
          lastActivity: new Date().toISOString(),
          createdAt: new Date(sess.issuedAt).toISOString(),
          current: true,
        });
      }
    }
    return { success: true, sessions };
  }

  // إنهاء جلسة
  static terminateSession(userId, sessionId) {
    for (const [token, sess] of this.activeSessions.entries()) {
      if (sess.user?.id === userId && sess.sessionId === sessionId) {
        this.revokedTokens.add(token);
        this.activeSessions.delete(token);
        return { success: true, message: 'Session terminated successfully' };
      }
    }
    return { success: false, message: 'Session not found' };
  }
}

module.exports = AuthService;
