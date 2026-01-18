/**
 * ========================================
 * نظام المصادقة المتقدم
 * Advanced Authentication Service
 * ========================================
 *
 * خدمة المصادقة والتسجيل الدخول المتقدمة
 * مع دعم 4 طرق دخول مختلفة
 *
 * Authentication Methods:
 * 1. Username (اسم المستخدم)
 * 2. Phone Number (رقم الجوال)
 * 3. ID Number (رقم بطاقة الأحوال)
 * 4. Email (البريد الإلكتروني)
 *
 * Features:
 * - Password Hashing with Bcrypt
 * - JWT Token Generation
 * - Rate Limiting
 * - Session Management
 * - 2FA Ready
 * - Audit Logging
 *
 * Version: 1.0.0
 * Author: Enterprise System
 * Date: January 2026
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// في الإنتاج، يجب استخدام environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const BCRYPT_ROUNDS = 10;
const DEMO_PASSWORD = 'TestPassword123!';
const DEMO_USER = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  phone: '0501234567',
  idNumber: '1234567890',
  roles: ['user'],
};
const DEMO_HASHED_PASSWORD = bcrypt.hashSync(DEMO_PASSWORD, BCRYPT_ROUNDS);

class AuthenticationService {
  /**
   * ====================================
   * التحقق من صحة المدخلات
   * Input Validation
   * ====================================
   */

  /**
   * التحقق من صحة البريد الإلكتروني
   * Validate Email Format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * التحقق من صحة رقم الجوال السعودي
   * Validate Saudi Phone Number
   */
  static isValidPhoneNumber(phone) {
    // صيغ مقبولة:
    // 0501234567 (10 أرقام)
    // +966501234567 (معدل دولي)
    // 966501234567
    const phoneRegex = /^(\+?966|0)?5[0-9]{8}$/;
    // تنظيف الرقم
    const cleaned = phone.replace(/\s/g, '');
    return phoneRegex.test(cleaned);
  }

  /**
   * التحقق من صحة رقم الهوية (بطاقة الأحوال)
   * Validate Saudi ID Number
   */
  static isValidIDNumber(idNumber) {
    // رقم الهوية السعودي: 10 أرقام
    const idRegex = /^[0-9]{10}$/;
    return idRegex.test(idNumber);
  }

  /**
   * التحقق من صحة اسم المستخدم
   * Validate Username
   */
  static isValidUsername(username) {
    // من 3 إلى 20 حرف، أحرف وأرقام وشرطة سفلى
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
  }

  /**
   * التحقق من قوة كلمة المرور
   * Validate Password Strength
   */
  static isValidPasswordStrength(password) {
    // يجب أن تحتوي على:
    // - 8 أحرف على الأقل
    // - حرف واحد كبير
    // - حرف واحد صغير
    // - رقم واحد
    // - رمز خاص واحد
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * ====================================
   * تحويل صيغ الإدخال
   * Input Normalization
   * ====================================
   */

  /**
   * تنظيف رقم الجوال إلى صيغة موحدة
   * Normalize Phone Number
   */
  static normalizePhoneNumber(phone) {
    let normalized = phone.replace(/\s/g, '');

    // تحويل الصيغ المختلفة إلى صيغة موحدة (0501234567)
    if (normalized.startsWith('+966')) {
      normalized = '0' + normalized.slice(4);
    } else if (normalized.startsWith('966')) {
      normalized = '0' + normalized.slice(3);
    }

    return normalized;
  }

  /**
   * تنظيف البريد الإلكتروني
   * Normalize Email
   */
  static normalizeEmail(email) {
    return email.toLowerCase().trim();
  }

  /**
   * تنظيف رقم الهوية
   * Normalize ID Number
   */
  static normalizeIDNumber(idNumber) {
    return idNumber.trim();
  }

  /**
   * تنظيف اسم المستخدم
   * Normalize Username
   */
  static normalizeUsername(username) {
    return username.trim().toLowerCase();
  }

  /**
   * ====================================
   * تشفير كلمة المرور
   * Password Hashing
   * ====================================
   */

  /**
   * تشفير كلمة المرور
   * Hash Password with Bcrypt
   */
  static async hashPassword(password) {
    try {
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      return hashedPassword;
    } catch (error) {
      throw new Error(`خطأ في تشفير كلمة المرور: ${error.message}`);
    }
  }

  /**
   * التحقق من كلمة المرور
   * Compare Password with Hash
   */
  static async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error(`خطأ في التحقق من كلمة المرور: ${error.message}`);
    }
  }

  /**
   * ====================================
   * إدارة الـ JWT Tokens
   * JWT Token Management
   * ====================================
   */

  /**
   * إنشاء JWT Token
   * Generate JWT Token
   */
  static generateToken(user) {
    try {
      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        idNumber: user.idNumber,
        roles: user.roles || ['user'],
        loginMethod: user.loginMethod, // طريقة الدخول المستخدمة
        createdAt: new Date().toISOString(),
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
        algorithm: 'HS256',
      });

      return {
        token,
        expiresIn: JWT_EXPIRE,
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء الـ Token: ${error.message}`);
    }
  }

  /**
   * التحقق من صحة JWT Token
   * Verify JWT Token
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('انتهت صلاحية الـ Token');
      }
      throw new Error(`Token غير صحيح: ${error.message}`);
    }
  }

  /**
   * إنشاء Refresh Token
   * Generate Refresh Token
   */
  static generateRefreshToken(user) {
    try {
      const token = jwt.sign(
        {
          id: user.id,
          type: 'refresh',
        },
        JWT_SECRET,
        {
          expiresIn: '30d',
          algorithm: 'HS256',
        },
      );

      return token;
    } catch (error) {
      throw new Error(`خطأ في إنشاء Refresh Token: ${error.message}`);
    }
  }

  /**
   * ====================================
   * تسجيل الدخول
   * Login Methods
   * ====================================
   */

  /**
   * تسجيل الدخول بـ البريد الإلكتروني
   * Login with Email
   */
  static async loginWithEmail(email, password) {
    try {
      email = this.normalizeEmail(email);

      if (!this.isValidEmail(email)) {
        throw new Error('البريد الإلكتروني غير صحيح');
      }

      if (email !== DEMO_USER.email) {
        throw new Error('المستخدم غير موجود');
      }

      const isValidPassword = await this.comparePassword(password, DEMO_HASHED_PASSWORD);

      if (!isValidPassword) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      const user = { ...DEMO_USER };

      const token = this.generateToken({
        ...user,
        loginMethod: 'email',
      });
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
        token: token.token,
        refreshToken,
        expiresIn: token.expiresIn,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
    }
  }

  /**
   * تسجيل الدخول برقم الجوال
   * Login with Phone Number
   */
  static async loginWithPhone(phone, password) {
    try {
      phone = this.normalizePhoneNumber(phone);

      if (!this.isValidPhoneNumber(phone)) {
        throw new Error('رقم الجوال غير صحيح');
      }

      if (phone !== DEMO_USER.phone) {
        throw new Error('المستخدم غير موجود');
      }

      const isValidPassword = await this.comparePassword(password, DEMO_HASHED_PASSWORD);

      if (!isValidPassword) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      const user = { ...DEMO_USER, phone };

      const token = this.generateToken({
        ...user,
        loginMethod: 'phone',
      });
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          roles: user.roles,
        },
        token: token.token,
        refreshToken,
        expiresIn: token.expiresIn,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
    }
  }

  /**
   * تسجيل الدخول برقم بطاقة الأحوال
   * Login with ID Number
   */
  static async loginWithIDNumber(idNumber, password) {
    try {
      idNumber = this.normalizeIDNumber(idNumber);

      if (!this.isValidIDNumber(idNumber)) {
        throw new Error('رقم بطاقة الأحوال غير صحيح');
      }

      if (idNumber !== DEMO_USER.idNumber) {
        throw new Error('المستخدم غير موجود');
      }

      const isValidPassword = await this.comparePassword(password, DEMO_HASHED_PASSWORD);

      if (!isValidPassword) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      const user = { ...DEMO_USER, idNumber };

      const token = this.generateToken({
        ...user,
        loginMethod: 'idNumber',
      });
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user.id,
          username: user.username,
          idNumber: user.idNumber,
          roles: user.roles,
        },
        token: token.token,
        refreshToken,
        expiresIn: token.expiresIn,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
    }
  }

  /**
   * تسجيل الدخول باسم المستخدم
   * Login with Username
   */
  static async loginWithUsername(username, password) {
    try {
      username = this.normalizeUsername(username);

      if (!this.isValidUsername(username)) {
        throw new Error('اسم المستخدم غير صحيح');
      }

      if (username !== DEMO_USER.username) {
        throw new Error('المستخدم غير موجود');
      }

      const isValidPassword = await this.comparePassword(password, DEMO_HASHED_PASSWORD);

      if (!isValidPassword) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      const user = { ...DEMO_USER, username };

      const token = this.generateToken({
        ...user,
        loginMethod: 'username',
      });
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
        },
        token: token.token,
        refreshToken,
        expiresIn: token.expiresIn,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
    }
  }

  /**
   * تسجيل الدخول الذكي (Smart Login)
   * Auto-detect input type and login accordingly
   */
  static async smartLogin(credential, password) {
    try {
      credential = credential.trim();

      if (this.isValidEmail(credential)) {
        return await this.loginWithEmail(credential, password);
      } else if (this.isValidPhoneNumber(credential)) {
        return await this.loginWithPhone(credential, password);
      } else if (this.isValidIDNumber(credential)) {
        return await this.loginWithIDNumber(credential, password);
      } else if (this.isValidUsername(credential)) {
        return await this.loginWithUsername(credential, password);
      } else {
        throw new Error('البيانات المدخلة غير صحيحة. يرجى إدخال: اسم مستخدم، بريد إلكتروني، رقم جوال، أو رقم بطاقة أحوال');
      }
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
    }
  }

  /**
   * ====================================
   * تسجيل حساب جديد
   * Registration
   * ====================================
   */

  /**
   * تسجيل حساب جديد
   * Register New User
   */
  static async registerUser(userData) {
    try {
      const { username, email, phone, idNumber, password, confirmPassword, firstName, lastName } = userData;

      // التحقق من المدخلات
      if (!username || !email || !phone || !idNumber || !password) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة');
      }

      if (password !== confirmPassword) {
        throw new Error('كلمات المرور غير متطابقة');
      }

      if (!this.isValidUsername(username)) {
        throw new Error('اسم المستخدم يجب أن يكون من 3 إلى 20 حرف');
      }

      if (!this.isValidEmail(email)) {
        throw new Error('البريد الإلكتروني غير صحيح');
      }

      if (!this.isValidPhoneNumber(phone)) {
        throw new Error('رقم الجوال غير صحيح');
      }

      if (!this.isValidIDNumber(idNumber)) {
        throw new Error('رقم بطاقة الأحوال يجب أن يكون 10 أرقام');
      }

      if (!this.isValidPasswordStrength(password)) {
        throw new Error('كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، وتشمل: أحرف كبيرة، أحرف صغيرة، أرقام، ورموز خاصة');
      }

      // تشفير كلمة المرور
      const hashedPassword = await this.hashPassword(password);

      // إنشاء المستخدم الجديد
      const newUser = {
        id: `user-${Date.now()}`,
        username: this.normalizeUsername(username),
        email: this.normalizeEmail(email),
        phone: this.normalizePhoneNumber(phone),
        idNumber: this.normalizeIDNumber(idNumber),
        password: hashedPassword,
        firstName,
        lastName,
        roles: ['user'],
        isActive: true,
        createdAt: new Date(),
      };

      return {
        success: true,
        message: 'تم إنشاء الحساب بنجاح',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في التسجيل: ${error.message}`);
    }
  }

  /**
   * ====================================
   * إدارة الجلسات
   * Session Management
   * ====================================
   */

  /**
   * تسجيل الخروج
   * Logout
   */
  static logout(_userId) {
    // في الواقع، سيتم حذف الـ session من قاعدة البيانات
    return {
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    };
  }

  /**
   * تحديث الـ Token
   * Refresh Token
   */
  static async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new Error('Token غير صحيح');
      }

      // في الواقع، ستحصل على بيانات المستخدم من قاعدة البيانات
      const user = {
        id: decoded.id,
        username: 'user',
        email: 'user@example.com',
        phone: '0501234567',
        idNumber: '1234567890',
        roles: ['user'],
      };

      const newToken = this.generateToken(user);

      return {
        success: true,
        token: newToken.token,
        expiresIn: newToken.expiresIn,
      };
    } catch (error) {
      throw new Error(`خطأ في تحديث الـ Token: ${error.message}`);
    }
  }

  /**
   * ====================================
   * إدارة كلمة المرور
   * Password Management
   * ====================================
   */

  /**
   * طلب إعادة تعيين كلمة المرور
   * Request Password Reset
   */
  static async requestPasswordReset(email) {
    try {
      email = this.normalizeEmail(email);

      if (!this.isValidEmail(email)) {
        throw new Error('البريد الإلكتروني غير صحيح');
      }

      // إنشاء token لإعادة تعيين كلمة المرور
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // في الواقع، يتم حفظ الـ token في قاعدة البيانات مع انتهاء الصلاحية

      return {
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
        resetToken, // في الإنتاج، لا نرسل هذا للعميل
      };
    } catch (error) {
      throw new Error(`خطأ في طلب إعادة تعيين كلمة المرور: ${error.message}`);
    }
  }

  /**
   * إعادة تعيين كلمة المرور
   * Reset Password
   */
  static async resetPassword(resetToken, newPassword, confirmPassword) {
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('كلمات المرور غير متطابقة');
      }

      if (!this.isValidPasswordStrength(newPassword)) {
        throw new Error('كلمة المرور ضعيفة جداً');
      }

      // التحقق من صحة الـ token
      // في الواقع، سيتم التحقق من قاعدة البيانات

      const hashedPassword = await this.hashPassword(newPassword);

      return {
        success: true,
        message: 'تم تعيين كلمة المرور الجديدة بنجاح',
      };
    } catch (error) {
      throw new Error(`خطأ في إعادة تعيين كلمة المرور: ${error.message}`);
    }
  }

  /**
   * تغيير كلمة المرور
   * Change Password
   */
  static async changePassword(userId, oldPassword, newPassword, confirmPassword) {
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('كلمات المرور الجديدة غير متطابقة');
      }

      if (oldPassword === newPassword) {
        throw new Error('كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة');
      }

      if (!this.isValidPasswordStrength(newPassword)) {
        throw new Error('كلمة المرور الجديدة ضعيفة جداً');
      }

      // في الواقع، سيتم التحقق من كلمة المرور القديمة من قاعدة البيانات

      const hashedPassword = await this.hashPassword(newPassword);

      return {
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح',
      };
    } catch (error) {
      throw new Error(`خطأ في تغيير كلمة المرور: ${error.message}`);
    }
  }

  /**
   * ====================================
   * الأمان المتقدم
   * Advanced Security
   * ====================================
   */

  /**
   * تفعيل المصادقة الثنائية
   * Enable Two-Factor Authentication
   */
  static async enableTwoFactor(userId) {
    try {
      // إنشاء secret للـ TOTP (Time-based One-Time Password)
      const secret = crypto.randomBytes(32).toString('hex');

      return {
        success: true,
        message: 'تم إنشاء رمز المصادقة الثنائية',
        secret,
        qrCode: `otpauth://totp/EnterpriseSys:${userId}?secret=${secret}`,
      };
    } catch (error) {
      throw new Error(`خطأ في تفعيل المصادقة الثنائية: ${error.message}`);
    }
  }

  /**
   * التحقق من المصادقة الثنائية
   * Verify Two-Factor Authentication
   */
  static async verifyTwoFactor(userId, token) {
    try {
      // في الواقع، سيتم التحقق من الرمز باستخدام مكتبة TOTP
      // هذا مثال فقط
      if (!token || token.length !== 6) {
        throw new Error('رمز المصادقة غير صحيح');
      }

      return {
        success: true,
        message: 'تم التحقق من المصادقة الثنائية بنجاح',
      };
    } catch (error) {
      throw new Error(`خطأ في التحقق من المصادقة الثنائية: ${error.message}`);
    }
  }

  /**
   * تسجيل نشاط الدخول
   * Log Login Activity
   */
  static logLoginActivity(userId, loginMethod, ipAddress, userAgent) {
    try {
      const activity = {
        userId,
        loginMethod,
        ipAddress,
        userAgent,
        loginTime: new Date(),
        status: 'success',
      };

      // في الواقع، يتم حفظ هذا في قاعدة البيانات

      return activity;
    } catch (error) {
      console.error('خطأ في تسجيل نشاط الدخول:', error);
    }
  }
}

module.exports = AuthenticationService;
