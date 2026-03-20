'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { v4: uuid } = require('uuid');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3610;

/* ═══════════════════════════════════════════════════════════════ */
/*  Configuration                                                 */
/* ═══════════════════════════════════════════════════════════════ */
const JWT_SECRET = process.env.JWT_SECRET || 'alawael-jwt-secret-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'alawael-refresh-secret-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

/* ═══════════════════════════════════════════════════════════════ */
/*  Middleware                                                    */
/* ═══════════════════════════════════════════════════════════════ */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'محاولات تسجيل دخول كثيرة. انتظر 15 دقيقة' },
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Redis                                                         */
/* ═══════════════════════════════════════════════════════════════ */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000), lazyConnect: true });
redis.connect().catch(() => console.warn('⚠️ Redis unavailable'));

/* ═══════════════════════════════════════════════════════════════ */
/*  MongoDB Schemas                                               */
/* ═══════════════════════════════════════════════════════════════ */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_auth';

// ── User Schema ──
const userSchema = new mongoose.Schema(
  {
    userId: { type: String, default: uuid, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    nameAr: { type: String, required: true },
    nameEn: String,
    phone: String,
    role: {
      type: String,
      enum: [
        'super-admin',
        'admin',
        'principal',
        'teacher',
        'staff',
        'parent',
        'student',
        'accountant',
        'nurse',
        'driver',
        'kitchen',
        'security',
      ],
      default: 'staff',
    },
    permissions: [String],
    tenantId: String,
    branchId: String,
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    lockUntil: Date,
    loginAttempts: { type: Number, default: 0 },
    lastLogin: Date,
    lastPasswordChange: Date,
    passwordHistory: [String], // Last 5 hashed passwords
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    refreshTokens: [{ token: String, device: String, ip: String, createdAt: Date }],
    mustChangePassword: { type: Boolean, default: false },
    avatar: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Password policy checks
  const pwd = this.password;
  if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/\d/.test(pwd) || !/[!@#$%^&*]/.test(pwd)) {
    return next(new Error('كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل مع حرف كبير وصغير ورقم ورمز خاص'));
  }
  const hash = await bcrypt.hash(pwd, BCRYPT_ROUNDS);
  // Check password reuse (last 5)
  if (this.passwordHistory?.length) {
    for (const old of this.passwordHistory.slice(-5)) {
      if (await bcrypt.compare(pwd, old)) return next(new Error('لا يمكن إعادة استخدام كلمة مرور سابقة'));
    }
  }
  this.passwordHistory = [...(this.passwordHistory || []).slice(-4), hash];
  this.password = hash;
  this.lastPasswordChange = new Date();
  next();
});

const User = mongoose.model('User', userSchema);

// ── Audit Log Schema ──
const auditSchema = new mongoose.Schema(
  {
    logId: { type: String, default: uuid },
    userId: String,
    username: String,
    action: { type: String, required: true, index: true },
    resource: String,
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    status: { type: String, enum: ['success', 'failure', 'blocked'], default: 'success' },
    tenantId: String,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

const AuditLog = mongoose.model('AuditLog', auditSchema);

// ── Session Schema ──
const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: uuid, unique: true },
    userId: { type: String, required: true, index: true },
    refreshToken: String,
    device: String,
    ip: String,
    userAgent: String,
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Session = mongoose.model('Session', sessionSchema);

// ── Role/Permission Schema ──
const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    nameAr: { type: String, required: true },
    permissions: [String],
    description: String,
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Role = mongoose.model('Role', roleSchema);

/* ═══════════════════════════════════════════════════════════════ */
/*  Helpers                                                       */
/* ═══════════════════════════════════════════════════════════════ */
async function logAudit(data) {
  try {
    await AuditLog.create(data);
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

function generateTokens(user) {
  const payload = {
    sub: user.userId,
    userId: user.userId,
    username: user.username,
    role: user.role,
    tenantId: user.tenantId,
    name: user.nameAr,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: user.userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
  return { accessToken, refreshToken };
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'توكن غير صالح' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لهذا الإجراء', code: 'FORBIDDEN' });
    }
    next();
  };
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Auth Endpoints                                                */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'security-auth-service', uptime: process.uptime() }));

// ── Register ──
app.post(
  '/api/auth/register',
  [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('nameAr').notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { username, email, password, nameAr, nameEn, phone, role, tenantId, branchId } = req.body;
      const exists = await User.findOne({ $or: [{ username }, { email }] });
      if (exists) return res.status(409).json({ error: 'اسم المستخدم أو البريد مستخدم مسبقاً' });

      const user = await User.create({ username, email, password, nameAr, nameEn, phone, role: role || 'staff', tenantId, branchId });
      await logAudit({ userId: user.userId, username, action: 'REGISTER', resource: 'user', status: 'success', ip: req.ip });

      const tokens = generateTokens(user);
      res
        .status(201)
        .json({ message: 'تم إنشاء الحساب بنجاح', user: { userId: user.userId, username, nameAr, role: user.role }, ...tokens });
    } catch (err) {
      if (err.message.includes('كلمة المرور')) return res.status(400).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  },
);

// ── Login ──
app.post('/api/auth/login', loginLimiter, [body('username').notEmpty().trim(), body('password').notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password, twoFactorCode } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      await logAudit({ username, action: 'LOGIN', status: 'failure', details: { reason: 'user not found' }, ip: req.ip });
      return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة' });
    }

    // Check lockout
    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - new Date()) / 60000);
      await logAudit({
        userId: user.userId,
        username,
        action: 'LOGIN',
        status: 'blocked',
        details: { reason: 'account locked' },
        ip: req.ip,
      });
      return res.status(423).json({ error: `الحساب مقفل. حاول بعد ${mins} دقيقة` });
    }

    if (!user.isActive) return res.status(403).json({ error: 'الحساب معطل' });

    const validPwd = await bcrypt.compare(password, user.password);
    if (!validPwd) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
      }
      await user.save();
      await logAudit({
        userId: user.userId,
        username,
        action: 'LOGIN',
        status: 'failure',
        details: { attempts: user.loginAttempts },
        ip: req.ip,
      });
      return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة', attemptsLeft: MAX_LOGIN_ATTEMPTS - user.loginAttempts });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) return res.status(200).json({ requires2FA: true, message: 'أدخل رمز المصادقة الثنائية' });
      const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: twoFactorCode, window: 2 });
      if (!verified) return res.status(401).json({ error: 'رمز المصادقة الثنائية غير صحيح' });
    }

    // Reset attempts & generate tokens
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    user.lastLogin = new Date();
    const tokens = generateTokens(user);

    // Store session
    const session = await Session.create({
      userId: user.userId,
      refreshToken: tokens.refreshToken,
      device: req.headers['user-agent'],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.refreshTokens.push({ token: tokens.refreshToken, device: req.headers['user-agent'], ip: req.ip, createdAt: new Date() });
    if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
    await user.save();

    // Cache in Redis
    if (redis.status === 'ready') {
      await redis.setex(
        `user:${user.userId}`,
        3600,
        JSON.stringify({ userId: user.userId, username: user.username, role: user.role, tenantId: user.tenantId }),
      );
    }

    await logAudit({ userId: user.userId, username, action: 'LOGIN', status: 'success', ip: req.ip });

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      user: { userId: user.userId, username: user.username, nameAr: user.nameAr, role: user.role, tenantId: user.tenantId },
      ...tokens,
      sessionId: session.sessionId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Refresh Token ──
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'التوكن مطلوب' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const session = await Session.findOne({ userId: decoded.sub, refreshToken, isActive: true });
    if (!session) return res.status(401).json({ error: 'جلسة غير صالحة' });

    const user = await User.findOne({ userId: decoded.sub, isActive: true });
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });

    // Rotate tokens
    const tokens = generateTokens(user);
    session.refreshToken = tokens.refreshToken;
    session.lastActivity = new Date();
    await session.save();

    res.json({ ...tokens });
  } catch {
    res.status(401).json({ error: 'التوكن منتهي أو غير صالح' });
  }
});

// ── Logout ──
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization.replace('Bearer ', '');
    // Blacklist access token
    if (redis.status === 'ready') {
      const ttl = jwt.decode(token)?.exp ? jwt.decode(token).exp - Math.floor(Date.now() / 1000) : 3600;
      await redis.setex(`bl:${token}`, ttl > 0 ? ttl : 3600, '1');
      await redis.del(`user:${req.user.sub}`);
    }
    await Session.updateMany({ userId: req.user.sub }, { isActive: false });
    await logAudit({ userId: req.user.sub, action: 'LOGOUT', status: 'success', ip: req.ip });
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  2FA Endpoints                                                 */
/* ═══════════════════════════════════════════════════════════════ */
app.post('/api/auth/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `AlAwael (${req.user.username})`, length: 20 });
    const qr = await QRCode.toDataURL(secret.otpauth_url);
    // Store temp secret until verified
    if (redis.status === 'ready') await redis.setex(`2fa-setup:${req.user.sub}`, 600, secret.base32);
    res.json({ secret: secret.base32, qrCode: qr, message: 'امسح رمز QR ثم أدخل الرمز للتأكيد' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    let secret;
    if (redis.status === 'ready') secret = await redis.get(`2fa-setup:${req.user.sub}`);
    if (!secret) return res.status(400).json({ error: 'أعد إعداد المصادقة الثنائية' });

    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
    if (!verified) return res.status(400).json({ error: 'الرمز غير صحيح' });

    await User.updateOne({ userId: req.user.sub }, { twoFactorEnabled: true, twoFactorSecret: secret });
    if (redis.status === 'ready') await redis.del(`2fa-setup:${req.user.sub}`);
    await logAudit({ userId: req.user.sub, action: '2FA_ENABLED', status: 'success', ip: req.ip });
    res.json({ message: 'تم تفعيل المصادقة الثنائية بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/disable', authMiddleware, async (req, res) => {
  try {
    await User.updateOne({ userId: req.user.sub }, { twoFactorEnabled: false, twoFactorSecret: null });
    await logAudit({ userId: req.user.sub, action: '2FA_DISABLED', status: 'success', ip: req.ip });
    res.json({ message: 'تم إلغاء المصادقة الثنائية' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  User Management (admin)                                       */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/api/auth/users', authMiddleware, requireRole('super-admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, role, isActive, search, tenantId } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (tenantId) filter.tenantId = tenantId;
    if (search)
      filter.$or = [
        { nameAr: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];

    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-password -passwordHistory -twoFactorSecret -refreshTokens')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      User.countDocuments(filter),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/users/:userId', authMiddleware, requireRole('super-admin', 'admin'), async (req, res) => {
  try {
    const allowed = ['nameAr', 'nameEn', 'phone', 'role', 'isActive', 'permissions', 'tenantId', 'branchId'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const user = await User.findOneAndUpdate({ userId: req.params.userId }, update, { new: true }).select(
      '-password -passwordHistory -twoFactorSecret -refreshTokens',
    );
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    await logAudit({
      userId: req.user.sub,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: req.params.userId,
      details: update,
      ip: req.ip,
    });
    res.json({ message: 'تم تحديث المستخدم', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/users/:userId/reset-password', authMiddleware, requireRole('super-admin', 'admin'), async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const tempPwd = `Alawael@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 100)}`;
    user.password = tempPwd;
    user.mustChangePassword = true;
    user.loginAttempts = 0;
    user.isLocked = false;
    await user.save();
    await logAudit({ userId: req.user.sub, action: 'RESET_PASSWORD', resource: 'user', resourceId: req.params.userId, ip: req.ip });
    res.json({ message: 'تم إعادة تعيين كلمة المرور', temporaryPassword: tempPwd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ userId: req.user.sub });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    await logAudit({ userId: req.user.sub, action: 'CHANGE_PASSWORD', status: 'success', ip: req.ip });
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    if (err.message.includes('كلمة المرور')) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Role Management                                               */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/api/auth/roles', authMiddleware, async (_req, res) => {
  try {
    const roles = await Role.find({ isActive: true });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/roles', authMiddleware, requireRole('super-admin'), async (req, res) => {
  try {
    const role = await Role.create(req.body);
    await logAudit({ userId: req.user.sub, action: 'CREATE_ROLE', resource: 'role', resourceId: role.name, ip: req.ip });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Audit Logs                                                    */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/api/auth/audit-logs', authMiddleware, requireRole('super-admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, status, from, to } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Token Verification (for other services)                       */
/* ═══════════════════════════════════════════════════════════════ */
app.post('/api/auth/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false });
    if (redis.status === 'ready') {
      const bl = await redis.get(`bl:${token}`);
      if (bl) return res.json({ valid: false, reason: 'blacklisted' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.json({ valid: false });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Dashboard                                                     */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/api/auth/dashboard', authMiddleware, requireRole('super-admin', 'admin'), async (_req, res) => {
  try {
    const cacheKey = 'auth:dashboard';
    if (redis.status === 'ready') {
      const c = await redis.get(cacheKey);
      if (c) return res.json(JSON.parse(c));
    }

    const [totalUsers, activeUsers, lockedUsers, roleCounts, todayLogins, recentAudit] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isLocked: true }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      AuditLog.countDocuments({ action: 'LOGIN', status: 'success', timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      AuditLog.find().sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    const dashboard = { totalUsers, activeUsers, lockedUsers, roleCounts, todayLogins, recentAudit, timestamp: new Date() };
    if (redis.status === 'ready') await redis.setex(cacheKey, 300, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Cron: Cleanup                                                 */
/* ═══════════════════════════════════════════════════════════════ */
cron.schedule('0 2 * * *', async () => {
  try {
    await Session.deleteMany({ expiresAt: { $lt: new Date() } });
    await User.updateMany({ isLocked: true, lockUntil: { $lt: new Date() } }, { isLocked: false, lockUntil: null, loginAttempts: 0 });
    console.log('🧹 Session & lockout cleanup done');
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }
});

// Cleanup old audit logs (90 days)
cron.schedule('0 3 1 * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { deletedCount } = await AuditLog.deleteMany({ timestamp: { $lt: cutoff } });
    console.log(`🧹 Cleaned ${deletedCount} old audit logs`);
  } catch (e) {
    console.error('Audit cleanup error:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Seed Default Admin                                            */
/* ═══════════════════════════════════════════════════════════════ */
async function seedAdmin() {
  const exists = await User.findOne({ role: 'super-admin' });
  if (!exists) {
    await User.create({
      username: 'admin',
      email: 'admin@alawael.sa',
      password: 'Alawael@2026!',
      nameAr: 'مدير النظام',
      role: 'super-admin',
    });
    console.log('👤 Default admin created (admin / Alawael@2026!)');
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Default Roles Seed                                            */
/* ═══════════════════════════════════════════════════════════════ */
async function seedRoles() {
  const defaultRoles = [
    { name: 'super-admin', nameAr: 'مدير عام', permissions: ['*'], isSystem: true },
    { name: 'admin', nameAr: 'مدير', permissions: ['users:*', 'roles:*', 'audit:read', 'reports:*'], isSystem: true },
    { name: 'principal', nameAr: 'مدير المركز', permissions: ['students:*', 'staff:*', 'reports:read', 'attendance:*'], isSystem: true },
    {
      name: 'teacher',
      nameAr: 'معلم/ة',
      permissions: ['students:read', 'attendance:write', 'grades:write', 'reports:read'],
      isSystem: true,
    },
    { name: 'staff', nameAr: 'موظف', permissions: ['students:read', 'attendance:read'], isSystem: true },
    { name: 'parent', nameAr: 'ولي أمر', permissions: ['children:read', 'fees:read', 'reports:read'], isSystem: true },
    { name: 'accountant', nameAr: 'محاسب', permissions: ['fees:*', 'finance:*', 'reports:read'], isSystem: true },
    { name: 'nurse', nameAr: 'ممرض/ة', permissions: ['health:*', 'students:read'], isSystem: true },
  ];
  for (const r of defaultRoles) {
    await Role.updateOne({ name: r.name }, r, { upsert: true });
  }
  console.log('🔐 Default roles seeded');
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Start                                                         */
/* ═══════════════════════════════════════════════════════════════ */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_auth');
    await seedAdmin();
    await seedRoles();
    app.listen(PORT, () => console.log(`🔒 Security Auth Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });
