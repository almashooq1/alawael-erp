# 🔐 Security Best Practices - نظام الموارد البشرية السعودي

**التاريخ:** 14 يناير 2026  
**الإصدار:** v1.0.0  
**مستوى الأمان:** Enterprise Grade

---

## 📋 جدول المحتويات

1. [المصادقة والترخيص](#المصادقة-والترخيص)
2. [حماية البيانات](#حماية-البيانات)
3. [أمان API](#أمان-api)
4. [أمان قاعدة البيانات](#أمان-قاعدة-البيانات)
5. [المراقبة والتسجيل](#المراقبة-والتسجيل)
6. [الامتثال القانوني](#الامتثال-القانوني)

---

## 🔑 المصادقة والترخيص

### JWT Authentication

```javascript
// إعدادات JWT
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  algorithm: 'HS256',
  issuer: 'hr-system',
  audience: 'hr-api',
};

// توليد Token
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    },
  );
}

// التحقق من Token
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Refresh Token
function generateRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}
```

### Role-Based Access Control (RBAC)

```javascript
// تعريف الأدوار
const roles = {
  SUPER_ADMIN: {
    name: 'super_admin',
    level: 10,
    permissions: ['*'], // جميع الصلاحيات
  },
  HR_MANAGER: {
    name: 'hr_manager',
    level: 8,
    permissions: ['employees:*', 'payroll:read', 'payroll:create', 'payroll:update', 'leaves:*', 'insurance:*', 'reports:*'],
  },
  FINANCE_MANAGER: {
    name: 'finance_manager',
    level: 8,
    permissions: ['employees:read', 'payroll:*', 'reports:read', 'gosi:*'],
  },
  MANAGER: {
    name: 'manager',
    level: 5,
    permissions: ['employees:read', 'leaves:approve', 'performance:*', 'reports:read'],
  },
  EMPLOYEE: {
    name: 'employee',
    level: 1,
    permissions: [
      'employees:read:self',
      'payroll:read:self',
      'leaves:create',
      'leaves:read:self',
      'insurance:read:self',
      'performance:read:self',
    ],
  },
};

// Middleware للتحقق من الصلاحيات
function authorize(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const userRole = roles[user.role];

      // Super Admin لديه جميع الصلاحيات
      if (userRole.permissions.includes('*')) {
        return next();
      }

      // التحقق من الصلاحيات المطلوبة
      const hasPermission = requiredPermissions.every(permission => {
        return userRole.permissions.some(userPerm => {
          // دعم الأنماط مثل 'employees:*'
          const regex = new RegExp('^' + userPerm.replace('*', '.*') + '$');
          return regex.test(permission);
        });
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'ليس لديك صلاحيات كافية',
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// مثال على الاستخدام
router.post('/employees', authenticate, authorize('employees:create'), createEmployee);

router.get('/employees/:id/payroll', authenticate, authorize('payroll:read'), checkResourceOwnership, getEmployeePayroll);
```

### Multi-Factor Authentication (MFA)

```javascript
// إعداد MFA
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// توليد Secret للمستخدم
async function setupMFA(userId) {
  const secret = speakeasy.generateSecret({
    name: `HR System (${userId})`,
    issuer: 'Company Name',
  });

  // حفظ السر في قاعدة البيانات
  await User.findByIdAndUpdate(userId, {
    'security.mfa.secret': secret.base32,
    'security.mfa.enabled': false, // سيتم التفعيل بعد التحقق
  });

  // توليد QR Code
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  };
}

// التحقق من رمز MFA
function verifyMFA(secret, token) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2, // السماح بـ 2 نوافذ زمنية (60 ثانية)
  });
}

// Middleware للتحقق من MFA
async function requireMFA(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user.security.mfa.enabled) {
      return next();
    }

    const mfaToken = req.headers['x-mfa-token'];

    if (!mfaToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MFA_REQUIRED',
          message: 'يتطلب رمز التحقق الثنائي',
        },
      });
    }

    const isValid = verifyMFA(user.security.mfa.secret, mfaToken);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_MFA_TOKEN',
          message: 'رمز التحقق غير صحيح',
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
```

---

## 🛡️ حماية البيانات

### تشفير البيانات الحساسة

```javascript
const crypto = require('crypto');

// إعدادات التشفير
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

// تشفير البيانات
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

// فك التشفير
function decrypt(encryptedData) {
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(encryptedData.iv, 'hex'));

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// استخدام مع Mongoose
const employeeSchema = new mongoose.Schema({
  personal: {
    idNumber: {
      type: String,
      required: true,
      set: function (value) {
        // تشفير رقم الهوية
        const encrypted = encrypt(value);
        this._idNumberIv = encrypted.iv;
        this._idNumberAuthTag = encrypted.authTag;
        return encrypted.encrypted;
      },
      get: function (value) {
        // فك التشفير عند القراءة
        if (!value) return value;
        return decrypt({
          encrypted: value,
          iv: this._idNumberIv,
          authTag: this._idNumberAuthTag,
        });
      },
    },
    _idNumberIv: String,
    _idNumberAuthTag: String,
  },
});

// تفعيل getters
employeeSchema.set('toJSON', { getters: true });
employeeSchema.set('toObject', { getters: true });
```

### Hash كلمات المرور

```javascript
const bcrypt = require('bcryptjs');

// Hash كلمة المرور
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12); // 12 rounds
  return await bcrypt.hash(password, salt);
}

// التحقق من كلمة المرور
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// سياسة كلمات المرور القوية
function validatePassword(password) {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`كلمة المرور يجب أن تكون ${minLength} حرف على الأقل`);
  }
  if (!hasUpperCase) {
    errors.push('يجب أن تحتوي على حرف كبير');
  }
  if (!hasLowerCase) {
    errors.push('يجب أن تحتوي على حرف صغير');
  }
  if (!hasNumbers) {
    errors.push('يجب أن تحتوي على رقم');
  }
  if (!hasSpecialChar) {
    errors.push('يجب أن تحتوي على رمز خاص');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

// تطبيق على User Schema
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const validation = validatePassword(this.password);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  this.password = await hashPassword(this.password);
  next();
});
```

### Data Masking

```javascript
// إخفاء البيانات الحساسة في الـ Response
function maskSensitiveData(data, userRole) {
  const masked = { ...data };

  // إخفاء البيانات حسب الدور
  if (userRole !== 'HR_MANAGER' && userRole !== 'SUPER_ADMIN') {
    // إخفاء رقم الهوية
    if (masked.personal?.idNumber) {
      masked.personal.idNumber = masked.personal.idNumber.replace(/(\d{7})\d{3}/, '$1***');
    }

    // إخفاء رقم الحساب البنكي
    if (masked.banking?.accountNumber) {
      masked.banking.accountNumber = '****' + masked.banking.accountNumber.slice(-4);
    }

    // إخفاء رقم الآيبان
    if (masked.banking?.iban) {
      masked.banking.iban = 'SA****' + masked.banking.iban.slice(-4);
    }
  }

  // إخفاء الراتب عن الموظفين الآخرين
  if (userRole === 'EMPLOYEE' && data._id.toString() !== req.user.id) {
    delete masked.employment.baseSalary;
    delete masked.payroll;
  }

  return masked;
}

// Middleware لإخفاء البيانات
function maskResponse(req, res, next) {
  const originalJson = res.json;

  res.json = function (data) {
    if (data && typeof data === 'object') {
      data = maskSensitiveData(data, req.user.role);
    }

    return originalJson.call(this, data);
  };

  next();
}
```

---

## 🔒 أمان API

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Rate Limiter للطلبات العادية
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 1000, // 1000 طلب كحد أقصى
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter للعمليات الحساسة
const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:strict:',
  }),
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 10, // 10 محاولات فقط
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'تم تجاوز عدد المحاولات المسموح به',
    },
  },
});

// تطبيق Rate Limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/employees/*/terminate', strictLimiter);
app.use('/api/payroll/*/approve', strictLimiter);
```

### Input Validation & Sanitization

```javascript
const { body, param, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// تطبيق Sanitization على جميع الطلبات
app.use(mongoSanitize());
app.use(xss());

// Validation Middleware
function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'فشل التحقق من البيانات',
          errors: errors.array(),
        },
      });
    }

    next();
  };
}

// مثال على الاستخدام
router.post(
  '/employees',
  validate([
    body('personal.arabicName')
      .trim()
      .notEmpty()
      .withMessage('الاسم مطلوب')
      .isLength({ min: 3, max: 100 })
      .withMessage('الاسم يجب أن يكون بين 3 و 100 حرف')
      .matches(/^[\u0600-\u06FF\s]+$/)
      .withMessage('يجب أن يحتوي على أحرف عربية فقط'),

    body('personal.email')
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage('البريد الإلكتروني غير صحيح')
      .custom(async value => {
        const exists = await Employee.findOne({ 'personal.email': value });
        if (exists) {
          throw new Error('البريد الإلكتروني مستخدم بالفعل');
        }
      }),

    body('personal.idNumber')
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('رقم الهوية يجب أن يكون 10 أرقام'),

    body('employment.baseSalary').isFloat({ min: 3000 }).withMessage('الراتب يجب ألا يقل عن 3000 ريال'),
  ]),
  createEmployee,
);
```

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      'https://hr.company.com',
      'https://admin.company.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
    ].filter(Boolean);

    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('غير مسموح من CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-MFA-Token', 'X-Request-ID'],
};

app.use(cors(corsOptions));
```

### HTTPS & Security Headers

```javascript
const helmet = require('helmet');
const hpp = require('hpp');

// تفعيل Helmet لجميع Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }),
);

// حماية من HTTP Parameter Pollution
app.use(hpp());

// فرض HTTPS في Production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

---

## 🗄️ أمان قاعدة البيانات

### MongoDB Security Configuration

```javascript
// Connection String الآمن
const mongoUri = `mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin&ssl=true&replicaSet=hrReplicaSet`;

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,

  // SSL/TLS
  ssl: true,
  sslValidate: true,
  sslCA: fs.readFileSync('/path/to/ca.pem'),

  // Authentication
  auth: {
    username: DB_USER,
    password: DB_PASS,
  },
  authSource: 'admin',

  // Connection Pool
  maxPoolSize: 50,
  minPoolSize: 10,

  // Retry
  retryWrites: true,
  retryReads: true,
};

mongoose.connect(mongoUri, mongoOptions);
```

### Database User Roles

```javascript
// إنشاء مستخدم للتطبيق
db.createUser({
  user: 'hrAppUser',
  pwd: passwordPrompt(),
  roles: [
    {
      role: 'readWrite',
      db: 'hr_database',
    },
  ],
});

// إنشاء مستخدم للقراءة فقط (للتقارير)
db.createUser({
  user: 'hrReportUser',
  pwd: passwordPrompt(),
  roles: [
    {
      role: 'read',
      db: 'hr_database',
    },
  ],
});

// إنشاء مستخدم للنسخ الاحتياطي
db.createUser({
  user: 'hrBackupUser',
  pwd: passwordPrompt(),
  roles: [
    {
      role: 'backup',
      db: 'admin',
    },
    {
      role: 'restore',
      db: 'admin',
    },
  ],
});
```

### Query Sanitization

```javascript
// منع NoSQL Injection
function sanitizeQuery(query) {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized = {};

  for (const key in query) {
    // منع المفاتيح الخطيرة
    if (key.startsWith('$')) {
      continue;
    }

    const value = query[key];

    // تنظيف القيم بشكل متكرر
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Middleware للتنظيف التلقائي
app.use((req, res, next) => {
  req.body = sanitizeQuery(req.body);
  req.query = sanitizeQuery(req.query);
  req.params = sanitizeQuery(req.params);
  next();
});
```

---

## 📊 المراقبة والتسجيل

### Audit Logging

```javascript
const auditLogSchema = new mongoose.Schema({
  // من قام بالعملية
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    email: String,
    role: String,
    ip: String,
    userAgent: String,
  },

  // نوع العملية
  action: {
    type: String,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT'],
    required: true,
    index: true,
  },

  // المورد المتأثر
  resource: {
    type: {
      type: String,
      enum: ['employee', 'payroll', 'leave', 'insurance', 'performance', 'user', 'system'],
      required: true,
      index: true,
    },
    id: mongoose.Schema.Types.ObjectId,
    identifier: String, // رقم الموظف، رقم المطالبة، إلخ
  },

  // التفاصيل
  details: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    changes: [String],
    reason: String,
  },

  // النتيجة
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true,
  },
  error: String,

  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  requestId: String,
  duration: Number, // بالميلي ثانية
});

// Middleware لتسجيل جميع العمليات
async function auditLog(req, res, next) {
  const startTime = Date.now();

  // حفظ الـ response الأصلي
  const originalJson = res.json;

  res.json = function (data) {
    const duration = Date.now() - startTime;

    // تسجيل العملية
    AuditLog.create({
      user: {
        id: req.user?._id,
        email: req.user?.email,
        role: req.user?.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
      action:
        req.method === 'POST'
          ? 'CREATE'
          : req.method === 'PUT' || req.method === 'PATCH'
            ? 'UPDATE'
            : req.method === 'DELETE'
              ? 'DELETE'
              : 'READ',
      resource: {
        type: req.baseUrl.split('/')[2], // استخراج نوع المورد من URL
        id: req.params.id,
      },
      status: res.statusCode < 400 ? 'success' : 'failure',
      timestamp: new Date(),
      requestId: req.id,
      duration: duration,
    }).catch(err => console.error('Audit log error:', err));

    return originalJson.call(this, data);
  };

  next();
}

app.use(auditLog);
```

### Security Monitoring

```javascript
// مراقبة المحاولات المشبوهة
class SecurityMonitor {
  constructor() {
    this.suspiciousActivity = new Map();
  }

  // تتبع محاولات تسجيل الدخول الفاشلة
  trackFailedLogin(ip, userId) {
    const key = `login:${ip}:${userId}`;
    const attempts = this.suspiciousActivity.get(key) || [];
    attempts.push(Date.now());

    // الاحتفاظ بآخر 10 محاولات فقط
    if (attempts.length > 10) {
      attempts.shift();
    }

    this.suspiciousActivity.set(key, attempts);

    // إذا كان هناك 5 محاولات فاشلة في 15 دقيقة
    const recentAttempts = attempts.filter(time => Date.now() - time < 15 * 60 * 1000);

    if (recentAttempts.length >= 5) {
      this.alert('BRUTE_FORCE_ATTEMPT', { ip, userId, attempts: recentAttempts.length });

      // حظر الـ IP لمدة ساعة
      this.blockIP(ip, 60 * 60 * 1000);
    }
  }

  // تتبع الوصول غير المصرح به
  trackUnauthorizedAccess(req) {
    const key = `unauthorized:${req.ip}`;
    const attempts = this.suspiciousActivity.get(key) || [];
    attempts.push({
      timestamp: Date.now(),
      path: req.path,
      userId: req.user?.id,
    });

    this.suspiciousActivity.set(key, attempts);

    if (attempts.length >= 10) {
      this.alert('UNAUTHORIZED_ACCESS_PATTERN', {
        ip: req.ip,
        userId: req.user?.id,
        paths: attempts.map(a => a.path),
      });
    }
  }

  // إرسال تنبيه
  async alert(type, data) {
    console.error(`[SECURITY ALERT] ${type}:`, data);

    // إرسال إلى نظام المراقبة
    await axios.post(process.env.SECURITY_WEBHOOK, {
      type,
      data,
      timestamp: new Date(),
      severity: 'HIGH',
    });

    // إرسال بريد إلكتروني للمسؤولين
    await sendSecurityEmail({
      subject: `تنبيه أمني: ${type}`,
      body: JSON.stringify(data, null, 2),
    });
  }

  // حظر IP
  blockIP(ip, duration) {
    redisClient.setex(`blocked:${ip}`, duration / 1000, '1');
  }

  // التحقق من IP المحظور
  async isBlocked(ip) {
    return await redisClient.exists(`blocked:${ip}`);
  }
}

const securityMonitor = new SecurityMonitor();

// Middleware للتحقق من IP المحظور
async function checkBlockedIP(req, res, next) {
  const isBlocked = await securityMonitor.isBlocked(req.ip);

  if (isBlocked) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_BLOCKED',
        message: 'تم حظر عنوان IP الخاص بك بسبب نشاط مشبوه',
      },
    });
  }

  next();
}

app.use(checkBlockedIP);
```

---

## ⚖️ الامتثال القانوني

### GDPR Compliance (حماية البيانات)

```javascript
// حق الوصول إلى البيانات
async function exportUserData(userId) {
  const employee = await Employee.findById(userId);
  const payroll = await Payroll.find({ employeeId: userId });
  const leaves = await Leave.find({ employeeId: userId });
  const insurance = await Insurance.find({ employeeId: userId });
  const performance = await Performance.find({ employeeId: userId });

  return {
    personal: employee.personal,
    employment: employee.employment,
    payroll: payroll,
    leaves: leaves,
    insurance: insurance,
    performance: performance,
    exportedAt: new Date(),
  };
}

// حق الحذف
async function deleteUserData(userId, reason) {
  // تسجيل في Audit Log
  await AuditLog.create({
    action: 'DELETE',
    resource: { type: 'employee', id: userId },
    details: { reason },
    status: 'success',
  });

  // حذف جميع البيانات المتعلقة
  await Promise.all([
    Employee.findByIdAndDelete(userId),
    Payroll.deleteMany({ employeeId: userId }),
    Leave.deleteMany({ employeeId: userId }),
    Insurance.deleteMany({ employeeId: userId }),
    Performance.deleteMany({ employeeId: userId }),
  ]);

  // الاحتفاظ بسجل الحذف
  await DeletedData.create({
    userId,
    deletedAt: new Date(),
    reason,
  });
}

// حق التصحيح
router.put('/employees/:id/correct', authenticate, authorize('employees:update'), async (req, res) => {
  const { field, oldValue, newValue, reason } = req.body;

  // تسجيل التصحيح
  await AuditLog.create({
    action: 'UPDATE',
    resource: { type: 'employee', id: req.params.id },
    details: {
      before: { [field]: oldValue },
      after: { [field]: newValue },
      reason,
    },
    status: 'success',
  });

  // تطبيق التصحيح
  await Employee.findByIdAndUpdate(req.params.id, {
    [field]: newValue,
  });

  res.json({ success: true });
});
```

### Saudi Labor Law Compliance

```javascript
// التحقق من الامتثال لقانون العمل السعودي
class LaborLawValidator {
  // الحد الأدنى للأجور
  validateMinimumWage(salary, nationality) {
    const minimums = {
      SA: 3000, // سعودي
      other: 1500, // غير سعودي
    };

    const minimum = nationality === 'SA' ? minimums.SA : minimums.other;

    if (salary < minimum) {
      throw new Error(`الراتب أقل من الحد الأدنى (${minimum} ريال)`);
    }
  }

  // ساعات العمل
  validateWorkingHours(hours) {
    if (hours > 48) {
      throw new Error('ساعات العمل تتجاوز 48 ساعة أسبوعياً');
    }
  }

  // العمل الإضافي
  validateOvertime(overtimeHours, workingHours) {
    const maxOvertime = workingHours * 0.25; // 25% من ساعات العمل

    if (overtimeHours > maxOvertime) {
      throw new Error(`ساعات العمل الإضافي تتجاوز الحد الأقصى (${maxOvertime} ساعة)`);
    }
  }

  // الإجازة السنوية
  validateAnnualLeave(years, days) {
    const entitled = years < 5 ? 21 : years < 10 ? 21 : 30;

    if (days > entitled) {
      throw new Error(`الإجازة تتجاوز المستحقة (${entitled} يوم)`);
    }
  }

  // فترة التجربة
  validateProbation(days) {
    if (days > 180) {
      throw new Error('فترة التجربة لا يمكن أن تتجاوز 180 يوم');
    }
  }

  // إشعار الإنهاء
  validateNotice(contractType, noticeDays) {
    const required = contractType === 'permanent' ? 60 : 30;

    if (noticeDays < required) {
      throw new Error(`فترة الإشعار يجب أن تكون ${required} يوم على الأقل`);
    }
  }
}

const laborLawValidator = new LaborLawValidator();
```

---

## ✅ الخلاصة

```
✅ JWT + MFA Authentication
✅ RBAC Authorization
✅ AES-256 Encryption
✅ Input Validation & Sanitization
✅ Rate Limiting
✅ HTTPS + Security Headers
✅ MongoDB Security
✅ Audit Logging
✅ Security Monitoring
✅ GDPR Compliance
✅ Saudi Labor Law Compliance
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ **ENTERPRISE GRADE SECURITY**
