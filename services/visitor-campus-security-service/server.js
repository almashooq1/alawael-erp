'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════
   Schemas
   ═══════════════════════════════════════════════════════════════ */

const visitorSchema = new mongoose.Schema(
  {
    visitorNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    idType: { type: String, enum: ['national-id', 'iqama', 'passport', 'driver-license'], default: 'national-id' },
    idNumber: { type: String, required: true },
    phone: String,
    email: String,
    company: String,
    photo: String,
    type: {
      type: String,
      enum: ['parent', 'vendor', 'official', 'contractor', 'guest', 'inspector', 'delivery', 'other'],
      default: 'guest',
    },
    blacklisted: { type: Boolean, default: false },
    blacklistReason: String,
    totalVisits: { type: Number, default: 0 },
    lastVisit: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

visitorSchema.pre('save', async function (next) {
  if (!this.visitorNo) {
    const count = await this.constructor.countDocuments();
    this.visitorNo = `VIS-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const visitLogSchema = new mongoose.Schema(
  {
    logNo: { type: String, unique: true },
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true },
    purpose: {
      type: String,
      enum: ['meeting', 'pickup-student', 'delivery', 'maintenance', 'inspection', 'event', 'interview', 'other'],
      required: true,
    },
    hostId: String,
    hostName: String,
    hostDept: String,
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: Date,
    expectedDuration: Number,
    gate: { type: String, default: 'main' },
    badge: { number: String, issued: Boolean, returned: Boolean },
    vehicle: { plateNo: String, type: String, color: String, parked: Boolean },
    accompaniedBy: [{ name: String, idNumber: String }],
    itemsCarried: [{ description: String, serialNo: String }],
    areasAccessed: [String],
    qrCode: String,
    status: { type: String, enum: ['pre-registered', 'checked-in', 'checked-out', 'cancelled', 'denied'], default: 'pre-registered' },
    securityNotes: String,
    approvedBy: { userId: String, name: String },
    checkedInBy: { userId: String, name: String },
    checkedOutBy: { userId: String, name: String },
  },
  { timestamps: true },
);

visitLogSchema.pre('save', async function (next) {
  if (!this.logNo) {
    const count = await this.constructor.countDocuments();
    this.logNo = `VL-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const accessPointSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: { type: String, enum: ['main-gate', 'side-gate', 'building-entrance', 'parking', 'emergency-exit'], default: 'main-gate' },
    location: String,
    device: { brand: String, model: String, ip: String, serialNo: String },
    direction: { type: String, enum: ['entry', 'exit', 'both'], default: 'both' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const securityAlertSchema = new mongoose.Schema(
  {
    alertNo: { type: String, unique: true },
    type: {
      type: String,
      enum: ['unauthorized-access', 'blacklisted-visitor', 'overstay', 'restricted-area', 'emergency', 'suspicious-activity', 'tailgating'],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    location: String,
    description: String,
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
    visitLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitLog' },
    respondedBy: { userId: String, name: String },
    responseTime: Date,
    actionTaken: String,
    status: { type: String, enum: ['active', 'acknowledged', 'resolved', 'false-alarm'], default: 'active' },
  },
  { timestamps: true },
);

securityAlertSchema.pre('save', async function (next) {
  if (!this.alertNo) {
    const count = await this.constructor.countDocuments();
    this.alertNo = `SA-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const VisitLog = mongoose.model('VisitLog', visitLogSchema);
const AccessPoint = mongoose.model('AccessPoint', accessPointSchema);
const SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);

/* ═══════════════════════════════════════════════════════════════ */
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_security';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3480;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const securityQueue = new Queue('security-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'visitor-campus-security-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// Visitors
app.post('/api/visitors', async (req, res) => {
  try {
    res.status(201).json(await Visitor.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/visitors', async (req, res) => {
  const { search, type, blacklisted, page = 1, limit = 50 } = req.query;
  const q = {};
  if (search) q.$or = [{ nameAr: new RegExp(search, 'i') }, { nameEn: new RegExp(search, 'i') }, { idNumber: search }, { phone: search }];
  if (type) q.type = type;
  if (blacklisted !== undefined) q.blacklisted = blacklisted === 'true';
  const [data, total] = await Promise.all([
    Visitor.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    Visitor.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/visitors/:id', async (req, res) => {
  res.json(await Visitor.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Visit Logs
app.post('/api/visit-logs', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.body.visitorId);
    if (visitor?.blacklisted) {
      await SecurityAlert.create({
        type: 'blacklisted-visitor',
        severity: 'high',
        visitorId: visitor._id,
        description: `Blacklisted visitor attempted entry: ${visitor.nameAr}`,
      });
      return res.status(403).json({ error: 'الزائر مدرج في القائمة السوداء' });
    }
    const log = await VisitLog.create(req.body);
    res.status(201).json(log);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/visit-logs', async (req, res) => {
  const { visitorId, status, date, from, to, page = 1, limit = 50 } = req.query;
  const q = {};
  if (visitorId) q.visitorId = visitorId;
  if (status) q.status = status;
  if (date) {
    const d = new Date(date);
    const n = new Date(d);
    n.setDate(n.getDate() + 1);
    q.checkInTime = { $gte: d, $lt: n };
  }
  if (from || to) {
    q.checkInTime = {};
    if (from) q.checkInTime.$gte = new Date(from);
    if (to) q.checkInTime.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    VisitLog.find(q)
      .populate('visitorId', 'nameAr idNumber type')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ checkInTime: -1 }),
    VisitLog.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/visit-logs/:id/checkin', async (req, res) => {
  const log = await VisitLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: 'السجل غير موجود' });
  log.status = 'checked-in';
  log.checkInTime = new Date();
  log.checkedInBy = req.body.checkedInBy;
  if (req.body.badge) log.badge = { ...log.badge, ...req.body.badge, issued: true };
  await log.save();
  await Visitor.findByIdAndUpdate(log.visitorId, { $inc: { totalVisits: 1 }, lastVisit: new Date() });
  res.json(log);
});
app.put('/api/visit-logs/:id/checkout', async (req, res) => {
  const log = await VisitLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: 'السجل غير موجود' });
  log.status = 'checked-out';
  log.checkOutTime = new Date();
  log.checkedOutBy = req.body.checkedOutBy;
  if (req.body.badgeReturned) log.badge.returned = true;
  await log.save();
  res.json(log);
});

// Access Points
app.post('/api/access-points', async (req, res) => {
  try {
    res.status(201).json(await AccessPoint.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/access-points', async (_req, res) => {
  res.json(await AccessPoint.find().sort({ code: 1 }));
});

// Security Alerts
app.get('/api/security-alerts', async (req, res) => {
  const { status, severity, type } = req.query;
  const q = {};
  if (status) q.status = status;
  if (severity) q.severity = severity;
  if (type) q.type = type;
  res.json(await SecurityAlert.find(q).populate('visitorId', 'nameAr idNumber').sort({ createdAt: -1 }));
});
app.put('/api/security-alerts/:id', async (req, res) => {
  res.json(await SecurityAlert.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Dashboard
app.get('/api/security/dashboard', async (_req, res) => {
  const cacheKey = 'security:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [currentVisitors, todayVisits, activeAlerts, totalVisitors] = await Promise.all([
    VisitLog.countDocuments({ status: 'checked-in' }),
    VisitLog.countDocuments({ checkInTime: { $gte: today } }),
    SecurityAlert.countDocuments({ status: 'active' }),
    Visitor.countDocuments({ isActive: true }),
  ]);
  const result = { currentVisitors, todayVisits, activeAlerts, totalVisitors };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
  res.json(result);
});

// Cron: Overstay check every 30 min
cron.schedule('*/30 * * * *', async () => {
  try {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - 4);
    const overstays = await VisitLog.find({ status: 'checked-in', checkInTime: { $lt: threshold } }).populate('visitorId', 'nameAr');
    for (const v of overstays) {
      const exists = await SecurityAlert.findOne({ visitLogId: v._id, type: 'overstay', status: 'active' });
      if (!exists) {
        await SecurityAlert.create({
          type: 'overstay',
          severity: 'medium',
          visitLogId: v._id,
          visitorId: v.visitorId?._id,
          description: `Visitor ${v.visitorId?.nameAr || 'unknown'} overstay > 4h`,
        });
      }
    }
  } catch (e) {
    console.error('[CRON] Overstay check error:', e.message);
  }
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — visitor-campus-security');
    app.listen(PORT, () => console.log(`🔒 Visitor-Campus-Security Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
