# 🗄️ المصادقة - تكامل Database | Authentication Database Integration

## 📋 نماذج قاعدة البيانات

### 1️⃣ مستخدمي النظام (Users Collection/Table)

#### MongoDB Schema

```javascript
// models/User.js
const userSchema = new mongoose.Schema(
  {
    // معرّف فريد
    _id: ObjectId,

    // بيانات أساسية
    firstName: {
      type: String,
      required: true,
      trim: true,
      ar_label: 'الاسم الأول',
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      ar_label: 'الاسم الأخير',
    },

    // طرق الدخول (يجب أن يكون واحد منها على الأقل)
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9_-]{3,20}$/.test(v);
        },
        message: 'اسم المستخدم يجب أن يحتوي على 3-20 حرف أو رقم',
      },
      ar_label: 'اسم المستخدم',
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'بريد إلكتروني غير صحيح',
      },
      ar_label: 'البريد الإلكتروني',
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return /^(?:\+966|0|966)[5][0-9]{8}$/.test(v);
        },
        message: 'رقم جوال سعودي غير صحيح',
      },
      ar_label: 'رقم الجوال',
    },

    idNumber: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: 'رقم الهوية يجب أن يكون 10 أرقام',
      },
      ar_label: 'رقم بطاقة الأحوال',
    },

    // كلمة المرور
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // لا تحمّل كلمة المرور بشكل افتراضي
      ar_label: 'كلمة المرور المشفرة',
    },

    // الأدوار والصلاحيات
    roles: {
      type: [String],
      default: ['user'],
      enum: ['user', 'moderator', 'admin', 'superadmin'],
      ar_label: 'الأدوار',
    },

    // المصادقة الثنائية
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false,
        ar_label: 'مُفعّلة',
      },
      secret: {
        type: String,
        select: false,
        ar_label: 'السر',
      },
      backupCodes: {
        type: [String],
        select: false,
        ar_label: 'رموز الاحتياط',
      },
    },

    // حالة الحساب
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      ar_label: 'الحالة',
    },

    // التحقق من البريد
    emailVerified: {
      type: Boolean,
      default: false,
      ar_label: 'تم التحقق من البريل',
    },

    emailVerificationToken: {
      type: String,
      select: false,
      ar_label: 'رمز التحقق',
    },

    // التحقق من الجوال
    phoneVerified: {
      type: Boolean,
      default: false,
      ar_label: 'تم التحقق من الجوال',
    },

    phoneVerificationCode: {
      type: String,
      select: false,
      ar_label: 'رمز التحقق',
    },

    // استرجاع كلمة المرور
    passwordResetToken: {
      type: String,
      select: false,
      ar_label: 'رمز إعادة التعيين',
    },

    passwordResetExpires: {
      type: Date,
      select: false,
      ar_label: 'انتهاء الرمز',
    },

    // التواريخ
    createdAt: {
      type: Date,
      default: Date.now,
      ar_label: 'تاريخ الإنشاء',
    },

    updatedAt: {
      type: Date,
      default: Date.now,
      ar_label: 'تاريخ التحديث',
    },

    lastLogin: {
      type: Date,
      ar_label: 'آخر دخول',
    },

    // بيانات إضافية
    avatar: {
      type: String,
      default: null,
      ar_label: 'الصورة الشخصية',
    },

    bio: {
      type: String,
      ar_label: 'السيرة الذاتية',
    },

    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
        ar_label: 'المظهر',
      },
      language: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar',
        ar_label: 'اللغة',
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
          ar_label: 'تنبيهات البريل',
        },
        sms: {
          type: Boolean,
          default: true,
          ar_label: 'تنبيهات الجوال',
        },
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  },
);

// Indexes للأداء
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ idNumber: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
```

#### SQL Schema

```sql
-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- البيانات الأساسية
  first_name VARCHAR(100) NOT NULL COMMENT 'الاسم الأول',
  last_name VARCHAR(100) NOT NULL COMMENT 'الاسم الأخير',

  -- طرق الدخول
  username VARCHAR(20) UNIQUE COMMENT 'اسم المستخدم',
  email VARCHAR(255) UNIQUE COMMENT 'البريد الإلكتروني',
  phone VARCHAR(20) UNIQUE COMMENT 'رقم الجوال',
  id_number VARCHAR(10) UNIQUE COMMENT 'رقم الهوية',

  -- الأمان
  password_hash VARCHAR(255) NOT NULL COMMENT 'كلمة المرور المشفرة',

  -- الأدوار
  roles JSON DEFAULT '["user"]' COMMENT 'الأدوار',

  -- المصادقة الثنائية
  two_factor_enabled BOOLEAN DEFAULT FALSE COMMENT 'المصادقة الثنائية',
  two_factor_secret VARCHAR(255) COMMENT 'سر المصادقة',

  -- حالة الحساب
  status ENUM('active', 'inactive', 'suspended', 'deleted') DEFAULT 'active' COMMENT 'الحالة',

  -- التحقق
  email_verified BOOLEAN DEFAULT FALSE COMMENT 'تم التحقق من البريل',
  phone_verified BOOLEAN DEFAULT FALSE COMMENT 'تم التحقق من الجوال',

  -- الإعدادات
  theme ENUM('light', 'dark') DEFAULT 'light' COMMENT 'المظهر',
  language ENUM('ar', 'en') DEFAULT 'ar' COMMENT 'اللغة',

  -- البيانات الإضافية
  avatar_url VARCHAR(500) COMMENT 'الصورة الشخصية',
  bio TEXT COMMENT 'السيرة الذاتية',

  -- التواريخ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'تاريخ الإنشاء',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'تاريخ التحديث',
  last_login TIMESTAMP NULL COMMENT 'آخر دخول',

  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_id_number (id_number),
  INDEX idx_created_at (created_at)
);
```

---

### 2️⃣ جلسات المستخدم (Sessions)

#### MongoDB Schema

```javascript
// models/Session.js
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      ar_label: 'معرّف المستخدم',
    },

    token: {
      type: String,
      required: true,
      unique: true,
      ar_label: 'الرمز',
    },

    refreshToken: {
      type: String,
      unique: true,
      ar_label: 'رمز التحديث',
    },

    expiresAt: {
      type: Date,
      required: true,
      ar_label: 'تاريخ الانتهاء',
    },

    deviceInfo: {
      userAgent: String,
      ip: String,
      deviceName: String,
      osType: String,
      browser: String,
      ar_label: 'معلومات الجهاز',
    },

    isActive: {
      type: Boolean,
      default: true,
      ar_label: 'نشطة',
    },

    createdAt: {
      type: Date,
      default: Date.now,
      ar_label: 'تاريخ الإنشاء',
    },
  },
  { timestamps: true },
);

// حذف الجلسات المنتهية تلقائياً
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
```

#### SQL Schema

```sql
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT 'معرّف المستخدم',
  token VARCHAR(500) UNIQUE NOT NULL COMMENT 'الرمز',
  refresh_token VARCHAR(500) UNIQUE COMMENT 'رمز التحديث',
  expires_at TIMESTAMP NOT NULL COMMENT 'تاريخ الانتهاء',

  -- معلومات الجهاز
  user_agent VARCHAR(500) COMMENT 'بيانات الجهاز',
  ip_address VARCHAR(45) COMMENT 'عنوان IP',
  device_name VARCHAR(100) COMMENT 'اسم الجهاز',

  is_active BOOLEAN DEFAULT TRUE COMMENT 'نشطة',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'تاريخ الإنشاء',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

---

### 3️⃣ سجل الأنشطة (Activity Log)

#### MongoDB Schema

```javascript
// models/ActivityLog.js
const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      ar_label: 'معرّف المستخدم',
    },

    action: {
      type: String,
      enum: [
        'login',
        'logout',
        'register',
        'password_change',
        'password_reset',
        '2fa_enable',
        '2fa_verify',
        'email_verify',
        'phone_verify',
        'profile_update',
        'account_delete',
      ],
      required: true,
      ar_label: 'الإجراء',
    },

    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
      ar_label: 'الحالة',
    },

    details: {
      method: String, // email, phone, username, idNumber
      ip: String,
      userAgent: String,
      deviceName: String,
      location: String,
      ar_label: 'التفاصيل',
    },

    errorMessage: {
      type: String,
      ar_label: 'رسالة الخطأ',
    },

    createdAt: {
      type: Date,
      default: Date.now,
      ar_label: 'التاريخ',
    },
  },
  { timestamps: false },
);

// TTL Index: احذف السجلات بعد سنة واحدة
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
```

#### SQL Schema

```sql
CREATE TABLE activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT 'معرّف المستخدم',
  action VARCHAR(50) NOT NULL COMMENT 'الإجراء',
  status ENUM('success', 'failed', 'pending') DEFAULT 'success' COMMENT 'الحالة',

  -- التفاصيل
  method VARCHAR(20) COMMENT 'طريقة الدخول',
  ip_address VARCHAR(45) COMMENT 'عنوان IP',
  device_name VARCHAR(100) COMMENT 'اسم الجهاز',
  user_agent VARCHAR(500) COMMENT 'بيانات الجهاز',

  error_message TEXT COMMENT 'رسالة الخطأ',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'التاريخ',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

---

## 🔧 دوال الوصول للبيانات

### AuthenticationService مع Database

```javascript
// backend/services/AuthenticationService.js - مع Database

class AuthenticationService {
  // ... (الدوال الموجودة)

  // تسجيل مستخدم جديد مع قاعدة البيانات
  async registerUserInDB(userData) {
    try {
      // 1. التحقق من البيانات
      if (!this.isValidEmail(userData.email)) throw new Error('بريل غير صحيح');
      if (!this.isValidPassword(userData.password)) throw new Error('كلمة مرور ضعيفة');

      // 2. تشفير كلمة المرور
      const hashedPassword = await this.hashPassword(userData.password);

      // 3. إنشاء مستخدم جديد
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: this.normalizeUsername(userData.username),
        email: this.normalizeEmail(userData.email),
        phone: this.normalizePhoneNumber(userData.phone),
        idNumber: this.normalizeIDNumber(userData.idNumber),
        password: hashedPassword,
        roles: ['user'],
        status: 'active',
      });

      // 4. حفظ في قاعدة البيانات
      await user.save();

      // 5. تسجيل النشاط
      await this.logActivity(user._id, 'register', 'success', {
        method: userData.method || 'direct',
      });

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        message: 'تم إنشاء الحساب بنجاح',
      };
    } catch (error) {
      throw new Error(`فشل التسجيل: ${error.message}`);
    }
  }

  // تسجيل الدخول مع قاعدة البيانات
  async loginWithEmailInDB(email, password) {
    try {
      // 1. البحث عن المستخدم
      const user = await User.findOne({ email: this.normalizeEmail(email) }).select('+password');

      if (!user) {
        await this.logActivity(null, 'login', 'failed', { method: 'email' });
        throw new Error('بيانات دخول غير صحيحة');
      }

      // 2. التحقق من كلمة المرور
      const isPasswordValid = await this.comparePassword(password, user.password);

      if (!isPasswordValid) {
        await this.logActivity(user._id, 'login', 'failed', { method: 'email' });
        throw new Error('كلمة مرور غير صحيحة');
      }

      // 3. التحقق من حالة الحساب
      if (user.status !== 'active') {
        throw new Error('الحساب غير نشط');
      }

      // 4. إنشاء JWT Tokens
      const token = this.generateToken({ id: user._id, email: user.email });
      const refreshToken = this.generateRefreshToken({ id: user._id });

      // 5. حفظ الجلسة
      const session = new Session({
        userId: user._id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: { ip: '...', userAgent: '...' },
      });
      await session.save();

      // 6. تحديث آخر دخول
      user.lastLogin = new Date();
      await user.save();

      // 7. تسجيل النشاط
      await this.logActivity(user._id, 'login', 'success', { method: 'email' });

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
        token,
        refreshToken,
        expiresIn: '7d',
      };
    } catch (error) {
      throw new Error(`فشل الدخول: ${error.message}`);
    }
  }

  // تسجيل النشاط
  async logActivity(userId, action, status, details = {}) {
    try {
      const log = new ActivityLog({
        userId,
        action,
        status,
        details,
        createdAt: new Date(),
      });
      await log.save();
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
    }
  }

  // الحصول على سجل النشاط
  async getUserActivityLog(userId, limit = 50) {
    return await ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  // استرجاع كلمة المرور
  async resetPasswordInDB(resetToken, newPassword) {
    try {
      // 1. البحث عن المستخدم
      const user = await User.findOne({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) throw new Error('رمز غير صحيح أو منتهي الصلاحية');

      // 2. تشفير كلمة المرور الجديدة
      const hashedPassword = await this.hashPassword(newPassword);

      // 3. تحديث كلمة المرور
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();

      // 4. تسجيل النشاط
      await this.logActivity(user._id, 'password_reset', 'success');

      return { success: true, message: 'تم تعيين كلمة المرور بنجاح' };
    } catch (error) {
      throw new Error(`فشل إعادة التعيين: ${error.message}`);
    }
  }
}

module.exports = AuthenticationService;
```

---

## 🚀 أمثلة الاستعلامات

### البحث عن مستخدم بطرق مختلفة

```javascript
// البريد الإلكتروني
const user = await User.findOne({ email: 'user@example.com' });

// الجوال
const user = await User.findOne({ phone: '0501234567' });

// الهوية
const user = await User.findOne({ idNumber: '1234567890' });

// اسم المستخدم
const user = await User.findOne({ username: 'user123' });

// أي من الطرق (smart login)
const user = await User.findOne({
  $or: [{ email: credential }, { phone: credential }, { idNumber: credential }, { username: credential }],
});
```

### الإحصائيات والتقارير

```javascript
// عدد المستخدمين الجدد اليوم
const today = new Date().setHours(0, 0, 0, 0);
const newUsersToday = await User.countDocuments({
  createdAt: { $gte: today },
});

// آخر 10 محاولات دخول فاشلة
const failedLogins = await ActivityLog.find({
  action: 'login',
  status: 'failed',
})
  .sort({ createdAt: -1 })
  .limit(10);

// المستخدمون النشطون في آخر 7 أيام
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const activeUsers = await User.countDocuments({
  lastLogin: { $gte: weekAgo },
});

// أكثر الأجهزة المستخدمة
const topDevices = await ActivityLog.aggregate([
  { $group: { _id: '$details.deviceName', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 },
]);
```

---

## 📊 مثال كامل: تكامل Database

```javascript
// backend/services/AuthenticationService.js - نسخة محدثة

const User = require('../models/User');
const Session = require('../models/Session');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthenticationService {
  // تسجيل الدخول الذكي مع Database
  async smartLoginWithDB(credential, password, deviceInfo = {}) {
    try {
      // 1. تحديد نوع البيانات
      const loginMethod = this.detectCredentialType(credential);

      // 2. البحث عن المستخدم حسب النوع
      let user;
      const query = {};

      if (loginMethod === 'email') {
        query.email = this.normalizeEmail(credential);
      } else if (loginMethod === 'phone') {
        query.phone = this.normalizePhoneNumber(credential);
      } else if (loginMethod === 'idNumber') {
        query.idNumber = this.normalizeIDNumber(credential);
      } else {
        query.username = this.normalizeUsername(credential);
      }

      user = await User.findOne(query).select('+password');

      if (!user) {
        await this.logActivity(null, 'login', 'failed', {
          method: loginMethod,
          ip: deviceInfo.ip,
        });
        return {
          success: false,
          message: 'بيانات دخول غير صحيحة',
        };
      }

      // 3. التحقق من كلمة المرور
      const isValid = await this.comparePassword(password, user.password);
      if (!isValid) {
        await this.logActivity(user._id, 'login', 'failed', {
          method: loginMethod,
          ip: deviceInfo.ip,
        });
        return {
          success: false,
          message: 'كلمة مرور غير صحيحة',
        };
      }

      // 4. إنشاء tokens
      const token = this.generateToken({ id: user._id });
      const refreshToken = this.generateRefreshToken({ id: user._id });

      // 5. حفظ الجلسة
      const session = new Session({
        userId: user._id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo,
      });
      await session.save();

      // 6. تحديث آخر دخول
      user.lastLogin = new Date();
      await user.save();

      // 7. تسجيل النشاط
      await this.logActivity(user._id, 'login', 'success', {
        method: loginMethod,
        ip: deviceInfo.ip,
      });

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
        token,
        refreshToken,
        expiresIn: '7d',
      };
    } catch (error) {
      console.error('خطأ في الدخول:', error);
      return {
        success: false,
        message: 'خطأ في النظام',
      };
    }
  }

  // تحديد نوع البيانات
  detectCredentialType(credential) {
    if (this.isValidEmail(credential)) return 'email';
    if (this.isValidPhoneNumber(credential)) return 'phone';
    if (this.isValidIDNumber(credential)) return 'idNumber';
    if (this.isValidUsername(credential)) return 'username';
    return 'unknown';
  }

  // تسجيل النشاط
  async logActivity(userId, action, status, details = {}) {
    try {
      const log = new ActivityLog({
        userId,
        action,
        status,
        details,
        createdAt: new Date(),
      });
      await log.save();
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
    }
  }

  // ... الدوال الأخرى
}

module.exports = new AuthenticationService();
```

---

## ✅ الخلاصة

بهذا التكامل مع قاعدة البيانات:

✅ تخزين آمن للمستخدمين  
✅ إدارة الجلسات  
✅ تسجيل النشاطات  
✅ التقارير والإحصائيات  
✅ الأداء والفعالية  
✅ سهولة الصيانة والتطوير

**جاهز للإنتاج!** 🚀
