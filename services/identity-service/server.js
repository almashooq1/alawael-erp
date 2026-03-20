'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3360;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

/* ─── MongoDB ─── */
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_identity', {
    maxPoolSize: 15,
  })
  .then(() => console.log('✅ Identity DB connected'));

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/5');

/* ─── Schemas ─── */
const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true },
    username: { type: String, unique: true, sparse: true },
    password: String,
    fullName: { ar: String, en: String },
    avatar: String,
    roles: [{ type: String, default: 'user' }],
    permissions: [String],
    tenantId: { type: mongoose.Schema.Types.ObjectId },
    mfa: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['totp', 'sms', 'email', 'whatsapp'], default: 'totp' },
      secret: String,
      backupCodes: [String],
    },
    sso: {
      provider: String,
      externalId: String,
      profileData: mongoose.Schema.Types.Mixed,
    },
    status: { type: String, enum: ['active', 'suspended', 'pending', 'locked'], default: 'pending' },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date,
    devices: [
      {
        deviceId: String,
        userAgent: String,
        ip: String,
        lastSeen: Date,
        trusted: { type: Boolean, default: false },
      },
    ],
    passwordHistory: [{ hash: String, changedAt: Date }],
    passwordChangedAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ tenantId: 1, roles: 1 });
userSchema.index({ 'sso.provider': 1, 'sso.externalId': 1 });
const User = mongoose.model('User', userSchema);

const apiKeySchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    hashedKey: String,
    name: String,
    service: String,
    permissions: [String],
    rateLimit: { type: Number, default: 1000 },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    lastUsed: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token: { type: String, index: true },
    refreshToken: String,
    deviceId: String,
    ip: String,
    userAgent: String,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Session = mongoose.model('Session', sessionSchema);

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    displayName: { ar: String, en: String },
    description: { ar: String, en: String },
    permissions: [String],
    isSystem: { type: Boolean, default: false },
    tenantId: mongoose.Schema.Types.ObjectId,
    parentRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  },
  { timestamps: true },
);
const Role = mongoose.model('Role', roleSchema);

const auditAuthSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    action: {
      type: String,
      enum: [
        'login',
        'logout',
        'mfa_verify',
        'password_change',
        'role_change',
        'session_revoke',
        'api_key_create',
        'failed_login',
        'account_lock',
        'sso_login',
      ],
    },
    ip: String,
    userAgent: String,
    success: Boolean,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
auditAuthSchema.index({ userId: 1, createdAt: -1 });
const AuthAudit = mongoose.model('AuthAudit', auditAuthSchema);

/* ─── Token Helpers ─── */
const JWT_SECRET = process.env.JWT_SECRET || 'alawael-jwt-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'alawael-refresh-secret-change-me';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.REFRESH_EXPIRY || '7d';

function generateTokens(user) {
  const payload = { sub: user._id, roles: user.roles, tenantId: user.tenantId };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY, jwtid: uuidv4() });
  const refreshToken = jwt.sign({ sub: user._id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY, jwtid: uuidv4() });
  return { accessToken, refreshToken };
}

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  const blacklisted = await redis.get(`token:blacklist:${token}`);
  if (blacklisted) return res.status(401).json({ error: 'Token revoked' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requirePermission(...perms) {
  return async (req, res, next) => {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(401).json({ error: 'User not found' });
    const roles = await Role.find({ name: { $in: user.roles } }).lean();
    const allPerms = new Set([...user.permissions, ...roles.flatMap(r => r.permissions)]);
    if (perms.some(p => allPerms.has(p) || allPerms.has('*'))) return next();
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/* ─── Routes ─── */

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, username, password, fullName, tenantId } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password min 8 chars' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      phone,
      username,
      password: hash,
      fullName,
      tenantId,
      roles: ['user'],
      passwordHistory: [{ hash, changedAt: new Date() }],
    });
    const tokens = generateTokens(user);
    await Session.create({
      userId: user._id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    await AuthAudit.create({ userId: user._id, action: 'login', ip: req.ip, userAgent: req.headers['user-agent'], success: true });
    res.status(201).json({ user: { _id: user._id, email: user.email, roles: user.roles }, ...tokens });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, username, password } = req.body;
    const query = email ? { email } : phone ? { phone } : { username };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.lockUntil && user.lockUntil > new Date()) return res.status(423).json({ error: 'Account locked', lockUntil: user.lockUntil });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60000);
        user.status = 'locked';
      }
      await user.save();
      await AuthAudit.create({ userId: user._id, action: 'failed_login', ip: req.ip, success: false });
      return res.status(401).json({ error: 'Invalid credentials', attemptsLeft: Math.max(0, 5 - user.loginAttempts) });
    }
    if (user.mfa?.enabled) {
      const mfaToken = jwt.sign({ sub: user._id, mfa: true }, JWT_SECRET, { expiresIn: '5m' });
      return res.json({ requiresMFA: true, mfaToken, method: user.mfa.method });
    }
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.status = 'active';
    await user.save();
    const tokens = generateTokens(user);
    await Session.create({
      userId: user._id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    await AuthAudit.create({ userId: user._id, action: 'login', ip: req.ip, userAgent: req.headers['user-agent'], success: true });
    res.json({ user: { _id: user._id, email: user.email, fullName: user.fullName, roles: user.roles }, ...tokens });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// MFA Verify
app.post('/api/auth/mfa/verify', async (req, res) => {
  try {
    const { mfaToken, code } = req.body;
    const decoded = jwt.verify(mfaToken, JWT_SECRET);
    if (!decoded.mfa) return res.status(400).json({ error: 'Invalid MFA token' });
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.mfa.method === 'totp') {
      const valid = speakeasy.totp.verify({ secret: user.mfa.secret, encoding: 'base32', token: code, window: 1 });
      if (!valid) {
        if (user.mfa.backupCodes?.includes(code)) {
          user.mfa.backupCodes = user.mfa.backupCodes.filter(c => c !== code);
          await user.save();
        } else {
          return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }
    }
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.status = 'active';
    await user.save();
    const tokens = generateTokens(user);
    await Session.create({
      userId: user._id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    await AuthAudit.create({ userId: user._id, action: 'mfa_verify', ip: req.ip, success: true });
    res.json({ user: { _id: user._id, email: user.email, roles: user.roles }, ...tokens });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// MFA Setup
app.post('/api/auth/mfa/setup', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const secret = speakeasy.generateSecret({ name: `AlAwael:${user.email || user.phone}`, length: 32 });
    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    user.mfa = { enabled: false, method: req.body.method || 'totp', secret: secret.base32, backupCodes };
    await user.save();
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode: qrUrl, backupCodes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// MFA Enable
app.post('/api/auth/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const valid = speakeasy.totp.verify({ secret: user.mfa.secret, encoding: 'base32', token: req.body.code, window: 1 });
    if (!valid) return res.status(400).json({ error: 'Invalid code' });
    user.mfa.enabled = true;
    await user.save();
    await AuthAudit.create({ userId: user._id, action: 'mfa_verify', ip: req.ip, success: true, metadata: { action: 'enable' } });
    res.json({ message: 'MFA enabled' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Refresh Token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const session = await Session.findOne({ userId: decoded.sub, refreshToken, isActive: true });
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    const user = await User.findById(decoded.sub);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'User inactive' });
    const tokens = generateTokens(user);
    session.token = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 86400000);
    await session.save();
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const token = req.headers.authorization.replace('Bearer ', '');
  await redis.set(`token:blacklist:${token}`, '1', 'EX', 86400);
  await Session.updateMany({ userId: req.user.sub, token }, { isActive: false });
  await AuthAudit.create({ userId: req.user.sub, action: 'logout', ip: req.ip, success: true });
  res.json({ message: 'Logged out' });
});

// Logout all sessions
app.post('/api/auth/logout-all', authMiddleware, async (req, res) => {
  const sessions = await Session.find({ userId: req.user.sub, isActive: true });
  for (const s of sessions) {
    await redis.set(`token:blacklist:${s.token}`, '1', 'EX', 86400);
  }
  await Session.updateMany({ userId: req.user.sub }, { isActive: false });
  await AuthAudit.create({
    userId: req.user.sub,
    action: 'session_revoke',
    ip: req.ip,
    success: true,
    metadata: { count: sessions.length },
  });
  res.json({ message: `Revoked ${sessions.length} sessions` });
});

// Change password
app.post('/api/auth/password/change', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.sub);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    for (const prev of (user.passwordHistory || []).slice(-5)) {
      if (await bcrypt.compare(newPassword, prev.hash)) return res.status(400).json({ error: 'Cannot reuse recent passwords' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    user.password = hash;
    user.passwordChangedAt = new Date();
    user.passwordHistory.push({ hash, changedAt: new Date() });
    await user.save();
    await AuthAudit.create({ userId: user._id, action: 'password_change', ip: req.ip, success: true });
    res.json({ message: 'Password changed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── RBAC Routes ───
app.get('/api/roles', authMiddleware, async (req, res) => {
  const roles = await Role.find(req.user.tenantId ? { $or: [{ tenantId: req.user.tenantId }, { isSystem: true }] } : {});
  res.json(roles);
});

app.post('/api/roles', authMiddleware, requirePermission('roles:create'), async (req, res) => {
  try {
    const role = await Role.create({ ...req.body, tenantId: req.user.tenantId });
    res.status(201).json(role);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/roles/:id', authMiddleware, requirePermission('roles:update'), async (req, res) => {
  const role = await Role.findOneAndUpdate({ _id: req.params.id, isSystem: false }, req.body, { new: true });
  if (!role) return res.status(404).json({ error: 'Role not found or system role' });
  res.json(role);
});

app.post('/api/users/:id/roles', authMiddleware, requirePermission('users:manage-roles'), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { roles: req.body.roles }, { new: true }).select('-password -mfa.secret');
  if (!user) return res.status(404).json({ error: 'User not found' });
  await AuthAudit.create({
    userId: req.params.id,
    action: 'role_change',
    ip: req.ip,
    success: true,
    metadata: { roles: req.body.roles, by: req.user.sub },
  });
  res.json(user);
});

// ─── API Key Management ───
app.post('/api/keys', authMiddleware, requirePermission('api-keys:create'), async (req, res) => {
  const rawKey = `ak_${uuidv4().replace(/-/g, '')}`;
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  const apiKey = await ApiKey.create({ ...req.body, key: rawKey.slice(0, 8) + '...', hashedKey, createdBy: req.user.sub });
  await AuthAudit.create({ userId: req.user.sub, action: 'api_key_create', ip: req.ip, success: true, metadata: { keyId: apiKey._id } });
  res.status(201).json({ ...apiKey.toObject(), rawKey });
});

app.get('/api/keys', authMiddleware, requirePermission('api-keys:read'), async (req, res) => {
  const keys = await ApiKey.find({ createdBy: req.user.sub }).select('-hashedKey');
  res.json(keys);
});

app.delete('/api/keys/:id', authMiddleware, requirePermission('api-keys:delete'), async (req, res) => {
  await ApiKey.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'API key revoked' });
});

// ─── Token Validation (for other microservices) ───
app.post('/api/auth/validate', async (req, res) => {
  try {
    const { token } = req.body;
    const blacklisted = await redis.get(`token:blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ valid: false });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.sub).select('roles permissions status tenantId fullName').lean();
    if (!user || user.status !== 'active') return res.status(401).json({ valid: false });
    const roles = await Role.find({ name: { $in: user.roles } }).lean();
    const allPermissions = [...new Set([...user.permissions, ...roles.flatMap(r => r.permissions)])];
    res.json({ valid: true, user: { ...decoded, fullName: user.fullName, permissions: allPermissions, tenantId: user.tenantId } });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// ─── User Management ───
app.get('/api/users', authMiddleware, requirePermission('users:read'), async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query;
  const filter = {};
  if (role) filter.roles = role;
  if (status) filter.status = status;
  if (req.user.tenantId) filter.tenantId = req.user.tenantId;
  if (search)
    filter.$or = [
      { 'fullName.ar': new RegExp(search, 'i') },
      { 'fullName.en': new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -mfa.secret -passwordHistory')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page: +page, pages: Math.ceil(total / limit) });
});

app.get('/api/users/:id', authMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -mfa.secret -passwordHistory');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.put('/api/users/:id/status', authMiddleware, requirePermission('users:manage'), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select('-password');
  res.json(user);
});

// ─── Auth Audit Log ───
app.get('/api/auth/audit', authMiddleware, requirePermission('audit:read'), async (req, res) => {
  const { userId, action, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  const [logs, total] = await Promise.all([
    AuthAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit),
    AuthAudit.countDocuments(filter),
  ]);
  res.json({ logs, total, page: +page });
});

// ─── Sessions ───
app.get('/api/sessions', authMiddleware, async (req, res) => {
  const sessions = await Session.find({ userId: req.user.sub, isActive: true }).sort({ createdAt: -1 });
  res.json(sessions);
});

app.delete('/api/sessions/:id', authMiddleware, async (req, res) => {
  const session = await Session.findOneAndUpdate({ _id: req.params.id, userId: req.user.sub }, { isActive: false });
  if (session) await redis.set(`token:blacklist:${session.token}`, '1', 'EX', 86400);
  res.json({ message: 'Session revoked' });
});

// ─── Stats ───
app.get('/api/identity/stats', authMiddleware, requirePermission('admin:stats'), async (req, res) => {
  const [totalUsers, activeUsers, lockedUsers, activeSessions, mfaEnabled, recentLogins] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'locked' }),
    Session.countDocuments({ isActive: true }),
    User.countDocuments({ 'mfa.enabled': true }),
    AuthAudit.countDocuments({ action: 'login', success: true, createdAt: { $gte: new Date(Date.now() - 86400000) } }),
  ]);
  res.json({ totalUsers, activeUsers, lockedUsers, activeSessions, mfaEnabled, recentLogins });
});

// Seed default roles
async function seedRoles() {
  const defaults = [
    { name: 'admin', displayName: { ar: 'مدير النظام', en: 'System Admin' }, permissions: ['*'], isSystem: true },
    {
      name: 'manager',
      displayName: { ar: 'مدير', en: 'Manager' },
      permissions: ['users:read', 'users:manage', 'roles:read', 'reports:read'],
      isSystem: true,
    },
    {
      name: 'teacher',
      displayName: { ar: 'معلم', en: 'Teacher' },
      permissions: ['students:read', 'attendance:manage', 'grades:manage'],
      isSystem: true,
    },
    {
      name: 'therapist',
      displayName: { ar: 'معالج', en: 'Therapist' },
      permissions: ['patients:read', 'sessions:manage', 'reports:create'],
      isSystem: true,
    },
    {
      name: 'parent',
      displayName: { ar: 'ولي أمر', en: 'Parent' },
      permissions: ['children:read', 'payments:create', 'messages:create'],
      isSystem: true,
    },
    { name: 'user', displayName: { ar: 'مستخدم', en: 'User' }, permissions: ['profile:read', 'profile:update'], isSystem: true },
  ];
  for (const r of defaults) {
    await Role.updateOne({ name: r.name }, { $setOnInsert: r }, { upsert: true });
  }
  console.log('✅ Default roles seeded');
}

app.get('/health', (_, res) =>
  res.json({
    status: 'healthy',
    service: 'identity-service',
    uptime: process.uptime(),
  }),
);

app.listen(PORT, async () => {
  await seedRoles();
  console.log(`🔐 Identity Service running on port ${PORT}`);
});
